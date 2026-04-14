import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { type MenuItem, Mode } from "vanilla-jsoneditor";

export const filterTextModeItems = (items: MenuItem[]): MenuItem[] => {
  return items.filter((item) => {
    if (item.type === "button" && item.title) {
      const title = item.title.toLowerCase();
      // Remove search buttons in text mode only
      if (title.includes("search") || title.includes("find")) {
        return false;
      }
    }
    return true;
  });
};

export const hasCopyButton = (items: MenuItem[]): boolean => {
  return items.some(
    (item) =>
      item.type === "button" && item.title?.toLowerCase().includes("copy"),
  );
};

export const createCopyButton = (
  getEditor: () => any,
  setSuccessData: (data: { title: string }) => void,
  setErrorData: (data: { title: string; list: string[] }) => void,
  t: (key: string) => string,
): MenuItem => {
  return {
    type: "button" as const,
    onClick: () => {
      const editor = getEditor();
      if (!editor) {
        setErrorData({
          title: t("jsonEditor.copyFailed"),
          list: [t("jsonEditor.editorNotAvailable")],
        });
        return;
      }

      const currentContent = editor.get();
      const textContent =
        "text" in currentContent
          ? currentContent.text
          : JSON.stringify(currentContent.json, null, 2);
      navigator.clipboard
        .writeText(textContent)
        .then(() => {
          setSuccessData({ title: t("jsonEditor.jsonCopiedToClipboard") });
        })
        .catch(() => {
          setErrorData({
            title: t("jsonEditor.copyFailed"),
            list: [t("jsonEditor.copyManually")],
          });
        });
    },
    icon: faCopy,
    title: t("jsonEditor.copyJsonToClipboard"),
  };
};

export const addCopyButtonToItems = (
  items: MenuItem[],
  copyButton: MenuItem,
): MenuItem[] => {
  const updatedItems = [...items];
  updatedItems.push({ type: "separator" as const });
  updatedItems.push(copyButton);
  return updatedItems;
};

export const enhanceExistingCopyButtons = (
  items: MenuItem[],
  setSuccessData: (data: { title: string }) => void,
  successMessage: string,
): MenuItem[] => {
  return items.map((item) => {
    if (item.type === "button" && item.title?.toLowerCase().includes("copy")) {
      const originalOnClick = item.onClick;
      return {
        ...item,
        onClick: (event: MouseEvent) => {
          // Call the original copy function
          if (originalOnClick) {
            originalOnClick(event);
          }
          // Add our success notification
          setSuccessData({ title: successMessage });
        },
      };
    }
    return item;
  });
};

export const processTextModeItems = (
  items: MenuItem[],
  getEditor: () => any,
  setSuccessData: (data: { title: string }) => void,
  setErrorData: (data: { title: string; list: string[] }) => void,
  t: (key: string) => string,
): MenuItem[] => {
  let filteredItems = filterTextModeItems(items);

  if (!hasCopyButton(filteredItems)) {
    const copyButton = createCopyButton(
      getEditor,
      setSuccessData,
      setErrorData,
      t,
    );
    filteredItems = addCopyButtonToItems(filteredItems, copyButton);
  } else {
    filteredItems = enhanceExistingCopyButtons(
      filteredItems,
      setSuccessData,
      t("jsonEditor.jsonCopiedToClipboard"),
    );
  }

  return filteredItems;
};

export const processTreeModeItems = (
  items: MenuItem[],
  setSuccessData: (data: { title: string }) => void,
  t: (key: string) => string,
): MenuItem[] => {
  return enhanceExistingCopyButtons(
    items,
    setSuccessData,
    t("outputModal.copiedToClipboard"),
  );
};
