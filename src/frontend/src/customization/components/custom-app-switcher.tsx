// =============================================================================
// CustomAppSwitcher — Qosmo 5-tile platform launcher.
// -----------------------------------------------------------------------------
// Port of frontend/src/components/right_panel/AppSwitcher.tsx (Next.js) into
// Langflow. Displays a modal with 5 tiles (chat/flow/tracer/docs/auth) and
// dynamic URL resolution (localhost ports → subdomain swap on prod).
//
// Trigger button (LayoutGrid icon) is rendered inline; clicking it opens
// the overlay. The current app is 'flow' (we ARE Langflow) so the .flow
// tile shows the "AKTUALNA" badge.
// =============================================================================
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import baseRaw from "@/assets/qosmo-base.svg?raw";

type AppId = "chat" | "flow" | "tracer" | "docs" | "auth";

interface QosmoApp {
  id: AppId;
  suffix: string;
  desc: string;
  accent: string;
  /** Inline SVG markup (lucide-react path) for the tile icon. */
  iconSvg: string;
  resolveUrl: () => string;
}

const SUBDOMAIN_MAP: Record<AppId, string> = {
  chat: "chat",
  flow: "flows",
  tracer: "tracer",
  docs: "docs",
  auth: "auth",
};

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.")
  );
}

function resolveAppUrl(
  app: AppId,
  opts: { localhostFallback: string; appendPath?: string },
): string {
  if (typeof window === "undefined") return opts.localhostFallback;
  const { hostname, protocol } = window.location;
  if (isLocalHost(hostname)) return opts.localhostFallback;
  const parts = hostname.split(".");
  if (parts.length < 2) return opts.localhostFallback;
  parts[0] = SUBDOMAIN_MAP[app];
  return `${protocol}//${parts.join(".")}${opts.appendPath ?? "/"}`;
}

// lucide-react path data (kept inline so we don't pull a new dep). Matches the
// icons used in Qosmo.chat's AppSwitcher exactly.
const I = {
  grid: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  chat: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  flow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/></svg>',
  tracer:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.5.5 0 0 1-.96 0L9.68 3.18a.5.5 0 0 0-.96 0l-2.35 8.36A2 2 0 0 1 4.44 13H2"/></svg>',
  docs: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
  auth: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
};

const BASE_SVG = baseRaw.replace(
  /<svg\b([^>]*)>/,
  '<svg$1 width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">',
);

const APPS: QosmoApp[] = [
  {
    id: "chat",
    suffix: ".chat",
    desc: "Czat z modelami i agentami",
    accent: "var(--qosmoai-app-chat)",
    iconSvg: I.chat,
    resolveUrl: () =>
      resolveAppUrl("chat", { localhostFallback: "http://localhost:3000", appendPath: "/" }),
  },
  {
    id: "flow",
    suffix: ".flow",
    desc: "Studio przepływów agentowych",
    accent: "var(--qosmoai-app-flow)",
    iconSvg: I.flow,
    resolveUrl: () =>
      resolveAppUrl("flow", { localhostFallback: "http://localhost:7860" }),
  },
  {
    id: "tracer",
    suffix: ".tracer",
    desc: "Obserwowalność LLM",
    accent: "var(--qosmoai-app-tracer)",
    iconSvg: I.tracer,
    resolveUrl: () =>
      resolveAppUrl("tracer", { localhostFallback: "http://localhost:3100" }),
  },
  {
    id: "docs",
    suffix: ".docs",
    desc: "Repozytorium plików",
    accent: "var(--qosmoai-app-docs)",
    iconSvg: I.docs,
    resolveUrl: () =>
      resolveAppUrl("docs", { localhostFallback: "http://localhost:8333" }),
  },
  {
    id: "auth",
    suffix: ".auth",
    desc: "Zarządzanie tożsamością",
    accent: "var(--qosmoai-app-auth)",
    iconSvg: I.auth,
    resolveUrl: () =>
      resolveAppUrl("auth", {
        localhostFallback: "http://localhost:8080/realms/qai/account/",
        appendPath: "/realms/qai/account/",
      }),
  },
];

interface CustomAppSwitcherProps {
  /** Which tile should show the "AKTUALNA" badge. Default 'flow'. */
  current?: AppId;
}

export default function CustomAppSwitcher({
  current = "flow",
}: CustomAppSwitcherProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="qosmoai-topbar-icon"
        aria-label="Aplikacje Qosmo"
        onClick={() => setOpen(true)}
        dangerouslySetInnerHTML={{ __html: I.grid }}
      />

      {open && createPortal(
        <div
          className="qosmoai-app-switcher-overlay"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            ref={dialogRef}
            className="qosmoai-app-switcher"
            role="dialog"
            aria-label="Przelaczanie aplikacji"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="qosmoai-app-switcher-header">
              <span
                className="qosmoai-wordmark"
                style={{
                  display: "inline-flex",
                  height: 28,
                  width: 28 * (538.89 / 141.73),
                  color: "var(--text-bright)",
                }}
                dangerouslySetInnerHTML={{ __html: BASE_SVG }}
              />
              <div className="qosmoai-app-switcher-header-spacer" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="qosmoai-app-switcher-close"
                aria-label="Zamknij"
                dangerouslySetInnerHTML={{ __html: I.x }}
              />
            </div>

            <div className="qosmoai-app-switcher-grid">
              {APPS.map((a) => {
                const active = a.id === current;
                const url = a.resolveUrl();
                const isExternal = !url.startsWith("/");
                return (
                  <a
                    key={a.id}
                    href={url}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className={`qosmoai-app-tile ${active ? "qosmoai-app-tile-active" : ""}`}
                    style={{ ["--qosmoai-tile-color" as never]: a.accent } as React.CSSProperties}
                    onClick={() => {
                      if (active) setOpen(false);
                    }}
                  >
                    <div
                      className="qosmoai-app-tile-icon"
                      dangerouslySetInnerHTML={{ __html: a.iconSvg }}
                    />
                    <div
                      className="qosmoai-app-tile-name"
                      style={{
                        ["--qosmoai-suffix-color" as never]: "var(--qosmoai-tile-color)",
                      } as React.CSSProperties}
                    >
                      <span className="qosmoai-brand-lockup" style={{ gap: 2, padding: 0 }}>
                        <span
                          className="qosmoai-wordmark"
                          style={{
                            height: 20,
                            width: 20 * (538.89 / 141.73),
                            color: "var(--text-bright)",
                          }}
                          dangerouslySetInnerHTML={{ __html: BASE_SVG }}
                        />
                        <span className="qosmoai-product-tag" style={{ fontSize: 11 }}>
                          {a.suffix}
                        </span>
                      </span>
                    </div>
                    <div className="qosmoai-app-tile-desc">{a.desc}</div>
                    {active && <div className="qosmoai-app-tile-badge">aktualna</div>}
                  </a>
                );
              })}
            </div>

            <div className="qosmoai-app-switcher-foot">QOSMO PREMISE</div>
          </div>
        </div>,
        // Portal target: document.body wyciaga overlay z stacking contextu
        // AppHeadera (ktory ma `class="z-10"` -> wlasny stacking context).
        // Bez portalu nasz z-index: 9999 obowiazuje TYLKO wewnatrz z-10
        // headera; sticky ikonki w main content (np. list/grid view w sidebar
        // header) sa w innym stacking contextcie z wyzszym order i wsuwaja
        // sie ponad overlay. Portal renderuje overlay bezposrednio w body,
        // czyli z-index: 9999 dziala globalnie.
        document.body,
      )}
    </>
  );
}
