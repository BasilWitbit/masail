import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Activity, LayoutDashboard, LogOut, Palette, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearPlatformTheme } from "@/lib/use-platform-theme";

const NAV = [
  { to: "/ssa", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/ssa/super-admins", label: "Super Admins", icon: ShieldCheck, exact: false },
  { to: "/ssa/settings", label: "Settings", icon: Palette, exact: false },
  { to: "/ssa/audit", label: "Audit", icon: Activity, exact: false },
] as const;

export function SsaShell({ logoUrl, children }: { logoUrl?: string | null; children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleLogout() {
    await supabase.auth.signOut();
    clearPlatformTheme();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-surface text-foreground">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-4 bg-primary px-4 text-white shadow-sm md:px-6">
        <Link to="/ssa" className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Masail" className="h-10 w-auto" />
          ) : (
            <span className="font-heading text-xl font-bold tracking-tight md:text-2xl">
              Masail Platform
            </span>
          )}
        </Link>
        <span className="hidden text-xs font-semibold uppercase tracking-wide text-white/70 sm:inline">
          Platform owner
        </span>
        <button
          onClick={handleLogout}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </header>

      <nav className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 md:px-6">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">{children}</main>
    </div>
  );
}
