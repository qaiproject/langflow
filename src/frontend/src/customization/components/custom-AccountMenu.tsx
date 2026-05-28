// =============================================================================
// CustomAccountMenu — disabled in topbar.
// -----------------------------------------------------------------------------
// Per Qosmo mockup, the user-card lives at the BOTTOM of the left sidebar,
// not in the topbar. We render <></> from this slot (kills the upstream
// AccountMenu in topbar right) and inject the actual user-card via
// `CustomUserCard` mounted by `CustomFolderSidebar` into the sidebar
// footer area.
// =============================================================================
export function CustomAccountMenu() {
  return <></>;
}

export default CustomAccountMenu;
