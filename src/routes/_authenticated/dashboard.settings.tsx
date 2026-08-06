import { createFileRoute } from "@tanstack/react-router";
import { AccountSettingsPanel } from "@/components/account-settings-panel";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  beforeLoad: requireRole(["user"]),
  component: AccountSettings,
});

function AccountSettings() {
  return <AccountSettingsPanel showMosque />;
}
