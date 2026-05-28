// Delegate the full-page loader to the customization slot so the brand
// (Qosmo sygnet + dark surface) is consistent everywhere: Suspense fallback
// in App.tsx, authAdminGuard, AppInitPage overlay. Without this redirect
// Langflow still rendered the upstream <LoadingComponent> (white circular
// spinner) which flickered against our CustomLoadingPage during initial
// bundle hydration.
import { CustomLoadingPage } from "@/customization/components/custom-loading-page";

export function LoadingPage(_props: { overlay?: boolean }): JSX.Element {
  // `overlay` is preserved in the upstream API for call-sites that pass it,
  // but our CustomLoadingPage is always full-screen (position:fixed inset:0)
  // so the prop is effectively a no-op here.
  return <CustomLoadingPage />;
}
