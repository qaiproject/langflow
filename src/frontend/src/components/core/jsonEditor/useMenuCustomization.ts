import type { MenuItem, Mode } from "vanilla-jsoneditor";
import { useTranslation } from "react-i18next";
import { processTextModeItems, processTreeModeItems } from "./menuUtils";

export const useMenuCustomization = (
  setSuccessData: (data: { title: string }) => void,
  setErrorData: (data: { title: string; list: string[] }) => void,
) => {
  const { t } = useTranslation();
  const customizeMenu = (
    items: MenuItem[],
    context: { mode: Mode; modal: boolean; readOnly: boolean },
    getEditor: () => any,
  ): MenuItem[] => {
    switch (context.mode) {
      case "text":
        return processTextModeItems(
          items,
          getEditor,
          setSuccessData,
          setErrorData,
          t,
        );

      case "tree":
        return processTreeModeItems(items, setSuccessData, t);

      default:
        // For all other modes, return items unchanged
        return items;
    }
  };

  return { customizeMenu };
};
