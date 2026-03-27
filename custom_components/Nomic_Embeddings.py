"""
Custom embedding component that calls vLLM /v1/embeddings directly via httpx,
bypassing Langchain's tiktoken pre-tokenization which causes
'Token id out of vocabulary' errors on models with small vocabularies.
"""

from langflow.custom import Component
from langflow.io import StrInput, SecretStrInput, IntInput, Output
from langchain_core.embeddings import Embeddings
from typing import List
import httpx


class DirectEmbeddings(Embeddings):
    def __init__(self, base_url: str, model: str, api_key: str, timeout: int):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.timeout = timeout

    def _embed(self, texts: List[str]) -> List[List[float]]:
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(
                f"{self.base_url}/embeddings",
                headers=headers,
                json={"model": self.model, "input": texts},
            )
            resp.raise_for_status()
            data = resp.json()["data"]
            data.sort(key=lambda x: x["index"])
            return [item["embedding"] for item in data]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self._embed(texts)

    def embed_query(self, text: str) -> List[float]:
        return self._embed([text])[0]


class NomicEmbeddingsNode(Component):
    display_name = "Nomic Embeddings (vLLM)"
    description = "Direct vLLM embeddings without tiktoken pre-tokenization."
    icon = "cpu"

    inputs = [
        StrInput(name="base_url", display_name="vLLM API Base", value="http://10.200.0.20:8001/v1"),
        StrInput(name="model_name", display_name="Model Name", value="nomic-embed-text"),
        SecretStrInput(name="api_key", display_name="API Key", value="not-needed"),
        IntInput(name="timeout", display_name="Timeout (s)", value=60, advanced=True),
    ]

    outputs = [
        Output(name="embeddings", display_name="Embeddings", method="build_embeddings"),
    ]

    def build_embeddings(self) -> Embeddings:
        return DirectEmbeddings(
            base_url=self.base_url,
            model=self.model_name,
            api_key=self.api_key,
            timeout=self.timeout,
        )
