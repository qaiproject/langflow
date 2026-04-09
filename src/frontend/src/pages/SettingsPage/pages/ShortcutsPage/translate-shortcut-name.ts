import type { TFunction } from "i18next";

export const translateShortcutName = (
  name: string,
  t: TFunction,
) => {
  const translationMap: Record<string, string> = {
    "Advanced Settings": t("shortcuts.items.advancedSettings"),
    "Search Components Sidebar": t("shortcuts.items.searchComponentsSidebar"),
    Minimize: t("shortcuts.items.minimize"),
    Code: t("shortcuts.items.code"),
    Copy: t("shortcuts.items.copy"),
    Duplicate: t("shortcuts.items.duplicate"),
    Docs: t("shortcuts.items.docs"),
    "Changes Save": t("shortcuts.items.changesSave"),
    "Save Component": t("shortcuts.items.saveComponent"),
    Delete: t("shortcuts.items.delete"),
    "Open Playground": t("shortcuts.items.openPlayground"),
    Undo: t("shortcuts.items.undo"),
    Redo: t("shortcuts.items.redo"),
    "Redo Alt": t("shortcuts.items.redoAlternative"),
    Group: t("shortcuts.items.group"),
    Cut: t("shortcuts.items.cut"),
    Paste: t("shortcuts.items.paste"),
    API: t("shortcuts.items.api"),
    Download: t("shortcuts.items.download"),
    Update: t("shortcuts.items.update"),
    "Freeze Path": t("shortcuts.items.freezePath"),
    "Flow Share": t("shortcuts.items.flowShare"),
    Play: t("shortcuts.items.play"),
    "Output Inspection": t("shortcuts.items.outputInspection"),
    "Tool Mode": t("shortcuts.items.toolMode"),
    "Toggle Sidebar": t("shortcuts.items.toggleSidebar"),
  };

  return translationMap[name] ?? name;
};
