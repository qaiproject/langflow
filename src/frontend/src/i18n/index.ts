import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en/translation.json";
import pl from "./locales/pl/translation.json";

const getInitialLanguage = () => {
  if (typeof window === "undefined") return "pl";

  const savedLanguage = window.localStorage.getItem("language");
  return savedLanguage === "en" || savedLanguage === "pl"
    ? savedLanguage
    : "pl";
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pl: { translation: pl },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  supportedLngs: ["pl", "en"],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
