from langflow.custom import Component
from langflow.io import MessageTextInput, StrInput, SecretStrInput, Output
from langflow.schema.message import Message
import smtplib
from email.mime.text import MIMEText


class EmailConfirmationNode(Component):
    display_name = "Email Confirmation"
    description = "Sends a confirmation email about the processed document."
    icon = "send"

    inputs = [
        MessageTextInput(name="recipient_email", display_name="Recipient Email"),
        MessageTextInput(name="category", display_name="Document Category"),
        MessageTextInput(name="s3_path", display_name="S3 Path"),
        MessageTextInput(name="summary", display_name="Document Summary"),
        StrInput(name="smtp_server", display_name="SMTP Server", value="smtp.gmail.com"),
        StrInput(name="smtp_port", display_name="SMTP Port", value="587"),
        StrInput(name="smtp_username", display_name="SMTP Username"),
        SecretStrInput(name="smtp_password", display_name="SMTP Password"),
        StrInput(name="sender_email", display_name="Sender Email", info="From address."),
    ]

    outputs = [
        Output(name="confirmation", display_name="Confirmation", method="send_confirmation"),
    ]

    def send_confirmation(self) -> Message:
        recipient = self.recipient_email
        if isinstance(recipient, Message):
            recipient = recipient.text
        category = self.category
        if isinstance(category, Message):
            category = category.text
        s3_path = self.s3_path
        if isinstance(s3_path, Message):
            s3_path = s3_path.text
        summary = self.summary
        if isinstance(summary, Message):
            summary = summary.text

        subject = f"Dokument przetworzony: {category}"

        body = (
            f"Dokument został automatycznie przetworzony.\n\n"
            f"Kategoria: {category}\n"
            f"Lokalizacja: {s3_path}\n"
        )
        if summary:
            body += f"Podsumowanie: {summary}\n"

        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = self.sender_email
        msg["To"] = recipient

        with smtplib.SMTP(self.smtp_server, int(self.smtp_port)) as server:
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            server.send_message(msg)

        return Message(text=f"Potwierdzenie wysłane do {recipient} — kategoria: {category}, ścieżka: {s3_path}")
