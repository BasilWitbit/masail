import { Loader2 } from "lucide-react";

/**
 * Neutral (unthemed) full-screen loader shown while platform theme
 * settings are being resolved. Uses plain white/gray only so no
 * incorrect brand color can flash before the real theme is applied.
 */
export function ThemeLoadingScreen() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#ffffff" }}
      aria-busy="true"
    >
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#9ca3af" }} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
