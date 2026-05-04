import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");
const componentIndexPath = path.resolve(
  frontendRoot,
  "../lfx/src/lfx/_assets/component_index.json",
);
const enPath = path.resolve(frontendRoot, "src/i18n/locales/en/translation.json");
const plPath = path.resolve(frontendRoot, "src/i18n/locales/pl/translation.json");

const TRANSLATABLE_FIELDS = new Set([
  "display_name",
  "description",
  "info",
  "placeholder",
  "list_add_label",
  "trigger_text",
  "button_description",
  "helper_text",
  "text",
]);

const EXACT_PL = new Map(
  Object.entries({
    "Knowledge Base": "Baza wiedzy",
    "Read File": "Odczytaj plik",
    "Write File": "Zapisz plik",
    "Split Text": "Podziel tekst",
    "Split text into chunks based on specified criteria.":
      "Dzieli tekst na fragmenty na podstawie określonych kryteriów.",
    "Input": "Wejście",
    "Chunk Overlap": "Nakładanie fragmentów",
    "Chunk Size": "Rozmiar fragmentu",
    "Chunks": "Fragmenty",
    "Enter a query...": "Wpisz zapytanie...",
    "Search Results": "Wyniki wyszukiwania",
    "Astra DB": "Astra DB",
    "Ingest and search documents in Astra DB":
      "Wczytuje i przeszukuje dokumenty w Astra DB",
    "Astra DB Application Token": "Token aplikacji Astra DB",
    "Ingest Data": "Wczytaj dane",
    "Search Query": "Zapytanie wyszukiwania",
    "Embedding Model": "Model embeddingów",
    "Parser": "Parser",
    "Stringify": "Stringify",
    "Parsed Text": "Sparsowany tekst",
    "JSON or Table": "JSON lub tabela",
    "Template": "Szablon",
    "Mode": "Tryb",
    "File": "Plik",
    "Files": "Pliki",
    "Raw Content": "Surowa treść",
    "Server File Path": "Ścieżka pliku na serwerze",
    "Storage Location": "Lokalizacja przechowywania",
    "Select Location": "Wybierz lokalizację",
    "Choose files": "Wybierz pliki",
    "Select files": "Wybierz pliki",
    "Separator": "Separator",
    "Silent Errors": "Wycisz błędy",
    "Delete Server File After Processing": "Usuń plik z serwera po przetworzeniu",
    "Ignore Unsupported Extensions": "Ignoruj nieobsługiwane rozszerzenia",
    "Ignore Unspecified Files": "Ignoruj nieokreślone pliki",
    "Processing Concurrency": "Równoległość przetwarzania",
    "[Deprecated] Use Multithreading": "[Przestarzałe] Użyj wielowątkowości",
    "Advanced Parser": "Zaawansowany parser",
    "Input & Output": "Wejście i wyjście",
    "Data Sources": "Źródła danych",
    "Models & Agents": "Modele i agenci",
    "LLM Operations": "Operacje LLM",
    "Files & Knowledge": "Pliki i wiedza",
    "Flow Control": "Sterowanie flow",
    "Processing": "Przetwarzanie",
    "Utilities": "Narzędzia pomocnicze",
    "Prototypes": "Prototypy",
    "Tools": "Narzędzia",
    "Agents": "Agenci",
    "Data": "Dane",
    "Logic": "Logika",
    "Helpers": "Pomocnicze",
    "Saved": "Zapisane",
    "Calculator": "Kalkulator",
    "Current Date": "Bieżąca data",
    "Python Interpreter": "Interpreter Pythona",
    "Python REPL": "Konsola Python REPL",
    "README": "Instrukcja",
    "Load your data for chat context with Retrieval Augmented Generation.":
      "Załaduj dane jako kontekst czatu przy użyciu Retrieval Augmented Generation.",
  }),
);

