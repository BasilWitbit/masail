import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, HelpCircle, LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformTheme } from "@/lib/use-platform-theme";
import { getNavForRole, type UserRole } from "@/lib/use-dashboard-nav";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardShell,
});

type ProfileInfo = {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

function DashboardShell() {
  const settings = usePlatformTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<ProfileInfo>({ full_name: null, email: null, avatar_url: null });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("role, full_name, avatar_url")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (!active) return;
      setRole(((data?.role as UserRole) ?? "user"));
      setProfile({
        full_name: (data?.full_name as string | null) ?? null,
        email: userData.user.email ?? null,
        avatar_url: (data?.avatar_url as string | null) ?? null,
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const nav = getNavForRole(role);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const initials = (profile.full_name || profile.email || "U")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-surface text-foreground flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-4 bg-primary px-4 text-white shadow-sm md:px-6">
        <button
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20 md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="hidden h-10 w-10 place-items-center rounded-lg bg-white/10 md:grid">
          <Menu className="h-5 w-5" />
        </div>
        <Link to="/dashboard" className="flex items-center gap-2">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Masail" className="h-8 w-auto rounded-md bg-white p-1" />
          ) : (
            <span className="font-heading text-xl font-bold tracking-tight md:text-2xl">
              Masail Portal
            </span>
          )}
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <button
            aria-label="Notifications"
            className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/10"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button
            aria-label="Help"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/40 transition hover:bg-white/10"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside
          className={`${
            mobileOpen ? "block" : "hidden"
          } absolute inset-x-0 top-16 z-10 border-b border-border bg-card md:static md:z-0 md:block md:w-72 md:shrink-0 md:border-b-0 md:border-r md:border-border md:bg-surface`}
        >
          <div className="flex h-full flex-col justify-between p-4 md:p-6">
            <nav className="space-y-1.5">
              {nav.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 space-y-4 border-t border-border pt-4">
              <div className="flex items-center gap-3">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name ?? "User"}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 font-heading text-sm font-bold text-primary">
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
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-transparent px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-6xl px-6 py-10 md:py-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
