import { Link } from "@tanstack/react-router";
import { usePlatformTheme } from "@/lib/use-platform-theme";

export function SiteHeader({ active }: { active?: "home" | "qa" }) {
  const settings = usePlatformTheme();

  return (
    <header className="sticky top-0 z-50 bg-primary text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Masail" className="h-10 w-auto" />
          ) : (
            <span className="font-heading text-2xl font-bold tracking-tight">MASAIL</span>
          )}
        </Link>
        <nav className="hidden items-center gap-10 md:flex">
          <NavItem to="/" label="Home" active={active === "home"} />
          <NavItem to="/qa" label="Public Q&A" active={active === "qa"} />
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <button className="hidden text-sm font-medium text-white/90 hover:text-white md:inline">
              Sign In
            </button>
          </Link>
          <Link to="/signup">
            <button className="hidden text-sm font-medium text-white/90 hover:text-white md:inline">
              Sign Up
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, label, active }: { to: string; label: string; active?: boolean }) {
  return (
    <Link
      to={to}
      className={`relative text-sm font-medium transition ${
        active ? "text-white" : "text-white/80 hover:text-white"
      }`}
    >
      {label}
      {active && (
        <span
          className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full"
          style={{ background: "var(--secondary)" }}
        />
      )}
    </Link>
  );
}
