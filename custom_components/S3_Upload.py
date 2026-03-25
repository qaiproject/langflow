from langflow.custom import Component
from langflow.io import MessageTextInput, StrInput, SecretStrInput, BoolInput, Output
from langflow.schema.message import Message


class S3UploadNode(Component):
    display_name = "S3 Upload"
    description = "Uploads file(s) to an S3-compatible bucket (SeaweedFS, AWS S3, etc.), into a folder based on document category. Supports multiple files (newline-separated paths)."
    icon = "hard-drive"

    inputs = [
        MessageTextInput(name="file_paths", display_name="File Path(s)", info="Local path(s) to upload. Multiple paths separated by newline."),
        MessageTextInput(name="category", display_name="Category", info="Document category (used as folder name)."),
        StrInput(name="endpoint", display_name="S3 Endpoint", value="http://seaweedfs:8333"),
        StrInput(name="access_key", display_name="Access Key", value="seaweed"),
        SecretStrInput(name="secret_key", display_name="Secret Key", value="seaweedsecret"),
        StrInput(name="bucket_name", display_name="Bucket Name", value="qai-storage"),
        StrInput(name="region", display_name="Region", value="auto", advanced=True),
    ]

    outputs = [
        Output(name="s3_paths", display_name="S3 Path(s)", method="upload"),
    ]

    def upload(self) -> Message:
        import os
        import boto3
        from botocore.exceptions import ClientError
        from datetime import datetime

        raw_paths = self.file_paths
        if isinstance(raw_paths, Message):
            raw_paths = raw_paths.text

        category = self.category
        if isinstance(category, Message):
            category = category.text

        file_paths = [p.strip() for p in raw_paths.strip().split("\n") if p.strip()]

        if not file_paths:
            return Message(text="")

        client = boto3.client(
            "s3",
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
        )

        try:
            client.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            client.create_bucket(Bucket=self.bucket_name)

        category_folder = category.strip().lower().replace(" ", "_")
        uploaded = []

        for file_path in file_paths:
            if not os.path.exists(file_path):
                continue
            filename = os.path.basename(file_path)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            object_name = f"documents/{category_folder}/{timestamp}_{filename}"
            client.upload_file(file_path, self.bucket_name, object_name)
            uploaded.append(f"{self.bucket_name}/{object_name}")

        return Message(text="\n".join(uploaded))
