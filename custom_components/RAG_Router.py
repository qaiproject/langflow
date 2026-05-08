"""
RAG Router — checks Chroma similarity and outputs context + relevance flag.
Use with Langflow's ConditionalRouter to branch RAG vs direct answer.
"""

from langflow.custom import Component
from langflow.io import StrInput, FloatInput, IntInput, SecretStrInput, Output, MessageTextInput
from langflow.schema import Message


class RAGRouter(Component):
    display_name = "RAG Router"
    description = "Checks Chroma similarity. Returns context and match status for ConditionalRouter."
    icon = "git-branch"

    inputs = [
        MessageTextInput(
            name="question",
            display_name="Question",
        ),
        StrInput(
            name="collection_name",
            display_name="Collection Name",
            value="default",
        ),
        StrInput(
            name="persist_directory",
            display_name="Persist Directory",
            value="/app/langflow/chroma",
        ),
        FloatInput(
            name="similarity_threshold",
            display_name="Similarity Threshold",
            value=250.0,
            info="Max distance. Lower = stricter. Nomic range: 100-300.",
        ),
        IntInput(
            name="n_results",
            display_name="Number of Results",
            value=3,
        ),
        StrInput(
            name="embed_base_url",
            display_name="Embeddings API Base",
            value="http://10.200.0.20:8001/v1",
        ),
        StrInput(
            name="embed_model",
            display_name="Embeddings Model",
            value="gte-qwen2-embed",
        ),
        SecretStrInput(
            name="embed_api_key",
            display_name="Embeddings API Key",
            value="not-needed",
            info="API key for the embeddings endpoint. Use 'not-needed' for vLLM/local.",
            advanced=True,
        ),
    ]

    outputs = [
        Output(name="context", display_name="RAG Context", method="get_context", group_outputs=True),
        Output(name="direct", display_name="Direct Question", method="get_direct", group_outputs=True),
    ]

    def _run_query(self):
        if hasattr(self, "_cached"):
            return
        self._cached = True

        import chromadb
        import httpx
        import os

        question = self.question
        if isinstance(question, Message):
            question = question.text

        self._context = ""
        self._relevant = False

        try:
            # Get embedding
            resp = httpx.post(
                f"{self.embed_base_url}/embeddings",
                json={"model": self.embed_model, "input": [question]},
                headers={"Authorization": f"Bearer {self.embed_api_key}"},
                timeout=10,
            )
            resp.raise_for_status()
            embedding = resp.json()["data"][0]["embedding"]

            # Query Chroma
            print(f"[RAG Router] path={self.persist_directory}, collection={self.collection_name}")
            client = chromadb.PersistentClient(path=self.persist_directory)
            try:
                col = client.get_collection(self.collection_name)
            except Exception:
                print(f"[RAG Router] Collection {self.collection_name} not found")
                return

            if col.count() == 0:
                print("[RAG Router] Collection empty")
                return

            results = col.query(
                query_embeddings=[embedding],
                n_results=min(self.n_results, col.count()),
            )

            docs = results.get("documents", [[]])[0]
            distances = results.get("distances", [[]])[0]
            metadatas = results.get("metadatas", [[]])[0]

            if distances and distances[0] < self.similarity_threshold:
                self._relevant = True
                parts = []
                for doc, dist, meta in zip(docs, distances, metadatas):
                    if dist < self.similarity_threshold:
                        source = meta.get("source", meta.get("file_path", ""))
                        filename = os.path.basename(source) if source else ""
                        if filename.startswith("file:///"):
                            filename = os.path.basename(filename[8:])
                        parts.append(f"{doc}\nŹródło: {filename}" if filename else doc)
                self._context = "\n\n---\n\n".join(parts)

            best_dist = f"{distances[0]:.1f}" if distances else "N/A"
            print(f"[RAG Router] relevant={self._relevant}, best_distance={best_dist}, threshold={self.similarity_threshold}")

        except Exception as e:
            print(f"[RAG Router] Error: {e}")

    def get_context(self) -> Message:
        """Returns context when relevant. Stops when NOT relevant."""
        self._run_query()
        if not self._relevant:
            self.stop("context")
            return Message(text="")
        return Message(text=self._context)

    def get_direct(self) -> Message:
        """Returns question when NOT relevant. Stops when relevant."""
        self._run_query()
        if self._relevant:
            self.stop("direct")
            return Message(text="")
        question = self.question
        if isinstance(question, Message):
            question = question.text
        return Message(text=question)
