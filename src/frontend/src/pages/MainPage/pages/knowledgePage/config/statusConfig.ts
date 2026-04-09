import type { TFunction } from "i18next";

export interface StatusConfigEntry {
  label: string;
  textClass: string;
}

export const getStatusConfig = (
  t: TFunction,
): Record<string, StatusConfigEntry> => ({
  ready: {
    label: t("knowledge.status.ready"),
    textClass: "text-accent-emerald-foreground",
  },
  ingesting: {
    label: t("knowledge.status.ingesting"),
    textClass: "text-accent-amber-foreground",
  },
  failed: {
    label: t("knowledge.status.failed"),
    textClass: "text-destructive",
  },
  cancelling: {
    label: t("knowledge.status.cancelling"),
    textClass: "text-accent-amber-foreground",
  },
  empty: {
    label: t("knowledge.status.empty"),
    textClass: "text-muted-foreground",
  },
});

export const BUSY_STATUSES = ["ingesting", "cancelling"] as const;

export const isBusyStatus = (status?: string): boolean =>
  BUSY_STATUSES.includes(status as (typeof BUSY_STATUSES)[number]);
