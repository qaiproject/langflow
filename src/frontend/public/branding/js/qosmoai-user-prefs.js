/* ============================================================================
 * QOSMO USER PREFERENCES -- shared client across all 4 apps
 * ----------------------------------------------------------------------------
 * Cel: jeden cookie `qosmoai_user` zawiera identity (display_name, avatar_url) +
 * UI prefs (theme, accent, text_size). Cookie ma Domain ustawione na shared
 * parent (`.qosmo.example.com` na prod, `localhost` na dev) wiec wszystkie
 * 4 apki widza ten sam stan bez backendu, bez CORS, bez tokenu.
 *
 * Kto pisze: TYLKO Qosmo.chat (Next.js) — po loginie z Keycloak claims i
 * z Settings panel. Pozostale apki tylko czytaja i aplikuja do DOM.
 *
 * UWAGA: cookie jest do DISPLAY ONLY. Uprawnienia (kim user faktycznie jest,
 * czy ma dostep do zasobow) ida przez Keycloak token / oauth2-proxy header
 * — to jest osobna warstwa. Cookie mozna sfalszowac w DevTools i nadal
 * user nie dostanie wiekszych uprawnien niz ma w tokenie.
 *
 * API:
 *   QosmoaiUser.read()                 -> { display_name, avatar_url, theme, ... }
 *   QosmoaiUser.write({ theme: ... })  -> patch + apply + broadcast
 *   QosmoaiUser.apply(prefs)           -> applies theme/accent/text_size do DOM
 *   QosmoaiUser.getDisplayName()       -> shortcut
 *   QosmoaiUser.getAvatar()            -> shortcut (URL or null)
 *   QosmoaiUser.getTheme()             -> "dark" | "light"
 *   QosmoaiUser.getAccent()            -> "indigo" | "wisteria" | ...
 *   QosmoaiUser.getTextSize()          -> "sm" | "md" | "lg"
 *   QosmoaiUser.onChange(cb)           -> sub do cross-tab updates
 * ============================================================================ */
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  if (window.QosmoaiUser) return; // idempotent: wielokrotne includes są OK

  var COOKIE_NAME = "qosmoai_user";
  var COOKIE_VERSION = 1;
  var COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dni
  var DEFAULTS = {
    display_name: "User",
    avatar_url: null,
    theme: "dark",          // "dark" | "light"
    accent: "indigo",       // jeden z 8 kolorow palety --qosmoai-c-*
    text_size: "md",        // "sm" | "md" | "lg"
    v: COOKIE_VERSION,
  };

  // ── Cookie helpers ──────────────────────────────────────────────────
  function getCookieDomain() {
    var host = location.hostname || "";
    // localhost (dev): domain=localhost obejmuje wszystkie porty
    if (host === "localhost" || host === "127.0.0.1") return "localhost";
    // IP w sieci lokalnej — host-only (bez Domain attr)
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
    // prod: leading dot + ostatnie 2 segmenty (qosmo.example.com)
    var parts = host.split(".");
    if (parts.length < 2) return null;
    return "." + parts.slice(-2).join(".");
  }

  function readCookie() {
    var match = (" " + document.cookie).match(
      new RegExp("(?:^|; )" + COOKIE_NAME + "=([^;]*)")
    );
    if (!match) return Object.assign({}, DEFAULTS);
    try {
      var parsed = JSON.parse(decodeURIComponent(match[1]));
      // Forward-compatible: missing fields wpadaja w defaults
      return Object.assign({}, DEFAULTS, parsed);
    } catch (e) {
      console.warn("[QosmoaiUser] cookie parse failed, falling back to defaults", e);
      return Object.assign({}, DEFAULTS);
    }
  }

  function writeCookie(prefs) {
    var domain = getCookieDomain();
    var payload = encodeURIComponent(JSON.stringify(prefs));
    var attrs =
      "; Path=/; SameSite=Lax; Max-Age=" + COOKIE_MAX_AGE +
      (domain ? "; Domain=" + domain : "") +
      (location.protocol === "https:" ? "; Secure" : "");
    document.cookie = COOKIE_NAME + "=" + payload + attrs;
  }

  // ── DOM apply ────────────────────────────────────────────────────────
  // Mapowanie text_size -> root font-size (Tailwind/shadcn potem skaluje rem).
  var TEXT_SIZE_PX = { sm: 13, md: 14, lg: 16 };

  function apply(prefs) {
    if (typeof document === "undefined") return;
    var root = document.documentElement;
    var body = document.body;

    // Theme: dark/light class na html + body. ALE: jezeli localStorage.theme
    // jest juz ustawione (przez next-themes / inny ThemeProvider), niech ten
    // wygrywa - my tylko USTAWIAMY DEFAULT przy pierwszej wizycie. To unika
    // race condition gdzie qosmoai-user-prefs odpala sie przed hydration i nadpisuje
    // wybor uzytkownika.
    var lsTheme = null;
    try { lsTheme = localStorage.getItem("theme"); } catch (_) {}
    if (!lsTheme || (lsTheme !== "dark" && lsTheme !== "light")) {
      var dark = prefs.theme === "dark";
      root.classList.toggle("dark", dark);
      root.classList.toggle("light", !dark);
      root.setAttribute("data-theme", dark ? "dark" : "light");
      if (body) {
        body.classList.toggle("dark", dark);
        body.classList.toggle("light", !dark);
      }
    }

    // Accent color: setuje --qosmoai-app-accent ktore mapuje na konkretna
    // palette zmienna. To override koloru per-app accent (np. Langflow ma
    // domyslnie wisteria, user moze wybrac inny).
    if (prefs.accent) {
      root.style.setProperty(
        "--qosmoai-app-accent",
        "var(--qosmoai-c-" + prefs.accent + ")"
      );
      // Suffix color (Qosmo.flow / .chat / .docs etc) tez idzie z accent
      // chyba ze jest osobno per-app. Tu zostawiamy app-default jako fallback.
    }

    // Text size: data-text-size na html, CSS overrides moga sczytac przez
    // [data-text-size="sm"] body { font-size: ...; } albo Tailwind plugin.
    root.setAttribute("data-text-size", prefs.text_size || "md");
    var px = TEXT_SIZE_PX[prefs.text_size] || 14;
    root.style.fontSize = px + "px";
  }

  // ── Cross-tab sync ───────────────────────────────────────────────────
  var bc = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel("qosmoai_user");
      bc.onmessage = function (e) {
        var next = e && e.data;
        if (next && typeof next === "object") {
          apply(next);
          notifyChange(next);
        }
      };
    } catch (e) {
      // browser bez BC -> ignoruj
    }
  }

  // Subscriber list (in-process, dla user-card komponentow ktore chca
  // re-renderowac sie po zmianie display_name/avatar).
  var subs = [];
  function notifyChange(prefs) {
    for (var i = 0; i < subs.length; i++) {
      try { subs[i](prefs); } catch (e) { console.error("[QosmoaiUser] sub error", e); }
    }
  }

  // ── Public API ───────────────────────────────────────────────────────
  var QosmoaiUser = {
    DEFAULTS: DEFAULTS,
    COOKIE_NAME: COOKIE_NAME,

    read: readCookie,

    write: function (patch) {
      var next = Object.assign(readCookie(), patch || {}, { v: COOKIE_VERSION });
      writeCookie(next);
      apply(next);
      if (bc) {
        try { bc.postMessage(next); } catch (e) {}
      }
      notifyChange(next);
      return next;
    },

    apply: apply,

    getDisplayName: function () { return readCookie().display_name; },
    getAvatar:      function () { return readCookie().avatar_url; },
    getTheme:       function () { return readCookie().theme; },
    getAccent:      function () { return readCookie().accent; },
    getTextSize:    function () { return readCookie().text_size; },

    onChange: function (cb) {
      if (typeof cb !== "function") return function () {};
      subs.push(cb);
      return function unsubscribe() {
        var idx = subs.indexOf(cb);
        if (idx >= 0) subs.splice(idx, 1);
      };
    },
  };

  // ----- next-themes bridge (Langfuse, Next.js, Langflow) -----------
  // next-themes uses localStorage["theme"] + <html class="dark|light">.
  // REVERSE SYNC: my tylko OBSERWUJEMY zmiany themu (przez next-themes lub
  // inny ThemeProvider) i syncujemy do cookie qosmoai_user. NIE forsujemy z
  // cookie - aplikacje zarzadzaja themem same, my reflectujemy.
  //
  //   1. PRZY STARCIE: jezeli cookie pusty/default i localStorage ma value,
  //      syncuj localStorage->cookie (cookie nadgania).
  //   2. MutationObserver na <html class> - gdy .dark/.light zmienia, write
  //      cookie. To lapie zmiany w SAMEJ KARCIE (storage event tego nie robi).
  //   3. 'storage' event - syncuje zmiane z innej karty/okna.
  function bridgeNextThemes() {
    if (typeof localStorage === "undefined") return;
    try {
      // 1. Initial: localStorage -> cookie (jezeli ls ma value)
      var ls = localStorage.getItem("theme");
      if ((ls === "dark" || ls === "light") && ls !== readCookie().theme) {
        QosmoaiUser.write({ theme: ls });
      }

      // 2. MutationObserver na html.classList - lapie zmiane themu w tej karcie
      var root = document.documentElement;
      var lastTheme = root.classList.contains("dark") ? "dark" : "light";
      var obs = new MutationObserver(function () {
        var current = root.classList.contains("dark") ? "dark" : "light";
        if (current !== lastTheme) {
          lastTheme = current;
          // Sync cookie + localStorage zeby byly spojne
          if (current !== readCookie().theme) QosmoaiUser.write({ theme: current });
          try { if (localStorage.getItem("theme") !== current) localStorage.setItem("theme", current); } catch (_) {}
        }
      });
      obs.observe(root, { attributes: true, attributeFilter: ["class"] });

      // 3. Storage event z innej karty
      window.addEventListener("storage", function (e) {
        if (e.key === "theme" && e.newValue && e.newValue !== readCookie().theme) {
          QosmoaiUser.write({ theme: e.newValue });
        }
      });
    } catch (e) { /* private mode -> ignore */ }
  }

  // ----- 5-tile app switcher modal (Qosmo Premise launcher) ---------
  // Ten sam pattern co w Qosmo.chat, Keycloak (qosmo-topbar.js), Langflow
  // (CustomAppSwitcher). Vanilla JS, idzie do <body> przez portal-style mount.
  // App-switcher trigger icon - DOKLADNIE lucide LayoutGrid (4 kwadraty 2x2)
  // z identycznymi atrybutami co _SVG helper (stroke-width=1.7, width=18).
  // Klasy CSS .qosmoai-app-switcher-* + .qosmoai-topbar-icon sa w components.css.
  // Definicja stringiem (NIE _SVG()) bo _SVG nie jest jeszcze hoistowany
  // przy var-initialization (JS hoists declarations, nie values).
  // Pelne Qosmo wordmark (Q-sygnet + o-s-m-o), 5 paths z branding/logo/logo_white.svg.
  // Poprzednio mial tylko sygnet+V (path obciety przy edycji virtiofs).
  var QOSMO_BASE_SVG =
    '<svg width="100%" height="100%" viewBox="0 0 538.89 141.73" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="display:block">' +
      '<path fill="currentColor" d="M76.34,79.69v50.07h50.07l-17.48-17.48c10.8-10.8,17.48-25.71,17.48-42.18,0-32.95-26.71-59.66-59.66-59.66S7.1,37.16,7.1,70.11s26.71,59.66,59.66,59.66v-21.31c-21.18,0-38.35-17.17-38.35-38.35s17.17-38.35,38.35-38.35,38.35,17.17,38.35,38.35c0,10.59-4.29,20.18-11.23,27.12l-17.53-17.53Z"/>' +
      '<path fill="currentColor" d="M219.51,87.7c0,24.47-18.57,42.3-42.3,42.3s-42.15-17.98-42.15-42.3,18.86-42.3,42.15-42.3,42.3,17.83,42.3,42.3ZM156.28,87.7c0,13.41,9.14,22.25,20.93,22.25s20.93-8.84,20.93-22.25-9.14-22.25-20.93-22.25-20.93,8.99-20.93,22.25Z"/>' +
      '<path fill="currentColor" d="M226.7,101.55h21.37c1.62,6.48,6.48,10.91,19.6,10.91,9.29,0,13.71-2.21,13.71-6.63,0-5.45-6.34-5.9-18.57-8.84-22.99-5.45-32.42-10.61-32.42-24.61,0-17.1,14.15-26.97,35.52-26.97,22.55,0,33.6,10.91,36.4,25.94h-21.37c-1.62-5.16-6.04-8.25-15.77-8.25-8.4,0-13.56,2.36-13.56,6.78,0,3.83,3.68,4.57,15.48,7.22,23.14,5.31,36.11,9.73,36.11,25.94,0,18.13-16.06,26.97-36.11,26.97-21.66,0-37.43-10.61-40.38-28.44Z"/>' +
      '<path fill="currentColor" d="M437.7,78.23v51.29h-21.08v-46.72c0-10.32-3.83-16.06-14-16.06-11.05,0-16.8,7.37-16.8,20.19v42.59h-21.08v-46.72c0-10.32-3.83-16.06-14-16.06-11.05,0-16.95,7.37-16.95,20.19l.15,42.59h-21.22V48.46h21.22v10.76c5.75-8.11,13.41-12.53,24.02-12.53,11.64,0,20.19,5.45,24.61,15.33,5.9-9.58,15.18-15.33,27.12-15.33,17.24,0,28,11.94,28,31.54Z"/>' +
      '<path fill="currentColor" d="M531.35,88.98c0,24.47-18.57,42.3-42.3,42.3s-42.15-17.98-42.15-42.3,18.86-42.3,42.15-42.3,42.3,17.83,42.3,42.3ZM468.12,88.98c0,13.41,9.14,22.25,20.93,22.25s20.93-8.84,20.93-22.25-9.14-22.25-20.93-22.25-20.93,8.99-20.93,22.25Z"/>' +
    '</svg>';
  // Per-app icons - DOKLADNE lucide SVG paths zgodne z lucide-react@0.x
  // uzywanymi w frontend/src/components/right_panel/AppSwitcher.tsx (Next.js)
  // i langflow-src/customization/components/custom-app-switcher.tsx (Langflow).
  // SSOT: ikony tutaj = ikony tam = identycznosc cross-app.
  // - chat:   MessageSquare
  // - flow:   Workflow
  // - tracer: Activity
  // - docs:   Folder
  // - auth:   Shield
  // Common attrs: viewBox 24x24, stroke-width=1.7 (DOKLADNIE jak Next.js
  // AppSwitcher.tsx renderuje <Icon strokeWidth={1.7} />, NIE lucide default 2).
  // Width/height NIE ustawiamy w SVG - sterowane z zewnatrz (CSS klasa
  // .qosmoai-app-tile-icon / .qosmoai-topbar-icon nadaja sizing 18px-24px).
  // KRYTYCZNE: xmlns MUSI byc bo bez tego innerHTML parsuje <svg> jako
  // HTMLUnknownElement zamiast SVGSVGElement -> width-attribute zostaje
  // zignorowany (height tak, width nie - browser bug). Tile icons dzialaja
  // bo flex parent narzuca size, ale trigger/close polegajace na SVG-owej
  // szerokosci wisza z 0px.
  // KRYTYCZNE: SVG inline default + flex parent czasem squeeze SVG do width:0
  // (height OK). Forsujemy style="display:block;width:18px;height:18px;flex-shrink:0"
  // zeby SVG zawsze byl 18x18 niezaleznie od parent layout.
  var _SVG = function (paths) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:block;width:18px;height:18px;flex-shrink:0">' + paths + '</svg>';
  };
  // X close icon (size=18 strokeWidth=1.6, identyczne z <X size={18} strokeWidth={1.6}/> w Next.js)
  var ICON_X = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;width:18px;height:18px;flex-shrink:0"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  var ICON_CHAT   = _SVG('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>');
  var ICON_FLOW   = _SVG('<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>');
  var ICON_TRACER = _SVG('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>');
  var ICON_DOCS   = _SVG('<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>');
  var ICON_AUTH   = _SVG('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>');
  // Lucide icons dla topbar (Bell, Download, Moon/Sun, Calendar)
  var ICON_BELL     = _SVG('<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>');
  var ICON_DOWNLOAD = _SVG('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>');
  var ICON_MOON     = _SVG('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>');
  var ICON_SUN      = _SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>');
  var ICON_CALENDAR = _SVG('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>');
  var ICON_SIDEBAR_TOGGLE = _SVG('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>');
  // LayoutGrid (lucide) - app-switcher trigger icon
  var APP_SWITCHER_ICON = _SVG('<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>');

  // ----- Per-app wordmark SVG loader (z cache) -----------------------
  // Per-app SVG-ki (branding/logo/apps/qosmo-{app}.svg) maja juz wewnatrz
  // .qosmoai-base (Qosmo wordmark, currentColor) + .qosmoai-suffix (suffix .chat/.flow/...
  // kolorowany przez var(--qosmoai-suffix-color)). Wczytujemy je raz, cachujemy
  // w pamieci, swap-in do DOM async (modal shell renderowany synchronicznie,
  // SVG dolaczany gdy fetch zakonczony - ~5-50ms).
  var WORDMARK_CACHE = {};
  function loadWordmark(appId) {
    if (appId in WORDMARK_CACHE) return Promise.resolve(WORDMARK_CACHE[appId]);
    return fetch("/branding/logo/apps/qosmo-" + appId + ".svg", { cache: "force-cache" })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (svg) {
        if (!svg) return null;
        // Strip XML declaration <?xml ?> bo psuje innerHTML parsing
        svg = svg.replace(/^\s*<\?xml[^?]*\?>\s*/, "");
        WORDMARK_CACHE[appId] = svg;
        return svg;
      })
      .catch(function () { return null; });
  }
  function preloadWordmarks() {
    ["chat", "flow", "tracer", "docs", "auth"].forEach(function (a) { loadWordmark(a); });
  }
  // Helper: po wstrzykinieciu SVG ustawia height + width auto + color z tokena
  function sizeWordmark(svgEl, heightPx, baseColor) {
    if (!svgEl) return;
    svgEl.setAttribute("height", String(heightPx));
    svgEl.removeAttribute("width"); // height + viewBox auto-scaluje width
    svgEl.style.height = heightPx + "px";
    svgEl.style.width = "auto";
    svgEl.style.display = "block";
    svgEl.style.color = baseColor || "var(--qosmoai-text-bright)";
  }

  // APPS - opisy i nazwy MUSZA matchowac Next.js AppSwitcher.tsx (SSOT data).
  // Polskie znaki sa tu w UTF-8 - plik powinien byc serwowany z charset=UTF-8.
  var APPS = [
    { id: "chat",   suffix: ".chat",   desc: "Czat z modelami i agentami",   accent: "var(--qosmoai-app-chat)",   localPort: 3000, icon: ICON_CHAT   },
    { id: "flow",   suffix: ".flows",  desc: "Studio przepływów agentowych", accent: "var(--qosmoai-app-flow)",   localPort: 7860, icon: ICON_FLOW   },
    { id: "tracer", suffix: ".tracer", desc: "Obserwowalność LLM",           accent: "var(--qosmoai-app-tracer)", localPort: 3100, icon: ICON_TRACER },
    { id: "docs",   suffix: ".docs",   desc: "Repozytorium plików",          accent: "var(--qosmoai-app-docs)",   localPort: 8333, icon: ICON_DOCS   },
    { id: "auth",   suffix: ".auth",   desc: "Zarządzanie tożsamością",      accent: "var(--qosmoai-app-auth)",   localPort: 8080, icon: ICON_AUTH,  pathPrefix: "/realms/qai/account/" },
  ];
  var SUBDOMAIN_MAP = { chat: "chat", flow: "flows", tracer: "tracer", docs: "docs", auth: "auth" };

  function resolveAppUrl(app) {
    var host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || /^192\.168\.|^10\.|^172\./.test(host)) {
      return "http://localhost:" + app.localPort + (app.pathPrefix || "/");
    }
    var parts = host.split(".");
    if (parts.length < 2) return "http://localhost:" + app.localPort + "/";
    parts[0] = SUBDOMAIN_MAP[app.id];
    return location.protocol + "//" + parts.join(".") + (app.pathPrefix || "/");
  }

  function detectCurrentApp() {
    // 1. BODY CLASS - najmocniejszy marker, ustawiany per-app w HTML root
    //    (Keycloak: <body class="qosmoai-app-auth">, Langflow custom-header
    //    dodaje qosmoai-app-flow do body, Langfuse _document.tsx → app-tracer,
    //    Next.js layout root → qosmoai-app-chat). Match ZAWSZE odzwierciedla
    //    aktualnie zaladowana apke, niezaleznie od linkow w breadcrumbie/cache.
    var bc = (document.body && document.body.className) || "";
    var m = bc.match(/qosmoai-app-(chat|flow|tracer|docs|auth)\b/);
    if (m) return m[1];

    // 2. JS GLOBAL window.__QOSMO_APP__ - opcjonalny override hostowy
    if (typeof window !== "undefined" && window.__QOSMO_APP__) {
      var g = String(window.__QOSMO_APP__).toLowerCase();
      if (g === "chat" || g === "flow" || g === "tracer" || g === "docs" || g === "auth") return g;
      if (g === "flows") return "flow";
    }

    // 3. HOSTNAME / PORT fallback dla local dev + prod subdomeny
    var h = location.hostname; var p = location.pathname;
    if (h === "localhost") {
      var port = location.port;
      if (port === "3000") return "chat";
      if (port === "7860") return "flow";
      if (port === "3100") return "tracer";
      if (port === "8333") return "docs";
      if (port === "8080") return "auth";
    }
    var sub = (h.split(".")[0] || "").toLowerCase();
    if (sub === "chat") return "chat";
    if (sub === "flows" || sub === "flow") return "flow";
    if (sub === "tracer") return "tracer";
    if (sub === "docs") return "docs";
    if (sub === "auth") return "auth";
    if (/^\/(admin|realms)\b/.test(p)) return "auth";
    return null;
  }

  function buildAppSwitcherModal() {
    var current = detectCurrentApp();
    var overlay = document.createElement("div");
    overlay.className = "qosmoai-app-switcher-overlay";
    overlay.setAttribute("role", "presentation");
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeAppSwitcher();
    });
    var modal = document.createElement("div");
    modal.className = "qosmoai-app-switcher";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-label", "Aplikacje Qosmo");
    // Render shell synchronicznie - .qosmoai-wordmark slot pusty (placeholder),
    // SVG wstawiamy async po fetch (data-app="<id>" zeby trafic odpowiedni slot).
    // Header dostaje QOSMO_BASE_SVG inline (pelne wordmark "Qosmo" bez suffixu).
    modal.innerHTML =
      '<div class="qosmoai-app-switcher-header">' +
        '<span class="qosmoai-wordmark" style="display:inline-flex;height:28px;color:var(--qosmoai-text-bright)">' + QOSMO_BASE_SVG + '</span>' +
        '<div class="qosmoai-app-switcher-header-spacer"></div>' +
        '<button type="button" class="qosmoai-app-switcher-close" aria-label="Zamknij">' + ICON_X + '</button>' +
      '</div>' +
      '<div class="qosmoai-app-switcher-grid">' +
        APPS.map(function (a) {
          var active = a.id === current;
          var url = resolveAppUrl(a);
          // Per-app SVG (qosmo-{id}.svg) ma JUZ .qosmoai-base (Qosmo wordmark
          // currentColor) + .qosmoai-suffix (suffix kolorowany var(--qosmoai-suffix-color)).
          // Ustawiamy --qosmoai-suffix-color: var(--qosmoai-tile-color) na tile-name,
          // co kaskaduje do SVG -> suffix ma kolor per-app.
          return '<a href="' + url + '" class="qosmoai-app-tile ' + (active ? "qosmoai-app-tile-active" : "") + '" data-app="' + a.id + '" style="--qosmoai-tile-color:' + a.accent + '">' +
            '<div class="qosmoai-app-tile-icon">' + (a.icon || '') + '</div>' +
            '<div class="qosmoai-app-tile-name" style="--qosmoai-suffix-color:var(--qosmoai-tile-color);color:var(--qosmoai-text-bright)">' +
              '<span class="qosmoai-wordmark qosmoai-wordmark-slot" data-app="' + a.id + '" style="display:inline-flex;height:30px"></span>' +
            '</div>' +
            '<div class="qosmoai-app-tile-desc">' + a.desc + '</div>' +
            (active ? '<div class="qosmoai-app-tile-badge">aktualna</div>' : '') +
          '</a>';
        }).join("") +
      '</div>' +
      '<div class="qosmoai-app-switcher-foot">QOSMO PREMISE</div>';
    modal.querySelector(".qosmoai-app-switcher-close").addEventListener("click", closeAppSwitcher);
    overlay.appendChild(modal);

    // Async swap-in per-app SVG do kazdego tile-slotu
    APPS.forEach(function (a) {
      loadWordmark(a.id).then(function (svg) {
        if (!svg) return;
        var slot = modal.querySelector('.qosmoai-wordmark-slot[data-app="' + a.id + '"]');
        if (!slot) return;
        slot.innerHTML = svg;
        sizeWordmark(slot.querySelector("svg"), 20, "var(--qosmoai-text-bright)");
      });
    });
    return overlay;
  }

  var currentOverlay = null;
  function openAppSwitcher() {
    if (currentOverlay) return;
    currentOverlay = buildAppSwitcherModal();
    document.body.appendChild(currentOverlay);
  }
  function closeAppSwitcher() {
    if (currentOverlay && currentOverlay.parentNode) {
      currentOverlay.parentNode.removeChild(currentOverlay);
    }
    currentOverlay = null;
  }
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAppSwitcher();
  });

  function mountAppSwitcherTrigger() {
    if (document.getElementById("qosmoai-app-switcher-trigger")) return;
    var btn = document.createElement("button");
    btn.id = "qosmoai-app-switcher-trigger";
    btn.type = "button";
    btn.setAttribute("aria-label", "Aplikacje Qosmo");
    btn.className = "qosmoai-topbar-icon";
    // Fallback only - gdy topbar nie powstal (login page). Klasa .qosmoai-topbar-icon
    // daje SSOT styling, my dorzucamy TYLKO position:fixed override.
    btn.style.cssText = "position:fixed;top:10px;right:14px;z-index:9998;";
    btn.innerHTML = APP_SWITCHER_ICON;
    btn.addEventListener("click", openAppSwitcher);
    document.body.appendChild(btn);
  }

  // ----- User-card sync (Langfuse, Langflow, generic) ----------------
  // Po Reactowym renderze user-card, podmieniamy wyswietlana nazwe/email
  // na te z cookie (jesli user zalogowany w Qosmo.chat). MutationObserver
  // bo Langfuse renderuje user-card po async fetch /api/auth/session.
  function mountUserCardSync() {
    var displayName = QosmoaiUser.getDisplayName();
    if (!displayName || displayName === "User") return; // brak cookie -> nic nie podmieniamy

    function tryUpdate() {
      // Langfuse pattern: <button class="..."><span>Dev Qosmo</span><span>dev@qosmo.local</span></button>
      // Albo div z data-testid lub aria-label. Probujemy kilka selectorow.
      var probes = [
        '[data-testid="user-name"]',
        '[data-testid="sidebar-user-name"]',
        '[aria-label*="user" i] span',
        'button[class*="user"] span',
      ];
      for (var i = 0; i < probes.length; i++) {
        var el = document.querySelector(probes[i]);
        if (el && el.textContent && el.textContent !== displayName) {
          el.textContent = displayName;
          return true;
        }
      }
      return false;
    }

    if (tryUpdate()) return;
    // Wait for React render via MutationObserver, max 10s
    var obs = new MutationObserver(function () {
      if (tryUpdate()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 10000);
  }

  // ----- Langfuse sidebar brand injection ----------------------------
  // Wordmark idzie do SIDEBAR HEADER (nie topbar). Selektor:
  // [data-sidebar="header"] - z badania DOM 2026-06-01. Tam siedzi
  // wczesniej v3.160.0 EE badge. Wstawiamy nasz wordmark JAKO PIERWSZE
  // dziecko (na samej gorze), v3.160.0 zostaje pod spodem.
  // Idempotentne: probe '.qosmoai-langfuse-sidebar-brand' guard.
  function mountLangfuseSidebarBrand() {
    function tryMount() {
      var sidebarHeader = document.querySelector('[data-sidebar="header"]');
      if (!sidebarHeader) return false;
      if (sidebarHeader.querySelector('.qosmoai-langfuse-sidebar-brand')) return true;

      // Per-app SVG (qosmo-tracer.svg) zawiera juz pelne "Qosmo .tracer"
      // wordmark z .qosmoai-base (Qosmo, currentColor) + .qosmoai-suffix (.tracer,
      // var(--qosmoai-suffix-color)). Wstawiamy do brand jako shell, async
      // swap-in po fetch. CSS var --qosmoai-suffix-color kaskaduje z parent.
      // CSS w langfuse.css ukrywa brand gdy sidebar collapsed (data-state).
      var brand = document.createElement("div");
      brand.className = "qosmoai-langfuse-sidebar-brand";
      // padding z --qosmoai-sidebar-header-padding, color z token (SSOT)
      brand.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:var(--qosmoai-sidebar-header-padding,14px 12px);line-height:1;color:var(--qosmoai-text-bright);--qosmoai-suffix-color:var(--qosmoai-app-tracer)";
      // Wordmark slot - SVG ladowany async, height z --qosmoai-sidebar-logo-height
      var wm = document.createElement("span");
      wm.className = "qosmoai-langfuse-wordmark-slot";
      wm.style.cssText = "display:inline-flex;height:var(--qosmoai-sidebar-logo-height, 28px)";
      brand.appendChild(wm);
      // Toggle sidebar button - znajduje natywny Toggle Sidebar w topbarze
      // i triggeruje jego click (Langfuse manage state collapsed/expanded).
      var toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "qosmoai-topbar-icon qosmoai-sidebar-toggle";
      toggleBtn.setAttribute("aria-label", "Zwin sidebar");
      toggleBtn.title = "Zwin/rozwin sidebar";
      toggleBtn.innerHTML = ICON_SIDEBAR_TOGGLE;
      toggleBtn.addEventListener("click", function () {
        // Natywny Langfuse toggle - znajdz button[aria-label*="Toggle Sidebar"]
        // w #page-header i symuluj click.
        var native = document.querySelector('#page-header button[aria-label*="Toggle"], #page-header button[aria-label*="Sidebar"]');
        if (native) native.click();
      });
      brand.appendChild(toggleBtn);
      sidebarHeader.insertBefore(brand, sidebarHeader.firstChild);
      loadWordmark("tracer").then(function (svg) {
        if (!svg) return;
        wm.innerHTML = svg;
        // Height z tokenu (--qosmoai-sidebar-logo-height) - jednolite cross-app
        var h = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--qosmoai-sidebar-logo-height") || "28", 10);
        sizeWordmark(wm.querySelector("svg"), h, "var(--qosmoai-text-bright)");
      });
      return true;
    }
    if (tryMount()) return;
    var obs = new MutationObserver(function () {
      if (tryMount()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 10000);
  }

  // ----- Langfuse topbar trigger + env indicator + breadcrumb prefix -
  // Topbar dostaje:
  //  1. "Tracer >" prefix do natywnego breadcrumba (Langfuse pokazuje
  //     "Organizations" / "Sessions" itp, my dodajemy "Tracer >" PRZED).
  //  2. env: production indicator (zielony dot + tekst) na prawej.
  //  3. App-switcher trigger (LayoutGrid) na samym koncu.
  function mountLangfuseTopbarTrigger() {
    function tryMount() {
      var bar = document.querySelector('#page-header div.border-b > div.flex.min-h-11');
      if (!bar) return false;
      if (bar.querySelector('#qosmoai-app-switcher-trigger')) return true;

      // 1. "Tracer >" prefix dla breadcrumba - prepend do bar gdy go nie ma
      if (!bar.querySelector('.qosmoai-tracer-prefix')) {
        var prefix = document.createElement('div');
        prefix.className = 'qosmoai-tracer-prefix';
        prefix.style.cssText = 'display:inline-flex;align-items:center;gap:6px;color:var(--text-bright);font-weight:500;font-size:14px;margin-right:4px';
        prefix.innerHTML =
          '<span style="color:var(--text-bright)">Tracer</span>' +
          '<span style="color:var(--text-dim)">›</span>';
        bar.insertBefore(prefix, bar.firstChild);
      }

      // 2. Date picker - .qosmoai-topbar-pill class z components.css (SSOT)
      if (!bar.querySelector('.qosmoai-date-picker')) {
        var datePick = document.createElement('button');
        datePick.type = 'button';
        datePick.className = 'qosmoai-topbar-pill qosmoai-date-picker';
        datePick.style.marginLeft = 'auto'; // tylko pozycja, reszta z SSOT klasy
        datePick.innerHTML = ICON_CALENDAR + '<span>Ostatnie 7 dni</span>';
        bar.appendChild(datePick);
      }

      // 3. env: production - .qosmoai-topbar-pill + .qosmoai-pill-dot + .qosmoai-pill-label/value
      if (!bar.querySelector('.qosmoai-env-indicator')) {
        var env = document.createElement('div');
        env.className = 'qosmoai-topbar-pill qosmoai-env-indicator';
        env.innerHTML =
          '<span class="qosmoai-pill-dot" style="background:#22C55E"></span>' +
          '<span class="qosmoai-pill-label">env:</span>' +
          '<span class="qosmoai-pill-value">production</span>';
        bar.appendChild(env);
      }

      // 4. Bell (notifications) - BEZ red dot, jak w flow
      if (!bar.querySelector('.qosmoai-topbar-bell')) {
        var bell = document.createElement('button');
        bell.type = 'button';
        bell.className = 'qosmoai-topbar-icon qosmoai-topbar-bell';
        bell.setAttribute('aria-label', 'Notifications');
        bell.innerHTML = ICON_BELL;
        bar.appendChild(bell);
      }

      // 5. Download (export)
      if (!bar.querySelector('.qosmoai-topbar-download')) {
        var dl = document.createElement('button');
        dl.type = 'button';
        dl.className = 'qosmoai-topbar-icon qosmoai-topbar-download';
        dl.setAttribute('aria-label', 'Export');
        dl.innerHTML = ICON_DOWNLOAD;
        bar.appendChild(dl);
      }

      // 6. Theme toggle (moon/sun) - read aktualny theme z <html>
      if (!bar.querySelector('.qosmoai-topbar-theme')) {
        var theme = document.createElement('button');
        theme.type = 'button';
        theme.className = 'qosmoai-topbar-icon qosmoai-topbar-theme';
        theme.setAttribute('aria-label', 'Toggle theme');
        var isDark = document.documentElement.classList.contains('dark');
        theme.innerHTML = isDark ? ICON_SUN : ICON_MOON;
        theme.addEventListener('click', function () {
          // Toggle: dodaj/usun .dark na <html> + ustaw cookie qosmoai_user.theme
          var nowDark = document.documentElement.classList.toggle('dark');
          theme.innerHTML = nowDark ? ICON_SUN : ICON_MOON;
          try {
            QosmoaiUser.write({ theme: nowDark ? 'dark' : 'light' });
            // Synchro z next-themes localStorage tak by Langfuse zauwazyl
            localStorage.setItem('theme', nowDark ? 'dark' : 'light');
          } catch (e) {}
        });
        bar.appendChild(theme);
      }

      // 7. Trigger app-switcher (LayoutGrid) - po prawej, ostatni
      var oldTrigger = document.getElementById('qosmoai-app-switcher-trigger');
      if (oldTrigger && oldTrigger.parentNode !== bar) {
        try { oldTrigger.parentNode.removeChild(oldTrigger); } catch (e) {}
      }
      var btn = document.createElement('button');
      btn.id = 'qosmoai-app-switcher-trigger';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Aplikacje Qosmo');
      btn.title = 'Aplikacje Qosmo';
      btn.className = 'qosmoai-topbar-icon';
      btn.innerHTML = APP_SWITCHER_ICON;
      btn.addEventListener('click', openAppSwitcher);
      bar.appendChild(btn);
      return true;
    }
    if (tryMount()) return;
    var obs = new MutationObserver(function () {
      if (tryMount()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 10000);
  }

  // ----- Force active link styling (Tailwind v4 cascade override) ----
  // Niektore apki (Langfuse z Tailwind v4 @layer utilities) nadpisuja nasze
  // CSS na transparent mimo !important. Inline style wygrywa wszystko -
  // tym samym MutationObserver-em pilnujemy aktywnego linku i forsujemy go.
  function forceActiveNavStyling() {
    function applyToAll() {
      var actives = document.querySelectorAll(
        '[data-sidebar="menu-button"][data-active="true"], ' +
        '.pf-v5-c-nav__link.pf-m-current, ' +
        '.pf-v6-c-nav__link.pf-m-current, ' +
        '[aria-current="page"][data-sidebar="menu-button"]'
      );
      actives.forEach(function (el) {
        if (el.dataset.qaiActiveStyled === "1") return;
        var bg = getComputedStyle(document.documentElement).getPropertyValue("--qosmoai-nav-link-bg-active").trim();
        var accent = getComputedStyle(document.documentElement).getPropertyValue("--qosmoai-accent-hsl").trim();
        el.style.setProperty("background-color", bg || "hsl(" + accent + " / 0.12)", "important");
        el.style.setProperty("box-shadow", "inset 2px 0 0 hsl(" + accent + ")", "important");
        el.style.setProperty("color", "var(--qosmoai-text-bright)", "important");
        // Ikona w accent
        var svg = el.querySelector("svg");
        if (svg) svg.style.setProperty("color", "hsl(" + accent + ")", "important");
        el.dataset.qaiActiveStyled = "1";
      });
      // Usun styling z elementow ktore juz nie sa active (np. po nawigacji)
      var stylizowane = document.querySelectorAll('[data-qosmoai-active-styled="1"]');
      stylizowane.forEach(function (el) {
        var stillActive = el.getAttribute("data-active") === "true" ||
                          el.classList.contains("pf-m-current") ||
                          el.classList.contains("active") ||
                          el.getAttribute("aria-current") === "page";
        if (!stillActive) {
          el.style.removeProperty("background-color");
          el.style.removeProperty("box-shadow");
          el.style.removeProperty("color");
          var svg = el.querySelector("svg");
          if (svg) svg.style.removeProperty("color");
          delete el.dataset.qaiActiveStyled;
        }
      });
    }
    applyToAll();
    var obs = new MutationObserver(applyToAll);
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-active", "class", "aria-current"],
    });
  }

  // ----- Mount Langfuse nav PL translations + section headers --------
  // Mockup wymaga polskich nazw + section divider headers (OBSERWOWALNOSC,
  // PROMPTY, EWALUACJA). Mapujemy natywne EN labels na PL przez text match,
  // plus wstawiamy <li class="qosmoai-nav-section">SECTION</li> przed pierwszym
  // item-em kazdej grupy.
  var NAV_TRANSLATIONS = {
    "Home": "Strona główna",
    "Tracing": "Tracing",
    "Sessions": "Sesje",
    "Users": "Użytkownicy",
    "Prompts": "Prompty",
    "Playground": "Playground",
    "Scores": "Oceny",
    "LLM-as-a-Judge": "LLM-as-a-Judge",
    "Annotation Queues": "Adnotacja ludzka",
    "Human Annotation": "Adnotacja ludzka",
    "Datasets": "Zbiory danych",
    "Experiments": "Eksperymenty",
    "Settings": "Ustawienia",
    "Support": "Pomoc",
    "Organizations": "Organizacje",
    "Projects": "Projekty",
    "Members": "Czlonkowie",
    "API Keys": "Klucze API",
    "Billing": "Rozliczenia",
    "Integrations": "Integracje",
  };
  // Section headers przed konkretnymi nav items (key=text item ktory rozpoczyna sekcje)
  var NAV_SECTIONS = {
    "Sesje": "OBSERWOWALNOŚĆ",
    "Prompty": "PROMPTY",
    "Oceny": "EWALUACJA",
  };

  function mountLangfuseNavTranslate() {
    var processed = new WeakSet();
    function tryTranslate() {
      // Langfuse uzywa a[data-sidebar=menu-button] dla nav items
      var navItems = document.querySelectorAll('a[data-sidebar="menu-button"], button[data-sidebar="menu-button"][data-size="default"]');
      if (!navItems.length) return false;
      var translated = 0;
      navItems.forEach(function (item) {
        if (processed.has(item)) return;
        // Znajdz text node lub span z labelem
        var textEls = item.querySelectorAll("span");
        textEls.forEach(function (sp) {
          var t = (sp.textContent || "").trim();
          if (NAV_TRANSLATIONS[t]) {
            sp.textContent = NAV_TRANSLATIONS[t];
            translated++;
          }
        });
        // Sprawdz po translacji czy item ma label ktory wymaga section-header PRZED
        var label = (item.textContent || "").trim();
        for (var sectionFor in NAV_SECTIONS) {
          if (label.indexOf(sectionFor) === 0) {
            // Sprawdz czy section header juz istnieje przed tym item-em
            var parent = item.closest("li") || item.parentElement;
            var prev = parent && parent.previousElementSibling;
            if (!prev || !prev.classList.contains("qosmoai-nav-section")) {
              var header = document.createElement("li");
              header.className = "qosmoai-nav-section qosmoai-nav-section-label";
              header.textContent = NAV_SECTIONS[sectionFor];
              parent.parentNode.insertBefore(header, parent);
            }
            break;
          }
        }
        processed.add(item);
      });
      return translated > 0;
    }
    tryTranslate();
    // Stale obserwujemy bo Langfuse rerenderuje nav przy route changes
    var obs = new MutationObserver(function () { tryTranslate(); });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    // Nigdy nie disconnect - Langfuse moze rerender w dowolnym momencie
  }

  // ----- Mount Langfuse user-card (mockup parity) --------------------
  // Natywny Langfuse button[data-sidebar=menu-button][data-size=lg] w sidebar
  // bottom zawiera (Dev Qosmo + dev@qosmo.local). My podmieniamy children
  // na nasza strukture pasujaca do mockupu: avatar (initials w okragu) +
  // displayName + "Qosmo Premise" subtitle + chevron-up-down icon.
  // Zachowujemy oryginalny button (i jego click-handler -> Langfuse popover).
  function mountLangfuseUserCard() {
    function tryMount() {
      // sidebar-menu-button data-size=lg to user-card (data-size=default to nav items)
      var btn = document.querySelector('button[data-sidebar="menu-button"][data-size="lg"]');
      if (!btn) return false;
      if (btn.dataset.qaiMounted === "1") return true;

      // Read native text-content - fallback gdy cookie qosmoai_user pusty.
      var nativeName = "";
      var nameEl = btn.querySelector("span:first-of-type, [class*='font-medium']");
      if (nameEl) nativeName = (nameEl.textContent || "").trim();

      var displayName = QosmoaiUser.getDisplayName() || nativeName || "User";

      // Initials z displayName (max 2 chars, uppercase)
      var initials = displayName
        .split(/\s+/)
        .slice(0, 2)
        .map(function (p) { return p[0] || ""; })
        .join("")
        .toUpperCase() || "U";

      // Wszystko stylowane przez .qosmoai-user-card-* klasy w components.css (SSOT).
      // JS tylko wstrzykuje strukture DOM + zawartosc tekstu, zero inline styles.
      var chevronIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>';

      btn.classList.add("qosmoai-user-card");
      btn.innerHTML =
        '<span class="qosmoai-user-card-avatar">' + initials + '</span>' +
        '<span class="qosmoai-user-card-text">' +
          '<span class="qosmoai-user-card-name">' + displayName + '</span>' +
        '</span>' +
        '<span class="qosmoai-user-card-chevron">' + chevronIcon + '</span>';

      btn.dataset.qaiMounted = "1";
      return true;
    }
    if (tryMount()) return;
    var obs = new MutationObserver(function () {
      if (tryMount()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 10000);
  }

  // ----- Hide Langfuse version badge (v3.160.0 EE) -------------------
  // Sidebar header zawiera link/badge do github releases z numerem wersji
  // ("v3.160.0 EE"). User chce ukryc - whitelabel. CSS selektor po href nie
  // zawsze lapal (link generowany przez React), wiec JS po text matching.
  function hideLangfuseVersionBadge() {
    function tryHide() {
      var sidebarHeader = document.querySelector('[data-sidebar="header"]');
      if (!sidebarHeader) return false;
      // Szukamy element z text zaczynajacym sie od "v" + cyfry + kropka (np v3.160.0)
      var rx = /^v\d+\.\d+\.\d+/;
      var nodes = sidebarHeader.querySelectorAll("a, span, div, button");
      for (var i = 0; i < nodes.length; i++) {
        var t = (nodes[i].textContent || "").trim();
        if (rx.test(t) && t.length < 30) {
          // Ukryj NAJWYZSZY rodzic z border/rounded ktory zawiera tylko ten badge
          // (nie caly sidebar). Maksymalnie 3 poziomy w gore.
          var el = nodes[i];
          for (var j = 0; j < 3; j++) {
            if (el.parentElement && el.parentElement !== sidebarHeader &&
                el.parentElement.children.length === 1) {
              el = el.parentElement;
            } else break;
          }
          el.style.display = "none";
          return true;
        }
      }
      return false;
    }
    if (tryHide()) return;
    var obs = new MutationObserver(function () {
      if (tryHide()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 10000);
  }

  // ----- Hide upstream "Star Langfuse" widget ------------------------
  // Langfuse renderuje generic shadcn <Card> z <h3>Star Langfuse</h3>
  // (bez zadnej klasy `Star*` ani data-attr) w sidebar bottom. Nie da sie
  // tego zlapac czystym CSS, wiec sciezka JS-owa: znajdz <h3 text="Star
  // Langfuse"> i ukryj jego container Card (3 poziomy parent).
  function hideStarLangfuseWidget() {
    function tryHide() {
      var headings = document.querySelectorAll("h3");
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].textContent && headings[i].textContent.trim() === "Star Langfuse") {
          // L0 h3 -> L1 inner flex -> L2 Card -> L3 wrapper (z group-data).
          // Ukrywamy L3 zeby caly slot zniknal (nie zostawal ghost padding).
          var card = headings[i].closest('[class*="text-card-foreground"]');
          var wrapper = card && card.parentElement;
          if (wrapper) { wrapper.style.display = "none"; return true; }
          if (card) { card.style.display = "none"; return true; }
        }
      }
      return false;
    }
    if (tryHide()) return;
    var obs = new MutationObserver(function () {
      if (tryHide()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 10000);
  }

  // ----- BOOT -------------------------------------------------------
  // Auto-init przy load: apply cookie do DOM, bridge theme, mount UI.
  apply(readCookie());
  bridgeNextThemes();

  // Per-app detection - rozpoznaje hosta apke zeby wiedziec czy potrzebuje
  // injection. Next.js (chat) i Langflow (flow) maja wlasne React komponenty
  // AppSwitcher - nie wstrzykiwac (duplikat). Langfuse i Keycloak vanilla.
  function detectAppForMount() {
    var host = location.hostname, port = location.port, path = location.pathname;
    // Next.js (chat)
    if ((host === "localhost" && port === "3000") || /^chat\./.test(host)) return "nextjs";
    // Langflow (flow studio)
    if ((host === "localhost" && port === "7860") || /^(flow|flows)\./.test(host)) return "langflow";
    // Langfuse (tracer)
    if ((host === "localhost" && port === "3100") || /^tracer\./.test(host)) return "langfuse";
    // Keycloak (auth) - admin console + account console + login pages
    if ((host === "localhost" && port === "8080") || /^auth\./.test(host) || /^\/(admin|realms)\b/.test(path)) return "keycloak";
    return null;
  }

  // Boot kolejnosc:
  // 1. Wszystkie apki: cookie apply + bridge themes + user-card sync (cross-app)
  // 2. Tylko Langfuse: mountLangfuseSidebarBrand + mountLangfuseTopbarTrigger
  //    + hideStarLangfuseWidget (Langfuse-specific DOM injection)
  // 3. Pozostalym apkom (Next.js, Langflow) nie wstrzykujemy nic - maja wlasne
  //    React komponenty AppSwitcher.
  function bootMount() {
    // Preload wordmarki - cachuja sie w pamieci, modal otwiera sie szybciej.
    preloadWordmarks();
    var app = detectAppForMount();
    if (app === "langfuse") {
      mountLangfuseSidebarBrand();
      mountLangfuseTopbarTrigger();
      mountLangfuseUserCard();
      mountLangfuseNav