import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";

const languages = [
  { label: "ENG", value: "en" },
  { label: "PL", value: "pl" },
] as const;

export const LanguageButtons = () => {
  const { i18n } = useTranslation();
  const selectedLanguage = i18n.language === "en" ? "en" : "pl";

  const handleLanguageChange = (language: "en" | "pl") => {
    window.localStorage.setItem("language", language);
    i18n.changeLanguage(language);
  };

  return (
    <div className="relative ml-auto inline-flex overflow-hidden rounded-full border border-border">
      {languages.map((language) => (
        <Button
          key={language.value}
          unstyled
          className={cn(
            "px-2 py-0.5 text-xs font-semibold uppercase transition-colors",
            selectedLanguage === language.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          onClick={() => handleLanguageChange(language.value)}
          data-testid={`menu_language_${language.value}_button`}
          id={`menu_language_${language.value}_button`}
        >
          {language.label}
        </Button>
      ))}
    </div>
  );
};

export default LanguageButtons;
