// =============================================================================
// CustomFolderSidebar — swap-point for the left "Projekty" sidebar.
// -----------------------------------------------------------------------------
// Wraps the upstream <SideBarFoldersButtonsComponent> AND mounts our Qosmo
// user-card at the bottom of the sidebar (mockup pattern: user-card lives
// in sidebar footer, not topbar).
//
// The user-card uses a React portal targeting `[data-sidebar="sidebar"]`
// so it slides into the sidebar element regardless of upstream layout
// changes. CSS pins it `position: sticky; bottom: 0` so it stays anchored
// during folder list scroll.
// =============================================================================
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import SideBarFoldersButtonsComponent from "@/components/core/folderSidebarComponent/components/sideBarFolderButtons";
import CustomUserCard from "@/customization/components/custom-user-card";

interface CustomFolderSidebarProps {
  handleChangeFolder?: (id: string) => void;
  handleDeleteFolder?: (item: any) => void;
  handleFilesClick?: () => void;
}

function UserCardPortal() {
  const [sidebarEl, setSidebarEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Poll for the sidebar element — it may not exist yet on first paint
    // because upstream renders Sidebar asynchronously. Once present, attach
    // a dedicated footer container as last child.
    let cancelled = false;
    function findSidebar() {
      const sb = document.querySelector<HTMLElement>('[data-sidebar="sidebar"]');
      if (sb) {
        // Look for or create our footer slot inside the sidebar so the
        // user-card is part of the sidebar DOM (vs. fixed-positioned).
        let footer = sb.querySelector<HTMLElement>("#qosmoai-sidebar-footer");
        if (!footer) {
          footer = document.createElement("div");
          footer.id = "qosmoai-sidebar-footer";
          // Footer to slot pod user-card. Bez wlasnego tla (transparent), bo
          // chcemy zeby kafelek user-card wybijal sie na tle sidebara. Padding
          // 10px + 12px daje "pole oddychania" wokol kafelka jak na mockupie
          // Qosmo.chat. Sticky bottom: 0 trzyma go na dole nawet przy scrollu.
          footer.style.cssText =
            "margin-top:auto;padding:10px 12px 12px;position:sticky;bottom:0;background:transparent;";
          sb.appendChild(footer);
        }
        if (!cancelled) setSidebarEl(footer);
        return;
      }
      // Retry until the sidebar mounts.
      setTimeout(findSidebar, 100);
    }
    findSidebar();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!sidebarEl) return null;
  // User-card pokazuje tylko avatar + username (Iter 11.9: usunięty hardcoded
  // "Qosmo Premise" subtitle -- user prosił zeby pokazac tylko realne dane).
  return createPortal(<CustomUserCard fullWidth />, sidebarEl);
}

export default function CustomFolderSidebar(props: CustomFolderSidebarProps) {
  return (
    <>
      <SideBarFoldersButtonsComponent {...props} />
      <UserCardPortal />
    </>
  );
}
