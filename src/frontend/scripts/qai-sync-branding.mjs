#!/usr/bin/env node
// =============================================================================
// qai-sync-branding.mjs
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

const CSS_FILES = [
  { src: "components.css", dst: "qosmo-components.css" },
  { src: "tokens.css",     dst: "qosmo-tokens.css" },
];

const JS_FILES = [
  "qai-user-prefs.js",
];

function log(msg) {
  console.log("[qai-sync-branding] " + msg);
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

log("SSOT:        " + SSOT_DIR);
log("CSS dest:    " + DEST_DIR);
log("Public dest: " + PUBLIC_DEST_DIR);

for (const pair of CSS_FILES) syncCss(pair);
for (const js of JS_FILES) syncJs(js);

log("done.");
