"""
Reranker — scores chunks against question using cross-encoder model.
Returns top N most relevant chunks. Runs on CPU, no GPU needed.
"""

from langflow.custom import Component
from langflow.io import DataInput, IntInput, StrInput, Output, MessageTextInput
from langflow.schema import Data, Message

# Cache model globally so it loads only once
_reranker_model = None
_reranker_tokenizer = None


def _load_model(model_name: str):
    global _reranker_model, _reranker_tokenizer
    if _reranker_model is not None:
        return _reranker_model, _reranker_tokenizer

    print(f"[Reranker] Loading model {model_name}...")
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
    import torch

    _reranker_tokenizer = AutoTokenizer.from_pretrained(model_name)
    _reranker_model = AutoModelForSequenceClassification.from_pretrained(model_name)
    _reranker_model.eval()
    print(f"[Reranker] Model loaded")
    return _reranker_model, _reranker_tokenizer


class RerankerComponent(Component):
    display_name = "Reranker"
    description = "Re-ranks chunks using cross-encoder. Returns top N most relevant."
    icon = "filter"

    inputs = [
        MessageTextInput(
            name="question",
            display_name="Question",
        ),
        MessageTextInput(
            name="context",
            display_name="Context (chunks)",
            info="Chunks separated by ---",
        ),
        IntInput(
            name="top_n",
            display_name="Top N Results",
            value=2,
            info="Number of best chunks to return.",
        ),
        StrInput(
            name="model_name",
            display_name="Reranker Model",
            value="BAAI/bge-reranker-v2-m3",
            advanced=True,
        ),
        StrInput(
            name="separator",
            display_name="Chunk Separator",
            value="\n\n---\n\n",
            advanced=True,
        ),
    ]

    outputs = [
        Output(name="reranked_context", display_name="Reranked Context", method="rerank"),
    ]

    def rerank(self) -> Message:
        import torch

        question = self.question
        if isinstance(question, Message):
            question = question.text

        context = self.context
        if isinstance(context, Message):
            context = context.text

        if not context or not context.strip():
            return Message(text="")

        # Split chunks
        chunks = [c.strip() for c in context.split(self.separator) if c.strip()]

        if not chunks:
            return Message(text="")

        if len(chunks) <= self.top_n:
            return Message(text=context)

        # Load model
        model, tokenizer = _load_model(self.model_name)

        # Score each chunk
        pairs = [[question, chunk] for chunk in chunks]

        with torch.no_grad():
            inputs = tokenizer(
                pairs,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt",
            )
            scores = model(**inputs).logits.squeeze(-1).tolist()

        if isinstance(scores, float):
            scores = [scores]

        # Sort by score descending, take top N
        scored_chunks = sorted(zip(scores, chunks), key=lambda x: x[0], reverse=True)
        top_chunks = [chunk for score, chunk in scored_chunks[:self.top_n]]

        print(f"[Reranker] {len(chunks)} chunks -> top {self.top_n}, "
              f"best_score={scored_chunks[0][0]:.2f}, worst_kept={scored_chunks[min(self.top_n-1, len(scored_chunks)-1)][0]:.2f}")

        return Message(text=self.separator.join(top_chunks))
