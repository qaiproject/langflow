// =============================================================================
// CustomLoadingPage — full-page loader shown during initial bundle hydration
// and slow route transitions. Upstream returns <></> (no loader), which gives
// users a blank white flash. We paint the same brand-correct dark surface +
// spinning Qosmo sygnet that Qosmo.chat and Qosmo.auth use.
//
// Keeping it 100% inline (no external CSS deps) so the loader renders even
// before /branding/components.css is parsed.
// =============================================================================
import sygnetRaw from "@/assets/qosmo-sygnet.svg?raw";

const SYGNET_HTML = sygnetRaw.replace(
  /<svg\b([^>]*)>/,
  '<svg$1 width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">',
);

export function CustomLoadingPage() {
  return (
    <div
      role="status"
      aria-label="Wczytywanie Qosmo.flow"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483646,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        background: "var(--qosmoai-bg, #0B0B14)",
        color: "var(--text-bright, #F3F3F6)",
      }}
    >
      <span
        style={{
          width: 56,
          height: 56,
          display: "inline-flex",
          color: "currentColor",
          animation: "qosmoai-loading-spin 1.4s linear infinite",
        }}
        dangerouslySetInnerHTML={{ __html: SYGNET_HTML }}
      />
      <span
        style={{
          fontFamily: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
          fontSize: 13,
          color: "var(--text-dim, #6C6C9D)",
          letterSpacing: "0.02em",
        }}
      >
        Wczytywanie Qosmo.flow...
      </span>
      {/* Inline keyframes so the loader works even if components.css hasn't loaded yet. */}
      <style>{`
        @keyframes qosmoai-loading-spin {
          0%   { transform: rotate(0deg);   opacity: 0.85; }
          50%  { transform: rotate(180deg); opacity: 1; }
          100% { transform: rotate(360deg); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

export default CustomLoadingPage;
