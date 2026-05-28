// =============================================================================
// CustomAppLogo — swap-point for the Langflow app-header brand mark.
// -----------------------------------------------------------------------------
// Renders the full "Qosmo.flow" wordmark (SVG "Qosmo" + ".flow" suffix span)
// by default. Pass `sygnet={true}` for the square-only variant used in
// collapsed-sidebar states.
//
// Upstream's <AppHeader> historically hard-codes a Langflow logo; in our
// Qosmo fork we used to patch that file directly with <QosmoLogo>. This file
// moves the logo render into Langflow's `customization/` slot pattern so the
// only diff in `appHeaderComponent/index.tsx` is a 1-line import swap.
// =============================================================================
import QosmoLogo from "@/components/common/QosmoLogo";

interface CustomAppLogoProps {
  className?: string;
  title?: string;
  /**
   * Render the compact sygnet (Q square) instead of the full "Qosmo.flow"
   * wordmark. Used by collapsed-sidebar / favicon-like states.
   * Default: false (= wordmark).
   */
  sygnet?: boolean;
}

export default function CustomAppLogo({
  className,
  title,
  sygnet = false,
}: CustomAppLogoProps) {
  // QosmoLogo accepts `wordmark` (boolean) — opposite of our `sygnet` flag.
  return (
    <QosmoLogo
      className={className}
      title={title ?? (sygnet ? "Qosmo" : "Qosmo.flow")}
      wordmark={!sygnet}
    />
  );
}
