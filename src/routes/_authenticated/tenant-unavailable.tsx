import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clearPlatformTheme } from "@/lib/use-platform-theme";

export const Route = createFileRoute("/_authenticated/tenant-unavailable")({
  component: TenantUnavailable,
});

function TenantUnavailable() {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    clearPlatformTheme();
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 py-10">
      <div className="w-full max-w-xl rounded-lg border border-border bg-card p-10 text-center shadow-sm">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Your account is currently disabled
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Contact your Super Super Admin to reactivate your tenant.
        </p>
      </div>
      <button
        onClick={handleLogout}
        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-accent"
      >
        <LogOut className="h-4 w-4" />
        Log Out
      </button>
    </div>
  );
}
