import { createFileRoute } from "@tanstack/react-router";
import { AccountSettingsPanel } from "@/components/account-settings-panel";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/account-settings")({
  beforeLoad: requireRole(["shaykh", "mosque_admin", "super_admin"]),
  component: RoleAccountSettings,
});

function RoleAccountSettings() {
  return <AccountSettingsPanel />;
}
