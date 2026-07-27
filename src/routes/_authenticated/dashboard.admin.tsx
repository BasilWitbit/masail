import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dashboard-placeholder";

export const Route = createFileRoute("/_authenticated/dashboard/admin")({
  component: () => (
    <Placeholder
      title="Super Admin Dashboard"
      description="Super Admin Dashboard coming soon."
    />
  ),
});
