import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, MoreVertical, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clearPlatformTheme, usePlatformThemeGate } from "@/lib/use-platform-theme";
import { ThemeLoadingScreen } from "@/components/theme-loading-screen";
import { getNavForRole, type UserRole } from "@/lib/use-dashboard-nav";
import { PasswordChangeBanner } from "@/components/password-change-banner";
import { NotificationBell } from "@/components/notification-bell";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardShell,
});

type ProfileInfo = {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  user_id: string | null;
  must_change_password: boolean;
};

function DashboardShell() {
  const { settings, ready: themeReady } = usePlatformThemeGate();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [role, setRole] = useState<UserRole | null>(null);
  const [deactivated, setDeactivated] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<
    "pending_approval" | "approved" | "rejected" | null
  >(null);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileInfo>({ full_name: null, email: null, avatar_url: null, user_id: null, must_change_password: false });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("role, full_name, must_change_password, avatar_url, approval_status")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (!active) return;
      setRole(((data?.role as UserRole) ?? "user"));
      if ((data?.role ?? "user") === "user") {
        setApprovalStatus(
          (data?.approval_status as "pending_approval" | "approved" | "rejected" | undefined) ??
            null,
        );
      }
      if (data?.role === "shaykh") {
        const { data: shaykh } = await supabase
          .from("shaykhs")
          .select("is_active")
          .eq("profile_id", userData.user.id)
          .maybeSingle();
        if (!active) return;
        if (shaykh && shaykh.is_active === false) setDeactivated(true);
      }
      setProfile({
        full_name: (data?.full_name as string | null) ?? null,
        email: userData.user.email ?? null,
        avatar_url: (data?.avatar_url as string | null) ?? null,
        user_id: userData.user.id,
        must_change_password: Boolean(data?.must_change_password),
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  // Live-update the sidebar avatar when the user changes their photo in settings.
  useEffect(() => {
    function onAvatarUpdated(event: Event) {
      const url = (event as CustomEvent<string>).detail ?? null;
      setProfile((p) => ({ ...p, avatar_url: url }));
    }
    window.addEventListener("masail:avatar-updated", onAvatarUpdated);
    return () => window.removeEventListener("masail:avatar-updated", onAvatarUpdated);
  }, []);


  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (collapsed) setMenuOpen(false);
  }, [collapsed]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Lock the root html/body so only the dashboard's main content area scrolls.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlHeight = html.style.height;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyHeight = body.style.height;

    html.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.height = "100%";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      html.style.height = prevHtmlHeight;
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;
    };
  }, []);

  const gated =
    role === "user" && (approvalStatus === "pending_approval" || approvalStatus === "rejected");
  const nav = deactivated || gated ? [] : getNavForRole(role);

  async function handleLogout() {
    await supabase.auth.signOut();
    clearPlatformTheme();
    navigate({ to: "/" });
  }

  async function handleRequestAgain() {
    if (!profile.user_id) return;
    setRequesting(true);
    setRequestError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: "pending_approval" })
      .eq("id", profile.user_id);
    setRequesting(false);
    if (error) {
      setRequestError(
        "Something went wrong. Please try again or contact your mosque admin directly.",
      );
      return;
    }
    setApprovalStatus("pending_approval");
  }


  const initials = (profile.full_name || profile.email || "U")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!themeReady) return <ThemeLoadingScreen />;

  return (
    <div className="h-screen overflow-hidden bg-surface text-foreground flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 bg-primary px-4 text-white shadow-sm md:px-6">
        {!deactivated && !gated && (
          <button
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}
        {!deactivated && !gated && (
          <button
            aria-label="Toggle sidebar"
            onClick={() => setCollapsed((v) => !v)}
            className="hidden h-10 w-10 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20 md:grid"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Link to="/dashboard" className="flex items-center gap-2">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Masail" className="h-10 w-auto" />
          ) : (
            <span className="font-heading text-xl font-bold tracking-tight md:text-2xl">
              Masail Portal
            </span>
          )}
        </Link>
        {!deactivated && !gated && (
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell userId={profile.user_id} role={role} />
          </div>
        )}
      </header>

      {deactivated ? (
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 md:py-12">
          <div className="mx-auto w-full max-w-xl rounded-lg border border-border bg-card p-10 text-center shadow-sm">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Your account has been deactivated
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Your scholar account at this mosque has been deactivated by the mosque
              administrator. If you believe this is a mistake, please contact your mosque admin
              directly.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </main>
      ) : gated ? (
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 md:py-12">
          <div className="mx-auto w-full max-w-xl rounded-lg border border-border bg-card p-10 text-center shadow-sm">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {approvalStatus === "rejected" ? "Signup Not Approved" : "Awaiting Approval"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {approvalStatus === "rejected"
                ? "Your signup request was not approved. Please contact your mosque admin for more information."
                : "Your account is awaiting approval from your mosque admin. You'll be notified once approved."}
            </p>
            {requestError && <p className="mt-3 text-sm text-muted-foreground">{requestError}</p>}
          </div>
          <div className="mt-6 flex w-full max-w-xl flex-col items-center justify-center gap-3 sm:flex-row">
            {approvalStatus === "rejected" && (
              <button
                onClick={handleRequestAgain}
                disabled={requesting}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
              >
                {requesting ? "Requesting..." : "Request Again"}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </main>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <aside
            className={`${
              mobileOpen ? "block" : "hidden"
            } fixed inset-x-0 top-16 z-10 h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-card md:static md:z-0 md:block md:h-full md:shrink-0 md:overflow-hidden md:border-b-0 md:border-r md:border-border md:bg-surface md:transition-[width] md:duration-200 md:ease-out ${
              collapsed ? "md:w-20" : "md:w-72"
            }`}
          >
            <div className={`flex h-full flex-col justify-between ${collapsed ? "p-3 md:p-3" : "p-4 md:p-6"}`}>
              <nav className="space-y-1.5">
                {nav.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(item.to + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 rounded-lg text-sm font-semibold transition ${
                        collapsed ? "justify-center px-2 py-3" : "px-4 py-3"
                      } ${
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>

              <div className={`mt-6 border-t border-border ${collapsed ? "pt-3" : "pt-4"}`}>
                <div ref={menuRef} className={`relative flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
                  {collapsed ? (
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-heading text-sm font-bold text-primary"
                      title={profile.full_name ?? "Account"}
                    >
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name ?? "User"}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                  ) : (
                    <>
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name ?? "User"}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-heading text-sm font-bold text-primary">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {profile.full_name ?? "Signed in"}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {profile.email ?? ""}
                        </div>
                      </div>
                      <button
                        aria-label="Open menu"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((v) => !v)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  {!collapsed && menuOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-border bg-card p-1 shadow-lg">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="h-full flex-1 min-w-0 overflow-y-auto transition-[width] duration-200 ease-out">
            <div className="mx-auto max-w-6xl px-6 py-10 md:py-12">
              {gated ? (
                <div className="flex min-h-[60vh] items-center justify-center">
                  <div className="w-full max-w-lg rounded-lg border border-border bg-card p-10 text-center shadow-sm">
                    <h1 className="font-heading text-2xl font-bold text-foreground">
                      {approvalStatus === "rejected" ? "Signup Not Approved" : "Awaiting Approval"}
                    </h1>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {approvalStatus === "rejected"
                        ? "Your signup request was not approved. Please contact your mosque admin for more information."
                        : "Your account is awaiting approval from your mosque admin. You'll be notified once approved."}
                    </p>
                    {approvalStatus === "rejected" && (
                      <>
                        <button
                          onClick={handleRequestAgain}
                          disabled={requesting}
                          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
                        >
                          {requesting ? "Requesting..." : "Request Again"}
                        </button>
                        {requestError && (
                          <p className="mt-3 text-sm text-muted-foreground">{requestError}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {profile.must_change_password && profile.user_id && profile.email && (
                    <PasswordChangeBanner userId={profile.user_id} email={profile.email} />
                  )}
                  <Outlet />
                </>
              )}
            </div>
          </main>

        </div>
      )}
    </div>
  );
}
