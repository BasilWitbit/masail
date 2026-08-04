import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dashboard-placeholder";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/public-content")({
  beforeLoad: requireRole(["super_admin"]),
  component: () => (
    <Placeholder
      title="Public Content"
      description="Public Content management coming soon."
    />
  ),
});
