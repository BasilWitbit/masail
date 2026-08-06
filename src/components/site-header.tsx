import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { usePlatformTheme } from "@/lib/use-platform-theme";

export function SiteHeader({ active }: { active?: "home" | "qa" }) {
  const settings = usePlatformTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-primary text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
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
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white transition hover:bg-white/10 md:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}

          </button>
        </div>
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-[72px] z-40 cursor-default bg-black/20 md:hidden"
          />
          <nav className="relative z-50 border-t border-white/15 bg-primary md:hidden">
            <MobileLink to="/" label="Home" onClick={() => setOpen(false)} />
            <MobileLink to="/qa" label="Public Q&A" onClick={() => setOpen(false)} />
            <MobileLink to="/login" label="Sign In" onClick={() => setOpen(false)} />
            <MobileLink to="/signup" label="Sign Up" onClick={() => setOpen(false)} />
          </nav>
        </>
      )}
    </header>
  );
}

function MobileLink({ to, label, onClick }: { to: string; label: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex min-h-[44px] items-center px-6 py-3 text-base font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
    >
      {label}
    </Link>
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
