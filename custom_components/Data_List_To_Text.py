from langflow.custom import Component
from langflow.schema import Data, Message
from langflow.io import DataInput, StrInput, Output


class DataListToText(Component):
    display_name = "Data List to Text"
    description = "Converts a list of Data objects (e.g. from Chroma DB) to a single text for use in Prompt Template."
    icon = "file-text"

    inputs = [
        DataInput(
            name="data_list",
            display_name="Data List",
            is_list=True,
        ),
        StrInput(
            name="separator",
            display_name="Separator",
            value="\n\n---\n\n",
        ),
    ]

    outputs = [
        Output(
            name="text",
            display_name="Text",
            method="build_text",
        ),
    ]

    def _extract_filename(self, source: str) -> str:
        """Extract just the filename from a full path or URL."""
        if not source:
            return ""
        import os
        import re
        # Handle file:/// URLs
        if source.startswith("file:///"):
            source = source[8:]
        # Get just the filename
        name = os.path.basename(source)
        # Remove timestamp prefix (e.g. "2026-04-02_12-07-38_")
        name = re.sub(r"^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_", "", name)
        # Change .txt back to .pdf (backend converts to .txt for ingest)
        if name.endswith(".txt"):
            name = name[:-4] + ".pdf"
        return name

    def build_text(self) -> Message:
        parts = []
        for item in self.data_list or []:
            # Debug: log what we receive
            if isinstance(item, Data):
                print(f"[DataListToText] keys={list((item.data or {}).keys())}")
            if isinstance(item, Data):
                text = item.text or (item.data.get("text", "") if item.data else "")
                source = (item.data or {}).get("source") or (item.data or {}).get("file_path") or (item.data or {}).get("filename") or (item.data or {}).get("metadata", {}).get("source", "")
                filename = self._extract_filename(source)
                if text:
                    parts.append(f"{text}\nŹródło: {filename}" if filename else text)
            elif isinstance(item, str):
                parts.append(item)
            else:
                parts.append(str(item))
        if not parts:
            return Message(text="Brak dokumentów w bazie wiedzy dla tego zapytania.")
        return Message(text=self.separator.join(parts))
