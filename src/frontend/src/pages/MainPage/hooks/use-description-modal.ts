import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const useDescriptionModal = (
  selectedFlowsComponentsCards: string[] | undefined,
  type: string | undefined,
) => {
  const { t } = useTranslation();
  const getDescriptionModal = useMemo(() => {
    const getTypeLabel = (type) => {
      const labels = {
        all: t("mainPage.itemLabel"),
        component: t("mainPage.componentLabel"),
        flow: t("mainPage.flowLabel"),
      };
      return labels[type] || "";
    };

    const getPluralizedLabel = (type) => {
      const labels = {
        all: t("mainPage.itemsLabel"),
        component: t("mainPage.componentsLabel"),
        flow: t("mainPage.flowsLabel"),
      };
      return labels[type] || "";
    };

    if (selectedFlowsComponentsCards?.length === 1) {
      return getTypeLabel(type);
    }
    return getPluralizedLabel(type);
  }, [selectedFlowsComponentsCards, type, t]);

  return getDescriptionModal;
};

export default useDescriptionModal;
