import i18n from "@/i18n";
import { translateComponentText } from "@/utils/componentTranslations";
import type { APITemplateType } from "../../types/api";

export default function getFieldTitle(
  template: APITemplateType,
  templateField: string,
): string {
  const field = template[templateField];
  const translatedFieldNames: Record<string, string> = {
    input_value: i18n.t("chatComponent.inputText"),
    should_store_message: i18n.t("chatComponent.storeMessages"),
    sender: i18n.t("chatComponent.senderType"),
    sender_name: i18n.t("chatComponent.senderName"),
    session_id: i18n.t("chatComponent.sessionId"),
    context_id: i18n.t("chatComponent.contextId"),
    files: i18n.t("chatComponent.files"),
  };

  if (field?.name && translatedFieldNames[field.name]) {
    return translatedFieldNames[field.name];
  }

  return translateComponentText(
    field.display_name ? field.display_name : (field.name ?? templateField),
  );
}
