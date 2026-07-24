import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformTheme } from "@/lib/use-platform-theme";
import { getNavForRole, type UserRole } from "@/lib/use-dashboard-nav";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardShell,
});

function DashboardShell() {
  const settings = usePlatformTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [role, setRole] = useState<UserRole | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (!active) return;
      setRole(((data?.role as UserRole) ?? "user"));
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

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-white md:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Masail" className="h-8 w-auto" />
          ) : (
            <span className="font-heading text-xl font-bold tracking-tight">MASAIL</span>
          )}
        </Link>
        <button
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-md p-2 hover:bg-white/10"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          mobileOpen ? "block" : "hidden"
        } border-b border-border bg-card md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r`}
      >
        <div className="flex h-full flex-col">
          <div className="hidden items-center gap-2 border-b border-border px-6 py-5 md:flex">
            <Link to="/dashboard" className="flex items-center gap-2">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Masail" className="h-9 w-auto" />
              ) : (
                <span className="font-heading text-2xl font-bold tracking-tight text-primary">
                  MASAIL
                </span>
              )}
            </Link>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {nav.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
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

          <div className="border-t border-border p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
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
  );
}
