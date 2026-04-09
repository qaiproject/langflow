import IconComponent from "@/components/common/genericIconComponent";
import { cn } from "@/utils/utils";

export const FolderSelectItem = ({
  name,
  iconName,
  destructive = false,
}: {
  name: string;
  iconName: string;
  destructive?: boolean;
}) => (
  <div
    className={cn(
      destructive ? "text-destructive" : "",
      "flex items-center font-medium",
    )}
  >
    <IconComponent name={iconName} className="mr-2 w-4" />
    <span>{name}</span>
  </div>
);
