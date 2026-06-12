// =============================================================================
// QosmoLogo - Langflow header / loading / empty page mark
// -----------------------------------------------------------------------------
// Renderuje PEŁEN wektor SVG "Qosmo .flows" z księgi znaków - paths
// .qosmoai-base (Qosmo wordmark, currentColor) + .qosmoai-suffix (".flows",
// kolor z var(--qosmoai-suffix-color) - default akcent niebieski Qosmo,
// cookie z user-prefs.js moze nadpisac na user-choice).
//
// NIE komponujemy logo z base+span tekstu (stary pattern) -- per-app SVG ma
// designer-perfect kerning suffixu + zgodne wymiary z księgi znaków.
//
// `sygnet` mode = mały kwadratowy mark (collapsed sidebar, etc.).
// =============================================================================
import flowRaw from "@/assets/qosmo-flow.svg?raw";
import sygnetRaw from "@/assets/qosmo-sygnet.svg?raw";

interface QosmoLogoProps {
  className?: string;
  title?: string;
  /** Render full "Qosmo .flows" wordmark instead of just the square sygnet. */
  wordmark?: boolean;
}

function patchSvg(raw: string): string {
  // Usuwa width/height z root <svg> + dodaje preserveAspectRatio + display:block
  // -- SVG wypelni rodzica wysokoscia, width auto-skaluje przez viewBox.
  return raw.replace(
    /<svg\b([^>]*)>/,
    (_m, attrs: string) => {
      const cleaned = attrs.replace(/\s(?:width|height)="[^"]*"/g, "");
      return `<svg${cleaned} preserveAspectRatio="xMidYMid meet" style="display:block;height:100%;width:auto">`;
    },
  );
}

const FLOW_HTML = patchSvg(flowRaw);
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
          color: "var(--qosmoai-text-bright, currentColor)",
        }}
        dangerouslySetInnerHTML={{ __html: SYGNET_HTML }}
      />
    );
  }

  // Pelen wordmark "Qosmo .flows" - jeden SVG, suffix kolorowany przez
  // CSS variable --qosmoai-suffix-color (default = niebieski Qosmo).
  return (
    <span
      role="img"
      aria-label={title ?? "Qosmo .flows"}
      className={`qosmoai-wordmark ${className ?? ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 26,
        color: "var(--qosmoai-text-bright, currentColor)",
      }}
      dangerouslySetInnerHTML={{ __html: FLOW_HTML }}
    />
  );
}
