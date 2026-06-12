// =============================================================================
// CustomLoader — small in-flow spinner used by buttons, drawers, partial
// content loads. Upstream falls back to <LoadingComponent>; in our Qosmo
// build we paint the brand sygnet spinning instead, matching the loaders
// used in Qosmo.chat (Next.js) and Qosmo.auth (Keycloak T3 templates).
//
// `remSize` keeps the upstream API (callers expect roughly N rem of size).
// The qosmoai-loading-spin keyframes live in branding/components.css which is
// injected build-time via the langflow Dockerfile.
// =============================================================================
import sygnetRaw from "@/assets/qosmo-sygnet.svg?raw";

type CustomLoaderProps = {
  remSize?: number;
};

const SYGNET_HTML = sygnetRaw.replace(
  /<svg\b([^>]*)>/,
  '<svg$1 width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">',
);

const CustomLoader = ({ remSize = 30 }: CustomLoaderProps) => {
  const px = Math.round(remSize * 1.6); // upstream rem→px ratio approximation
  return (
    <span
      role="status"
      aria-label="Wczytywanie"
      className="qosmoai-loading-sygnet"
      style={{
        display: "inline-flex",
        width: px,
        height: px,
        color: "var(--text-bright, currentColor)",
        animation: "qosmoai-loading-spin 1.4s linear infinite",
      }}
      dangerouslySetInnerHTML={{ __html: SYGNET_HTML }}
    />
  );
};

export default CustomLoader;
