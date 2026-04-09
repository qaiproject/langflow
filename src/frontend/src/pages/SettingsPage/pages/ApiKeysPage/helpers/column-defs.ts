import i18n from "@/i18n";
import TableAutoCellRender from "@/components/core/parameterRenderComponent/components/tableComponent/components/tableAutoCellRender";

export const getColumnDefs = () => {
  return [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      showDisabledCheckboxes: true,
      headerName: i18n.t("apiKeys.name"),
      field: "name",
      cellRenderer: TableAutoCellRender,
      flex: 2,
    },
    {
      headerName: i18n.t("apiKeys.key"),
      field: "api_key",
      cellRenderer: TableAutoCellRender,
      flex: 1,
    },
    {
      headerName: i18n.t("apiKeys.created"),
      field: "created_at",
      cellRenderer: TableAutoCellRender,
      flex: 1,
    },
    {
      headerName: i18n.t("apiKeys.lastUsed"),
      field: "last_used_at",
      cellRenderer: TableAutoCellRender,
      flex: 1,
    },
    {
      headerName: i18n.t("apiKeys.totalUses"),
      field: "total_uses",
      cellRenderer: TableAutoCellRender,
      flex: 1,
      resizable: false,
    },
  ];
};
