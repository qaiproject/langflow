// =============================================================================
// CustomThemeToggle — Sun/Moon icon button toggling light/dark theme.
// -----------------------------------------------------------------------------
// Mirrors the Qosmo.chat (Next.js) + Qosmo.auth (Keycloak login) theme
// toggles. Uses Langflow upstream `useDarkStore` for state persistence AND
// explicitly toggles `document.body.classList`/`documentElement.classList`
// because upstream's `useTheme` hook (in appHeaderComponent) doesn't always
// react to store changes from outside its own toggle path.
//
// Effect: clicking flips `.dark` class on <html> and <body>, which cascades
// through Langflow's Tailwind dark: variants AND our HSL var overrides in
// branding/overrides/langflow.css. Persisted via useDarkStore.
// =============================================================================
import { useDarkStore } from "@/stores/darkStore";

const SUN_SVG = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="4"/>
  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
</svg>`;

const MOON_SVG = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>`;

/**
 * Apply the dark/light class to <html> + <body>. Langflow's index.html ships
 * with `class="dark"` on <body> by default, so we need both elements for the
 * Tailwind `dark:` variants AND our `--qosmoai-*-hsl` overrides to cascade.
 */
function applyThemeClass(dark: boolean) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const body = document.body;
  if (dark) {
    html.classList.add("dark");
    body.classList.add("dark");
    html.classList.remove("light");
    body.classList.remove("light");
    html.setAttribute("data-theme", "dark");
  } else {
    html.classList.remove("dark");
    body.classList.remove("dark");
    html.classList.add("light");
    body.classList.add("light");
    html.setAttribute("data-theme", "light");
  }
}

export default function CustomThemeToggle() {
  const dark = useDarkStore((state) => state.dark);
  const setDark = useDarkStore((state) => state.setDark);

  // IMPORTANT: no useEffect that auto-syncs DOM class on mount.
  // Reason: zustand `dark` defaults to `false`, but Langflow's
  // `<body class="dark">` (from index.html) renders the page dark on first
  // paint. Force-syncing on mount would override the natural dark bootstrap
  // and flip the page to light before the user has touched anything.
  // We only toggle on explicit click instead.
  //
  // We write BOTH localStorage keys:
  //  - `isDark`           → read by zustand darkStore + App.tsx body sync
  //  - `themePreference`  → read by use-custom-theme.ts on AppHeader mount
  // If we only wrote `isDark`, useTheme would still default to system theme
  // on refresh and flip dark/light back to the OS preference.
  const handleClick = () => {
    const next = !dark;
    applyThemeClass(next);
    setDark(next);
    try {
      window.localStorage.setItem("isDark", String(next));
      window.localStorage.setItem("themePreference", next ? "dark" : "light");
    } catch (e) {
      // localStorage blocked — DOM + zustand still updated for current session.
    }
  };

  return (
    <button
      type="button"
      className="qosmoai-topbar-icon"
      aria-label={dark ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
      title={dark ? "Jasny motyw" : "Ciemny motyw"}
      onClick={handleClick}
      // When dark = SUN (clicking switches TO light).
      // When light = MOON (clicking switches TO dark).
      dangerouslySetInnerHTML={{ __html: dark ? SUN_SVG : MOON_SVG }}
    />
  );
}
