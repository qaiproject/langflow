import i18n from "@/i18n";

export const getModalPropsApiKey = () => {
  const modalProps = {
    title: i18n.t("apiKeys.createTitle"),
    description: i18n.t("apiKeys.createDescription"),
    inputPlaceholder: i18n.t("apiKeys.inputPlaceholder"),
    buttonText: i18n.t("apiKeys.generateButton"),
    generatedKeyMessage: (
      <>
        {i18n.t("apiKeys.generatedMessagePrefix")}{" "}
        <strong>{i18n.t("apiKeys.generatedMessageStrong")}</strong>{" "}
        {i18n.t("apiKeys.generatedMessageSuffix")}
      </>
    ),
    showIcon: true,
    inputLabel: (
      <>
        <span className="text-sm">{i18n.t("apiKeys.descriptionLabel")}</span>{" "}
        <span className="text-xs text-muted-foreground">
          {i18n.t("apiKeys.optional")}
        </span>
      </>
    ),
  };

  return modalProps;
};
