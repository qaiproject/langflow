from langflow.custom import Component
from langflow.io import MessageTextInput, StrInput, SecretStrInput, Output
from langflow.schema.message import Message
import imaplib
import email
from email.header import decode_header
import os
import tempfile


class CheckEmailNode(Component):
    display_name = "Email Trigger"
    description = "Checks inbox for email. Silently stops pipeline if none found."
    icon = "mail"

    inputs = [
        MessageTextInput(name="trigger", display_name="Trigger", info="Connect Cron Scheduler output here."),
        StrInput(name="imap_server", display_name="IMAP Server", value="imap.gmail.com"),
        StrInput(name="username", display_name="Username"),
        SecretStrInput(name="password", display_name="Password"),
        StrInput(name="folder", display_name="Folder", value="INBOX"),
    ]

    outputs = [
        Output(name="attachment_paths", display_name="Attachment Paths", method="get_attachment_paths", group_outputs=True),
        Output(name="sender_email", display_name="Sender Email", method="get_sender_email", group_outputs=True),
        Output(name="subject", display_name="Subject", method="get_subject", group_outputs=True),
    ]

    def _decode_filename(self, filename):
        decoded_fn = decode_header(filename)
        if decoded_fn[0][1]:
            return decoded_fn[0][0].decode(decoded_fn[0][1])
        elif isinstance(decoded_fn[0][0], bytes):
            return decoded_fn[0][0].decode("utf-8", errors="replace")
        return str(decoded_fn[0][0])

    def _fetch(self):
        if hasattr(self, "_fetched"):
            return
        self._fetched = True
        self._sender = ""
        self._subject = ""
        self._attachments = []
        self._found = False

        try:
            mail = imaplib.IMAP4_SSL(self.imap_server)
            mail.login(self.username, self.password)
            mail.select(self.folder)

            _, data = mail.search(None, "(UNSEEN)")
            mail_ids = data[0].split()

            if not mail_ids:
                mail.logout()
                print("[EmailTrigger] No new email")
                return

            latest = mail_ids[-1]
            _, msg_data = mail.fetch(latest, "(RFC822)")
            msg = email.message_from_bytes(msg_data[0][1])

            self._sender = email.utils.parseaddr(msg.get("From", ""))[1]

            raw_subject = msg.get("Subject", "")
            decoded_parts = decode_header(raw_subject)
            subject_parts = []
            for part, charset in decoded_parts:
                if isinstance(part, bytes):
                    subject_parts.append(part.decode(charset or "utf-8", errors="replace"))
                else:
                    subject_parts.append(part)
            self._subject = "".join(subject_parts)

            save_dir = tempfile.mkdtemp(prefix="langflow_email_")
            for part in msg.walk():
                if part.get_content_maintype() == "multipart":
                    continue
                if part.get("Content-Disposition") is None:
                    continue
                filename = part.get_filename()
                if filename:
                    filename = self._decode_filename(filename)
                    save_path = os.path.join(save_dir, filename)
                    with open(save_path, "wb") as f:
                        f.write(part.get_payload(decode=True))
                    self._attachments.append(save_path)

            mail.logout()
            self._found = bool(self._attachments)

            if self._found:
                print(f"[EmailTrigger] Email from {self._sender}: {self._subject} ({len(self._attachments)} files)")

        except Exception as e:
            self.log(f"Email check error: {e}")
            print(f"[EmailTrigger] Error: {e}")

    def get_attachment_paths(self) -> Message:
        self._fetch()
        if not self._found:
            self.stop("attachment_paths")
            return Message(text="")
        return Message(text="\n".join(self._attachments))

    def get_sender_email(self) -> Message:
        self._fetch()
        if not self._found:
            self.stop("sender_email")
            return Message(text="")
        return Message(text=self._sender)

    def get_subject(self) -> Message:
        self._fetch()
        if not self._found:
            self.stop("subject")
            return Message(text="")
        return Message(text=self._subject)
