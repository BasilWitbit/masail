import { Link } from "@tanstack/react-router";
import { usePlatformTheme } from "@/lib/use-platform-theme";

export function SiteHeader(_props?: { active?: "home" | "qa" }) {
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
        <nav className="hidden md:flex gap-6">
          <a href="#hero" className="hover:text-blue-200">Home</a>
          <a href="#about" className="hover:text-blue-200">About</a>
          <a href="#what-we-do" className="hover:text-blue-200">What We Do</a>
          <a href="#faqs" className="hover:text-blue-200">FAQs</a>
        </nav>
        <Link to="/login">
          <button className="rounded-lg border border-white/30 px-5 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white">
            Sign In
          </button>
        </Link>
      </div>
    </header>
  );
}
