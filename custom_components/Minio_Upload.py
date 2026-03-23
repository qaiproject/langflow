from langflow.custom import Component
from langflow.io import MessageTextInput, StrInput, SecretStrInput, BoolInput, Output
from langflow.schema.message import Message


class MinioUploadNode(Component):
    display_name = "Minio Upload"
    description = "Uploads file(s) to a Minio bucket, into a folder based on document category. Supports multiple files (newline-separated paths)."
    icon = "hard-drive"

    inputs = [
        MessageTextInput(name="file_paths", display_name="File Path(s)", info="Local path(s) to upload. Multiple paths separated by newline."),
        MessageTextInput(name="category", display_name="Category", info="Document category (used as folder name)."),
        StrInput(name="endpoint", display_name="Minio Endpoint", value="minio:9000"),
        StrInput(name="access_key", display_name="Access Key", value="minioadmin"),
        SecretStrInput(name="secret_key", display_name="Secret Key", value="minioadmin123"),
        StrInput(name="bucket_name", display_name="Bucket Name", value="qai-storage"),
        BoolInput(name="secure", display_name="Use HTTPS", value=False, advanced=True),
    ]

    outputs = [
        Output(name="minio_paths", display_name="Minio Path(s)", method="upload"),
    ]

    def upload(self) -> Message:
        import os
        from datetime import datetime
        from minio import Minio

        raw_paths = self.file_paths
        if isinstance(raw_paths, Message):
            raw_paths = raw_paths.text

        category = self.category
        if isinstance(category, Message):
            category = category.text

        file_paths = [p.strip() for p in raw_paths.strip().split("\n") if p.strip()]

        if not file_paths:
            return Message(text="")

        client = Minio(
            self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure,
        )

        if not client.bucket_exists(self.bucket_name):
            client.make_bucket(self.bucket_name)

        category_folder = category.strip().lower().replace(" ", "_")
        uploaded = []

        for file_path in file_paths:
            if not os.path.exists(file_path):
                continue
            filename = os.path.basename(file_path)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            object_name = f"documents/{category_folder}/{timestamp}_{filename}"
            client.fput_object(self.bucket_name, object_name, file_path)
            uploaded.append(f"{self.bucket_name}/{object_name}")

        return Message(text="\n".join(uploaded))
