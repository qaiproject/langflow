// =============================================================================
// QosmoLogo - Langflow header / loading / empty page mark
// -----------------------------------------------------------------------------
// Composes the brand mark the way the qosmo-unified6 mockup does:
//
//   ┌────────────────────────────────┐
//   │  [SVG: "Qosmo" only]   .flow   │   <- ".flow" is HTML text, not part of SVG
//   └────────────────────────────────┘
//
// Why: the suffix can be re-coloured per-app (--qai-suffix-color = wisteria
// for Langflow) and re-translated without re-generating the SVG. The base
// wordmark SVG is shared across all 4 apps (chat / flow / tracer / docs / auth)
// and lives in /branding/logo/apps/qosmo-base.svg.
//
// `sygnet` mode renders just the square mark (collapsed sidebars, h-6 w-6
// header use, etc.) — still inlined so colour vars penetrate.
// =============================================================================
import baseRaw from "@/assets/qosmo-base.svg?raw";
import sygnetRaw from "@/assets/qosmo-sygnet.svg?raw";

interface QosmoLogoProps {
  className?: string;
  title?: string;
  /** Render full "Qosmo.flow" wordmark instead of just the square sygnet. */
  wordmark?: boolean;
}

function patchSvg(raw: string): string {
  return raw.replace(
    /<svg\b([^>]*)>/,
    '<svg$1 width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">',
  );
}

const BASE_HTML = patchSvg(baseRaw);
const SYGNET_HTML = patchSvg(sygnetRaw);

export default function QosmoLogo({
  className,
  title,
  wordmark = false,
}: QosmoLogoProps) {
  if (!wordmark) {
    return (
      <span
        role="img"
        aria-label={title ?? "Qosmo"}
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          color: "var(--text-bright, currentColor)",
        }}
        dangerouslySetInnerHTML={{ __html: SYGNET_HTML }}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={title ?? "Qosmo.flow"}
      className={`qai-brand-lockup ${className ?? ""}`}
      style={{
        // Use baseline alignment so ".flow" text sits on the same baseline
        // as the bottom of the SVG wordmark glyphs (mockup pattern). flex-end
        // pinned to bottom edges led to optical mis-alignment because the
        // SVG viewBox extends below the glyphs.
        display: "inline-flex",
        alignItems: "flex-end",
        gap: 4,
        lineHeight: 1,
      }}
    >
      <span
        className="qai-wordmark"
        style={{
          color: "var(--text-bright, currentColor)",
          height: 26,
          width: 26 * (538.89 / 141.73), // qosmo-base.svg aspect
          display: "inline-flex",
          lineHeight: 1,
        }}
        dangerouslySetInnerHTML={{ __html: BASE_HTML }}
      />
      <span
        className="qai-product-tag"
        style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.005em",
          color: "var(--qai-suffix-color, var(--accent))",
          lineHeight: 1,
          textTransform: "lowercase",
          // Drop ".flow" down to align with the wordmark's optical baseline.
          // The SVG glyphs end ~4px above the viewBox bottom, so the tag
          // needs negative offset to sit at the same visual line.
          transform: "translateY(2px)",
        }}
      >
        .flow
      </span>
    </span>
  );
}
