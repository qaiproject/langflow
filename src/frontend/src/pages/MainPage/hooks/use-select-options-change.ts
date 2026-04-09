import { useCallback } from "react";
import i18n from "@/i18n";

const useSelectOptionsChange = (
  selectedFlowsComponentsCards: string[] | undefined,
  setErrorData: (data: { title: string; list: string[] }) => void,
  setOpenDelete: (value: boolean) => void,
  handleExport: () => void,
  handleDuplicate: () => void,
  handleEdit: () => void,
) => {
  const handleSelectOptionsChange = useCallback(
    (action) => {
      const hasSelected = selectedFlowsComponentsCards?.length! > 0;
      if (!hasSelected) {
        setErrorData({
          title: i18n.t("mainPage.noItemsSelected"),
          list: [i18n.t("mainPage.selectItemsToDelete")],
        });
        return;
      }
      if (action === "delete") {
        setOpenDelete(true);
      } else if (action === "duplicate") {
        handleDuplicate();
      } else if (action === "export") {
        handleExport();
      } else if (action === "edit") {
        handleEdit();
      }
    },
    [
      selectedFlowsComponentsCards,
      setErrorData,
      setOpenDelete,
      handleDuplicate,
      handleEdit,
      handleExport,
    ],
  );

  return { handleSelectOptionsChange };
};

export default useSelectOptionsChange;
