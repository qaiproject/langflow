import { useTranslation } from "react-i18next";
import ForwardedIconComponent from "@/components/common/genericIconComponent";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ImportButtonComponent({
  variant = "large",
}: {
  variant?: "large" | "small";
}) {
  const { t } = useTranslation();
  const items = [
    {
      icon: "GoogleDrive",
      label: t("fileManager.importSources.drive"),
      onClick: () => {
        // Handle Google Drive click
      },
    },
    {
      icon: "OneDrive",
      label: t("fileManager.importSources.oneDrive"),
      onClick: () => {
        // Handle OneDrive click
      },
    },
    {
      icon: "AWSInverted",
      label: t("fileManager.importSources.s3Bucket"),
      onClick: () => {
        // Handle S3 click
      },
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size={variant === "small" ? "sm" : "default"}
          ignoreTitleCase
          className="justify-between"
        >
          <span>{t("fileManager.importFrom")}</span>
          <ForwardedIconComponent name="ChevronDown" className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.icon}
            onSelect={(event) => {
              event.preventDefault();
              item.onClick();
            }}
            className="gap-2"
          >
            <ForwardedIconComponent name={item.icon} className="h-4 w-4" />
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
