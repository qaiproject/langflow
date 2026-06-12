#!/usr/bin/env node
// =============================================================================
// qosmoai-sync-branding.mjs
// SSOT -> Langflow CSS/JS sync. Runs in prestart/predev:docker/prebuild so
// the Vite dev server and Docker build always see the freshest copies of
// branding/{components,tokens}.css + branding/js/*.js from the monorepo root.
// Never edit the local copies by hand -- next run will overwrite them.
// =============================================================================

import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..");
const SSOT_DIR = join(REPO_ROOT, "branding");
const DEST_DIR = resolve(__dirname, "..", "src", "style");
// Vite serves /public/ as root URL, so /branding/js/X.js -> /public/branding/js/X.js
const PUBLIC_DEST_DIR = resolve(__dirname, "..", "public", "branding", "js");
// Per-app wordmark SVG (qosmo-{id}.svg) -> assets/ folder dla Vite ?raw imports
const ASSETS_DEST_DIR = resolve(__dirname, "..", "src", "assets");

const CSS_FILES = [
  { src: "components.css", dst: "qosmo-components.css" },
  { src: "tokens.css",     dst: "qosmo-tokens.css" },
];

const JS_FILES = [
  "qosmoai-user-prefs.js",
];

// Per-app SVG (branding/logo/apps/qosmo-{id}.svg -> assets/qosmo-{id}.svg).
// SSOT: designer dostarcza pliki w branding/logo/apps/, ten sync je kopiuje
// do Langflow assets/ zeby Vite ?raw imports w custom-app-switcher.tsx
// dostawaly aktualne wersje (auto-rebuild przy npm run dev).
const APP_SVG_FILES = [
  "qosmo-base.svg",
  "qosmo-sygnet.svg",
  "qosmo-chat.svg",
  "qosmo-flow.svg",
  "qosmo-tracer.svg",
  "qosmo-docs.svg",
  "qosmo-auth.svg",
];

function log(msg) {
  console.log("[qosmoai-sync-branding] " + msg);
}

function syncCss({ src, dst }) {
  const srcPath = join(SSOT_DIR, src);
  const dstPath = join(DEST_DIR, dst);
  if (!existsSync(srcPath)) {
    log("SKIP CSS: missing " + srcPath);
    return;
  }
  if (!existsSync(DEST_DIR)) mkdirSync(DEST_DIR, { recursive: true });
  if (existsSync(dstPath)) {
    const sm = statSync(srcPath).mtimeMs;
    const dm = statSync(dstPath).mtimeMs;
    if (dm > sm + 1000) {
      log("WARNING: " + dst + " is newer than SSOT " + src + " (overwriting)");
    }
  }
  copyFileSync(srcPath, dstPath);
  log("OK CSS: " + srcPath + " -> " + dstPath);
}

function syncJs(filename) {
  const srcPath = join(SSOT_DIR, "js", filename);
  const dstPath = join(PUBLIC_DEST_DIR, filename);
  if (!existsSync(srcPath)) {
    log("SKIP JS: missing " + srcPath);
    return;
  }
  if (!existsSync(PUBLIC_DEST_DIR)) mkdirSync(PUBLIC_DEST_DIR, { recursive: true });
  copyFileSync(srcPath, dstPath);
  log("OK JS: " + srcPath + " -> " + dstPath);
}

function syncAppSvg(filename) {
  const srcPath = join(SSOT_DIR, "logo", "apps", filename);
  const dstPath = join(ASSETS_DEST_DIR, filename);
  if (!existsSync(srcPath)) {
    log("SKIP SVG: missing " + srcPath);
    return;
  }
  if (!existsSync(ASSETS_DEST_DIR)) mkdirSync(ASSETS_DEST_DIR, { recursive: true });
  copyFileSync(srcPath, dstPath);
  log("OK SVG: " + srcPath + " -> " + dstPath);
}

log("SSOT:        " + SSOT_DIR);
log("CSS dest:    " + DEST_DIR);
log("Public dest: " + PUBLIC_DEST_DIR);
log("Assets dest: " + ASSETS_DEST_DIR);

for (const pair of CSS_FILES) syncCss(pair);
for (const js of JS_FILES) syncJs(js);
for (const svg of APP_SVG_FILES) syncAppSvg(svg);

log("done.");
