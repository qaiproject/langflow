import type { Message } from "@/types/messages";
import { removeMessages, updateMessage } from "./message-utils";

type MessageEventPayload = Partial<Message> & {
  chunk?: string;
};

const toMessageEventPayload = (data: unknown): MessageEventPayload => {
  return data && typeof data === "object"
    ? (data as MessageEventPayload)
    : {};
};

/**
 * Handles message-related events from the build process.
 * This keeps all chat message logic within the chat-view scope.
 */
export const handleMessageEvent = (
  eventType: string,
  data: unknown,
): boolean => {
  const payload = toMessageEventPayload(data);

  switch (eventType) {
    case "add_message": {
      // Add/update message in React Query cache (replaces placeholder if exists)
      updateMessage(payload as Message);
      return true;
    }
    case "token": {
      if (!payload.id) {
        return true;
      }

      // Update message text in React Query cache for streaming
      updateMessage({
        id: payload.id,
        flow_id: payload.flow_id || "",
        session_id: payload.session_id || "",
        text: payload.chunk || "",
        sender: payload.sender || "Machine",
        sender_name: payload.sender_name || "AI",
        timestamp: payload.timestamp || new Date().toISOString(),
        files: payload.files || [],
        edit: payload.edit || false,
        background_color: payload.background_color || "",
        text_color: payload.text_color || "",
        properties: { ...(payload.properties ?? {}), state: "partial" },
      });
      return true;
    }
    case "remove_message": {
      // Remove message from React Query cache
      if (!payload.id) {
        return true;
      }
      removeMessages(
        [payload.id],
        payload.session_id || "",
        payload.flow_id || "",
      );
      return true;
    }
    case "error": {
      if (payload.category === "error") {
        // Add error message to React Query cache
        updateMessage(payload as Message);
      }
      return true;
    }
    default:
      // Not a message event, return false to indicate it wasn't handled
      return false;
  }
};
