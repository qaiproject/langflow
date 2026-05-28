// =============================================================================
// CustomLangflowCounts — emptied for Qosmo whitelabel.
// -----------------------------------------------------------------------------
// Upstream renders "GitHub 149k" + "Discord 25k" community badges in the right
// section of the topbar. That's Langflow OSS marketing noise we don't want
// surfaced to Qosmo Premise end-users. Returning <></> here removes them
// without touching the AppHeader component itself (which already wraps this
// slot in `<div className="hidden pr-2 whitespace-nowrap lg:inline-flex...">`).
// =============================================================================
export function CustomLangflowCounts() {
  return <></>;
}

export default CustomLangflowCounts;
