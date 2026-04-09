import i18n from "@/i18n";

export const getPlaceholder = (
  disabled: boolean,
  returnMessage: string = i18n.t("common.typeSomething"),
) => {
  if (disabled) return i18n.t("dropdown.receivingInput");

  return returnMessage || i18n.t("common.typeSomething");
};
