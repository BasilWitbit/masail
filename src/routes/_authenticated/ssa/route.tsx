import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SsaShell } from "@/components/ssa-shell";
import { ThemeLoadingScreen } from "@/components/theme-loading-screen";
import { requireRole } from "@/lib/require-role";
import { usePlatformThemeGate } from "@/lib/use-platform-theme";

export const Route = createFileRoute("/_authenticated/ssa")({
  // Anyone other than the platform owner is sent to their own home (or login).
  beforeLoad: async () => {
    await requireRole(["super_super_admin"])();
  },
  component: SsaLayout,
});

function SsaLayout() {
  const { settings, ready } = usePlatformThemeGate();
  if (!ready) return <ThemeLoadingScreen />;
  return (
    <SsaShell logoUrl={settings?.logo_url}>
      <Outlet />
    </SsaShell>
  );
}
