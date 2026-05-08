"""
Custom Web Search component for Langflow.
Returns search results as text — designed to be fed into a Prompt component,
NOT as an Agent tool (Mistral AWQ ignores tool outputs).

Searches DuckDuckGo HTML: no API key, no JS, no rate limits.
Dual search: EN (with year for fresh results) + user language.
"""

from langflow.custom import Component
from langflow.io import IntInput, StrInput, Output, MessageTextInput
from langflow.schema.message import Message

import httpx
from urllib.parse import quote_plus, unquote
from datetime import datetime
import re
import logging

logger = logging.getLogger(__name__)


def _ddg_search(query: str, num_results: int = 5, region: str = "wt-wt") -> list[dict]:
    """Search DuckDuckGo HTML version."""
    url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}&kl={region}&df=y"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/125.0.0.0 Safari/537.36"
        ),
    }
    results = []

    try:
        with httpx.Client(timeout=15, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            html = resp.text

        raw_links = re.findall(
            r'class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)</a>',
            html, re.DOTALL,
        )
        raw_snippets = re.findall(
            r'class="result__snippet"[^>]*>(.*?)</(?:a|td|div|span)',
            html, re.DOTALL,
        )

        for i, (raw_url, raw_title) in enumerate(raw_links[:num_results]):
            match = re.search(r'uddg=([^&]+)', raw_url)
            clean_url = unquote(match.group(1)) if match else raw_url
            title = re.sub(r'<[^>]+>', '', raw_title).strip()
            snippet = ""
            if i < len(raw_snippets):
                snippet = re.sub(r'<[^>]+>', '', raw_snippets[i]).strip()
                for old, new in [("&#x27;", "'"), ("&amp;", "&"), ("&quot;", '"'),
                                 ("&lt;", "<"), ("&gt;", ">"), ("&#39;", "'")]:
                    snippet = snippet.replace(old, new)

            if clean_url and 'duckduckgo.com' not in clean_url:
                results.append({
                    "url": clean_url,
                    "title": title,
                    "snippet": snippet,
                })

    except Exception as e:
        logger.error("Search failed: %s", e)

    return results


def _merge_results(a: list[dict], b: list[dict], max_total: int) -> list[dict]:
    seen = set()
    merged = []
    for r in a + b:
        domain = re.findall(r'https?://([^/]+)', r['url'])
        key = domain[0] if domain else r['url']
        if key not in seen:
            seen.add(key)
            merged.append(r)
        if len(merged) >= max_total:
            break
    return merged


class GoogleSearchComponent(Component):
    display_name = "Google Search"
    description = "Wyszukuje w internecie (EN+PL). Podłącz wyjście do Prompt component."
    icon = "search"
    name = "GoogleSearch"

    inputs = [
        MessageTextInput(
            name="query",
            display_name="Zapytanie",
            info="Tekst do wyszukania.",
        ),
        IntInput(
            name="num_results",
            display_name="Liczba wyników",
            value=5,
            advanced=True,
        ),
        StrInput(
            name="language",
            display_name="Język",
            value="pl",
            advanced=True,
        ),
    ]

    outputs = [
        Output(name="results", display_name="Wyniki", method="search"),
    ]

    def search(self) -> Message:
        query = self.query.strip() if isinstance(self.query, str) else self.query.text.strip()
        year = str(datetime.now().year)
        num = self.num_results
        lang = self.language

        query_en = f"{query} {year}" if year not in query else query
        results_en = _ddg_search(query_en, num_results=num, region="us-en")
        results_local = _ddg_search(query, num_results=num, region=f"{lang}-{lang}")
        results = _merge_results(results_en, results_local, max_total=num)

        today = datetime.now().strftime("%d.%m.%Y, %A")

        if not results:
            return Message(text=f"Data: {today}\n\nBrak wyników wyszukiwania.")

        parts = []
        for r in results:
            snippet = r.get("snippet", "").strip()
            if snippet:
                parts.append(f"- {snippet} (Źródło: {r['title']}, {r['url']})")

        header = f"Data: {today}\n\n"
        return Message(text=header + "\n\n".join(parts))
