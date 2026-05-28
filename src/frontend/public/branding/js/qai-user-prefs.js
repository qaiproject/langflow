/* ============================================================================
 * QOSMO USER PREFERENCES -- shared client across all 4 apps
 * ----------------------------------------------------------------------------
 * Cel: jeden cookie `qai_user` zawiera identity (display_name, avatar_url) +
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
 *   QaiUser.read()                 -> { display_name, avatar_url, theme, ... }
 *   QaiUser.write({ theme: ... })  -> patch + apply + broadcast
 *   QaiUser.apply(prefs)           -> applies theme/accent/text_size do DOM
 *   QaiUser.getDisplayName()       -> shortcut
 *   QaiUser.getAvatar()            -> shortcut (URL or null)
 *   QaiUser.getTheme()             -> "dark" | "light"
 *   QaiUser.getAccent()            -> "indigo" | "wisteria" | ...
 *   QaiUser.getTextSize()          -> "sm" | "md" | "lg"
 *   QaiUser.onChange(cb)           -> sub do cross-tab updates
 * ============================================================================ */
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  if (window.QaiUser) return; // idempotent: wielokrotne includes są OK

  var COOKIE_NAME = "qai_user";
  var COOKIE_VERSION = 1;
  var COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dni
  var DEFAULTS = {
    display_name: "User",
    avatar_url: null,
    theme: "dark",          // "dark" | "light"
    accent: "indigo",       // jeden z 8 kolorow palety --qai-c-*
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
      console.warn("[QaiUser] cookie parse failed, falling back to defaults", e);
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

    // Theme: dark/light class na html + body. Wiele apek (Langflow, Next.js)
    // sprawdza obie lokalizacje.
    var dark = prefs.theme === "dark";
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    if (body) {
      body.classList.toggle("dark", dark);
      body.classList.toggle("light", !dark);
    }

    // Accent color: setuje --qai-app-accent ktore mapuje na konkretna
    // palette zmienna. To override koloru per-app accent (np. Langflow ma
    // domyslnie wisteria, user moze wybrac inny).
    if (prefs.accent) {
      root.style.setProperty(
        "--qai-app-accent",
        "var(--qai-c-" + prefs.accent + ")"
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
      bc = new BroadcastChannel("qai_user");
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
      try { subs[i](prefs); } catch (e) { console.error("[QaiUser] sub error", e); }
    }
  }

  // ── Public API ───────────────────────────────────────────────────────
  var QaiUser = {
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

  // Auto-init na load: aplikuj cookie do DOM ASAP.
  apply(readCookie());

  window.QaiUser = QaiUser;
})();