const WORD_PL = [
  ["Application", "aplikacji"],
  ["Advanced", "zaawansowane"],
  ["Allow", "zezwól"],
  ["API", "API"],
  ["Async", "asynchroniczne"],
  ["Base", "baza"],
  ["Cache", "buforuj"],
  ["Chat", "czat"],
  ["Check", "sprawdź"],
  ["Collection", "kolekcja"],
  ["Component", "komponent"],
  ["Content", "treść"],
  ["Create", "utwórz"],
  ["DataFrame", "DataFrame"],
  ["Data", "dane"],
  ["Delete", "usuń",
  ],
  ["Directory", "katalog"],
  ["Document", "dokument"],
  ["Documents", "dokumenty"],
  ["Download", "pobierz"],
  ["Embedding", "embedding"],
  ["Enable", "włącz"],
  ["Endpoint", "endpoint"],
  ["Error", "błąd"],
  ["Errors", "błędy"],
  ["Extract", "wyodrębnij"],
  ["Field", "pole"],
  ["Fields", "pola"],
  ["File", "plik"],
  ["Files", "pliki"],
  ["Filter", "filtr"],
  ["Flow", "flow"],
  ["Format", "format"],
  ["Generate", "wygeneruj"],
  ["Hidden", "ukryte"],
  ["Ignore", "ignoruj"],
  ["Input", "wejście"],
  ["Inputs", "wejścia"],
  ["Key", "klucz"],
  ["Language", "język"],
  ["Limit", "limit"],
  ["Load", "wczytaj"],
  ["Loaded", "wczytane"],
  ["Loading", "ładowanie"],
  ["Max", "maks."],
  ["Memory", "pamięć"],
  ["Message", "wiadomość"],
  ["Messages", "wiadomości"],
  ["Metadata", "metadane"],
  ["Model", "model"],
  ["Name", "nazwa"],
  ["Number", "liczba"],
  ["Output", "wyjście"],
  ["Outputs", "wyjścia"],
  ["Page", "strona"],
  ["Path", "ścieżka"],
  ["Prompt", "prompt"],
  ["Query", "zapytanie"],
  ["Read", "odczytaj"],
  ["Recursive", "rekurencyjne"],
  ["Result", "wynik"],
  ["Results", "wyniki"],
  ["Save", "zapisz"],
  ["Search", "wyszukiwanie"],
  ["Select", "wybierz"],
  ["Server", "serwer"],
  ["Session", "sesja"],
  ["Settings", "ustawienia"],
  ["Size", "rozmiar"],
  ["Source", "źródło"],
  ["Status", "status"],
  ["Store", "magazyn"],
  ["Text", "tekst"],
  ["Timeout", "limit czasu"],
  ["Token", "token"],
  ["Tool", "narzędzie"],
  ["Type", "typ"],
  ["URL", "URL"],
  ["URLs", "URL-e"],
  ["Update", "aktualizuj"],
  ["Upload", "prześlij"],
  ["Use", "użyj"],
  ["Value", "wartość"],
  ["Vector", "wektorowy"],
  ["Write", "zapisz"],
];

function getComponentTextKey(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function shouldCollectString(value, parentKey) {
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (!text || text.length > 280) return false;
  if (/^https?:\/\//i.test(text)) return false;
  if (/^[a-z0-9_.-]+$/i.test(text) && !/[A-Z]/.test(text)) return false;
  if (/^\{.*\}$/.test(text)) return false;
  return TRANSLATABLE_FIELDS.has(parentKey) || parentKey === "options";
}

function collectTexts(value, texts = new Set(), parentKey = "") {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectTexts(item, texts, parentKey);
    }
    return texts;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (shouldCollectString(child, key)) {
        texts.add(child.trim());
      } else if (
        key === "options" &&
        Array.isArray(child) &&
        child.every((option) => typeof option === "string")
      ) {
        for (const option of child) {
          if (
            option.length <= 40 &&
            (/^[A-Z]/.test(option) || option.includes(" "))
          ) {
            texts.add(option.trim());
          }
        }
      } else {
        collectTexts(child, texts, key);
      }
    }
  }

  return texts;
}

function heuristicTranslate(text) {
  if (EXACT_PL.has(text)) return EXACT_PL.get(text);

  let result = text;
  for (const [source, target] of WORD_PL) {
    result = result.replace(new RegExp(`\\b${source}\\b`, "g"), target);
  }

  result = result
    .replace(/\bIf enabled\b/g, "Jeśli włączone")
    .replace(/\bIf true\b/g, "Jeśli prawda")
    .replace(/\bThe\b/g, "")
    .replace(/\bthe\b/g, "")
    .replace(/\bto\b/g, "do")
    .replace(/\bfrom\b/g, "z")
    .replace(/\bfor\b/g, "dla")
    .replace(/\bwith\b/g, "z")
    .replace(/\bin\b/g, "w")
    .replace(/\s+/g, " ")
    .trim();

  if (result === text) return text;
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

if (!fs.existsSync(componentIndexPath)) {
  throw new Error(`Component index not found: ${componentIndexPath}`);
}

const componentIndex = readJson(componentIndexPath);
const en = readJson(enPath);
const pl = readJson(plPath);

en.componentTexts = en.componentTexts ?? {};
pl.componentTexts = pl.componentTexts ?? {};

const texts = [...collectTexts(componentIndex)].sort((a, b) =>
  getComponentTextKey(a).localeCompare(getComponentTextKey(b)),
);

let addedEn = 0;
let addedPl = 0;

for (const text of texts) {
  const key = getComponentTextKey(text);
  if (!key) continue;

  if (!(key in en.componentTexts)) {
    en.componentTexts[key] = text;
    addedEn += 1;
  }

  if (!(key in pl.componentTexts)) {
    pl.componentTexts[key] = heuristicTranslate(text);
    addedPl += 1;
  }
}

en.componentTexts = Object.fromEntries(
  Object.entries(en.componentTexts).sort(([a], [b]) => a.localeCompare(b)),
);
pl.componentTexts = Object.fromEntries(
  Object.entries(pl.componentTexts).sort(([a], [b]) => a.localeCompare(b)),
);

writeJson(enPath, en);
writeJson(plPath, pl);

console.log(
  `componentTexts updated: ${texts.length} source texts, ${addedEn} en added, ${addedPl} pl added`,
);
