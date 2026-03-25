from langflow.custom import Component
from langflow.io import MessageTextInput, StrInput, SecretStrInput, DropdownInput, Output
from langflow.schema.message import Message


class DocumentClassifierNode(Component):
    display_name = "Document Classifier"
    description = "Classifies a document into categories (faktura, urlop, inny) using an LLM."
    icon = "file-text"

    inputs = [
        MessageTextInput(
            name="extracted_text",
            display_name="Extracted Text",
            info="OCR text from the document.",
        ),
        DropdownInput(
            name="provider",
            display_name="LLM Provider",
            options=["openai", "anthropic", "ollama"],
            value="openai",
        ),
        StrInput(
            name="base_url",
            display_name="Base URL (optional)",
            info="Custom API base URL (e.g. for vLLM or Ollama). Leave empty for default.",
            value="",
            advanced=True,
        ),
        StrInput(name="model_name", display_name="Model Name", value="gpt-4o-mini"),
        SecretStrInput(name="api_key", display_name="API Key", value="not-needed", info="For vLLM/Ollama enter any value."),
        StrInput(
            name="categories",
            display_name="Categories",
            value="faktura, urlop, inny",
            info="Comma-separated list of document categories.",
        ),
    ]

    outputs = [
        Output(name="category", display_name="Category", method="classify", group_outputs=True),
        Output(name="summary", display_name="Summary", method="get_summary", group_outputs=True),
    ]

    def _run_classification(self):
        if hasattr(self, "_cached"):
            return
        self._cached = True

        text = self.extracted_text
        if isinstance(text, Message):
            text = text.text

        categories = [c.strip() for c in self.categories.split(",")]
        categories_str = ", ".join(categories)

        system_prompt = (
            "You are a document classifier. Based on the document text provided, "
            f"classify it into exactly ONE of these categories: {categories_str}.\n\n"
            "Respond with ONLY a JSON object in this format:\n"
            '{"category": "<category>", "summary": "<one sentence summary in Polish>"}\n'
            "Do not add any other text."
        )

        user_prompt = f"Document text:\n\n{text[:4000]}"

        if self.provider == "anthropic":
            import anthropic

            client = anthropic.Anthropic(api_key=self.api_key)
            response = client.messages.create(
                model=self.model_name,
                max_tokens=200,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            raw = response.content[0].text
        else:
            import openai

            kwargs = {"api_key": self.api_key or "not-needed"}
            if self.base_url:
                base_url = self.base_url.strip().rstrip("/")
                if not base_url.endswith("/v1"):
                    base_url += "/v1"
                kwargs["base_url"] = base_url
            elif self.provider == "ollama":
                kwargs["base_url"] = "http://host.docker.internal:11434/v1"

            client = openai.OpenAI(**kwargs)
            response = client.chat.completions.create(
                model=self.model_name,
                max_tokens=200,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            raw = response.choices[0].message.content

        import json

        try:
            result = json.loads(raw.strip())
            self._category = result.get("category", "inny").lower().strip()
            self._summary = result.get("summary", "")
        except json.JSONDecodeError:
            raw_lower = raw.lower()
            self._category = "inny"
            for cat in categories:
                if cat.lower() in raw_lower:
                    self._category = cat.lower()
                    break
            self._summary = raw.strip()

    def classify(self) -> Message:
        self._run_classification()
        return Message(text=self._category)

    def get_summary(self) -> Message:
        self._run_classification()
        return Message(text=self._summary)
