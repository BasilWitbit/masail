import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dashboard-placeholder";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/mosque-admin")({
  beforeLoad: requireRole(["mosque_admin"]),
  component: () => (
    <Placeholder
      title="Mosque Admin Dashboard"
      description="Mosque Admin Dashboard coming soon."
    />
  ),
});
