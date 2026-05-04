import i18n from "@/i18n";

const getComponentTextKey = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const translateComponentText = <T extends string | undefined | null>(
  text: T,
): T extends string ? string : T => {
  if (!text || typeof text !== "string") return text as any;

  const key = `componentTexts.${getComponentTextKey(text)}`;
  return (i18n.exists(key) ? i18n.t(key) : text) as any;
};
