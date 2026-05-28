// =============================================================================
// CustomUserCard — Qosmo user-card pattern.
// -----------------------------------------------------------------------------
// Full-width trigger (avatar + name + role + chevron) with Konto / Motyw /
// Wyloguj dropdown. Mirrors the layout used in Qosmo.chat (Next.js sidebar
// bottom) and Qosmo.auth (Keycloak sidebar bottom JS-injected card).
//
// Reuses Langflow upstream stores/hooks so logout / theme / navigation
// behave identically to upstream — only the JSX layer is Qosmo-styled.
// =============================================================================
import { useEffect, useRef, useState } from "react";
import { useLogout } from "@/controllers/API/queries/auth";
import { useCustomNavigate } from "@/customization/hooks/use-custom-navigate";
import useAuthStore from "@/stores/authStore";
import { useDarkStore } from "@/stores/darkStore";

interface CustomUserCardProps {
  /** Sidebar-bottom usage: full width card. Default true. */
  fullWidth?: boolean;
  /** Override the role label shown under the username. Default "Qosmo.flow". */
  roleLabel?: string;
}

export default function CustomUserCard({
  fullWidth = true,
  roleLabel = "Qosmo.flow",
}: CustomUserCardProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const navigate = useCustomNavigate();
  const { mutate: mutationLogout } = useLogout();
  const { isAdmin, autoLogin, userData } = useAuthStore((state) => ({
    isAdmin: state.isAdmin,
    autoLogin: state.autoLogin,
    userData: state.userData,
  }));
  const dark = useDarkStore((state) => state.dark);
  const setDark = useDarkStore((state) => state.setDark);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Mapper username -> display name. Langflow's `Users` model has only
  // `username` (no full_name / email). To present a coherent identity across
  // 4 Qosmo apps we transform:
  //  - "langflow"  → "Administrator"  (seed admin in local SQLite, dev only)
  //  - "user@host" → "user"           (SSO often stores full email here)
  //  - anything else → as-is
  // On production the patched `auto_login.py` reads X-Auth-Request-Email from
  // oauth2-proxy, so `username` becomes the Keycloak email → mapper gives the
  // local-part. Same convention will be reused in Qosmo.tracer / .auth so
  // user-card consistently shows the same human identity everywhere.
  function toDisplayName(raw: string | undefined): string {
    if (!raw) return "User";
    if (raw === "langflow") return "Administrator";
    if (raw.includes("@")) return raw.split("@")[0];
    return raw;
  }
  const rawUsername = userData?.username;

  // PREFERRED SOURCE: shared `qai_user` cookie set by Qosmo.chat after login.
  // It carries the canonical display_name + avatar_url from Keycloak claims
  // so all 4 apps render the SAME identity. Langflow's local SQLite user
  // ("langflow") is only the fallback when the cookie isn't there (no SSO
  // yet, dev mode without Next.js running, etc).
  // window.QaiUser is injected by branding/js/qai-user-prefs.js (loaded via
  // index.html before the bundle).
  const qaiUser =
    typeof window !== "undefined"
      ? (window as unknown as { QaiUser?: { getDisplayName: () => string; getAvatar: () => string | null } }).QaiUser
      : undefined;
  const sharedDisplayName = qaiUser?.getDisplayName();
  const sharedAvatar = qaiUser?.getAvatar();

  const username =
    sharedDisplayName && sharedDisplayName !== "User"
      ? sharedDisplayName
      : toDisplayName(rawUsername);
  const initial = username.charAt(0).toUpperCase();
  const profileImage = sharedAvatar ?? userData?.profile_image;

  const handleLogout = () => {
    setOpen(false);
    mutationLogout();
  };

  // Sidebar-bottom variant: full width pill spanning the sidebar.
  const triggerStyle: React.CSSProperties = fullWidth
    ? {}
    : { width: "auto", maxWidth: 240, padding: "4px 8px", borderRadius: 999 };
  const avatarStyle: React.CSSProperties = fullWidth
    ? {}
    : { width: 28, height: 28, fontSize: 12 };

  return (
    <div style={{ position: "relative", width: fullWidth ? "100%" : "auto" }}>
      <button
        ref={triggerRef}
        type="button"
        className="qai-user-card-trigger"
        aria-label="Menu użytkownika"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        data-testid="user-profile-settings"
        style={triggerStyle}
      >
        <span className="qai-user-card-avatar" style={avatarStyle}>
          {profileImage ? (
            // Profile image z backendu (URL lub data:image). Fallback przy
            // błędzie ładowania → onError ukrywa <img> i pokazuje inicjał.
            <img
              src={profileImage}
              alt={username}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "inherit",
                objectFit: "cover",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            initial
          )}
        </span>
        <span className="qai-user-card-info">
          <span className="qai-user-card-name">{username}</span>
          <span className="qai-user-card-role">{roleLabel}</span>
        </span>
        <svg
          className="qai-user-card-chevron"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="qai-dropdown-menu qai-user-menu-popover"
          role="menu"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            // Sidebar bottom usage: popover rises ABOVE the trigger.
            bottom: fullWidth ? "calc(100% + 6px)" : undefined,
            top: fullWidth ? undefined : "calc(100% + 6px)",
            zIndex: 9999,
          }}
        >
          <button
            type="button"
            className="qai-dropdown-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
          >
            <span>Ustawienia</span>
          </button>

          {isAdmin && !autoLogin && (
            <button
              type="button"
              className="qai-dropdown-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate("/admin");
              }}
            >
              <span>Panel administratora</span>
            </button>
          )}

          <button
            type="button"
            className="qai-dropdown-item"
            role="menuitem"
            onClick={() => setDark(!dark)}
          >
            <span>Motyw</span>
            <span style={{ marginLeft: "auto", color: "var(--text-dim)" }}>
              {dark ? "Ciemny" : "Jasny"}
            </span>
          </button>

          {!autoLogin && (
            <button
              type="button"
              className="qai-dropdown-item qai-dropdown-item-danger"
              role="menuitem"
              onClick={handleLogout}
            >
              <span>Wyloguj się</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
