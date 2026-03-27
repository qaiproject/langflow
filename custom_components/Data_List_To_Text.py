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

    def build_text(self) -> Message:
        parts = []
        for item in self.data_list or []:
            if isinstance(item, Data):
                text = item.text or (item.data.get("text", "") if item.data else "")
                source = (item.data or {}).get("source") or (item.data or {}).get("file_path") or (item.data or {}).get("metadata", {}).get("source", "")
                if text:
                    parts.append(f"{text}\nŹródło: {source}" if source else text)
            elif isinstance(item, str):
                parts.append(item)
            else:
                parts.append(str(item))
        if not parts:
            return Message(text="Brak dokumentów w bazie wiedzy dla tego zapytania.")
        return Message(text=self.separator.join(parts))
