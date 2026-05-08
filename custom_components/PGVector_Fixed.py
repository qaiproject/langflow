import json
import logging

from langchain_community.vectorstores import PGVector
from langchain_core.documents import Document
from sqlalchemy import create_engine, text

from lfx.base.vectorstores.model import LCVectorStoreComponent, check_cached_vector_store
from lfx.helpers.data import docs_to_data
from lfx.io import HandleInput, IntInput, StrInput
from lfx.schema.data import Data
from lfx.utils.connection_string_parser import transform_connection_string

logger = logging.getLogger(__name__)


def _sanitize_metadata(metadata: dict) -> dict:
    """Convert all metadata values to JSON-serializable types."""
    result = {}
    for k, v in metadata.items():
        try:
            json.dumps(v)
            result[k] = v
        except (TypeError, ValueError):
            result[k] = str(v)
    return result


def _ensure_hnsw_index(
    connection_string: str,
    embedding_dim: int = 1536,
    hnsw_m: int = 16,
    hnsw_ef_construction: int = 64,
) -> None:
    """Set vector dimension and create HNSW index if not exists."""
    try:
        engine = create_engine(connection_string)
        with engine.connect() as conn:
            conn.execute(text(
                "ALTER TABLE langchain_pg_embedding "
                f"ALTER COLUMN embedding TYPE vector({embedding_dim})"
            ))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS langchain_pg_embedding_hnsw_idx "
                "ON langchain_pg_embedding "
                "USING hnsw (embedding vector_cosine_ops) "
                f"WITH (m = {hnsw_m}, ef_construction = {hnsw_ef_construction})"
            ))
            conn.commit()
        engine.dispose()
    except Exception as e:
        # Index may already exist with correct type — not critical
        logger.warning("HNSW index setup skipped: %s", e)


class PGVectorFixedComponent(LCVectorStoreComponent):
    display_name = "PGVector Fixed"
    description = "PGVector Fixed — sanitizes metadata + auto-creates HNSW index"
    name = "pgvector_fixed"
    icon = "cpu"

    inputs = [
        StrInput(name="pg_server_url", display_name="PostgreSQL Server Connection String", required=True),
        StrInput(name="collection_name", display_name="Table", required=True),
        *LCVectorStoreComponent.inputs,
        HandleInput(name="embedding", display_name="Embedding", input_types=["Embeddings"], required=True),
        IntInput(
            name="number_of_results",
            display_name="Number of Results",
            info="Number of results to return.",
            value=4,
            advanced=True,
        ),
        IntInput(
            name="embedding_dim",
            display_name="Embedding Dimension",
            info="Dimension of the embedding vectors. Must match the embedding model output.",
            value=1536,
            advanced=True,
        ),
        IntInput(
            name="hnsw_m",
            display_name="HNSW m",
            info="HNSW index parameter: number of connections per layer.",
            value=16,
            advanced=True,
        ),
        IntInput(
            name="hnsw_ef_construction",
            display_name="HNSW ef_construction",
            info="HNSW index parameter: size of the dynamic list during index construction.",
            value=64,
            advanced=True,
        ),
    ]

    @check_cached_vector_store
    def build_vector_store(self) -> PGVector:
        self.ingest_data = self._prepare_ingest_data()

        documents = []
        for _input in self.ingest_data or []:
            if isinstance(_input, Data):
                doc = _input.to_lc_document()
            else:
                doc = _input

            # Sanitize metadata — convert non-JSON-serializable objects to str
            if hasattr(doc, "metadata") and doc.metadata:
                doc = Document(
                    page_content=doc.page_content,
                    metadata=_sanitize_metadata(doc.metadata),
                )
            documents.append(doc)

        connection_string_parsed = transform_connection_string(self.pg_server_url)

        if documents:
            pgvector = PGVector.from_documents(
                embedding=self.embedding,
                documents=documents,
                collection_name=self.collection_name,
                connection_string=connection_string_parsed,
            )
            _ensure_hnsw_index(
                connection_string_parsed,
                embedding_dim=self.embedding_dim,
                hnsw_m=self.hnsw_m,
                hnsw_ef_construction=self.hnsw_ef_construction,
            )
        else:
            pgvector = PGVector.from_existing_index(
                embedding=self.embedding,
                collection_name=self.collection_name,
                connection_string=connection_string_parsed,
            )

        return pgvector

    def search_documents(self) -> list[Data]:
        vector_store = self.build_vector_store()

        if self.search_query and isinstance(self.search_query, str) and self.search_query.strip():
            docs = vector_store.similarity_search(
                query=self.search_query,
                k=self.number_of_results,
            )
            data = docs_to_data(docs)
            self.status = data
            return data
        return []
