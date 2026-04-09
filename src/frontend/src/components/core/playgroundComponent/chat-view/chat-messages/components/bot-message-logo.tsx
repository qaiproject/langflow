import LangflowLogo from "@/components/common/QosmoLogo";
import { useTranslation } from "react-i18next";

export default function LogoIcon() {
  const { t } = useTranslation();
  return (
    <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-muted">
      <div className="flex h-8 w-8 items-center justify-center">
        <LangflowLogo
          title={t("auth.langflowLogo")}
          className="absolute h-[18px] w-[18px]"
        />
      </div>
    </div>
  );
}
