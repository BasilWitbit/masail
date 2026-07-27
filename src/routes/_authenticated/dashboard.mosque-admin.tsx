import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dashboard-placeholder";

export const Route = createFileRoute("/_authenticated/dashboard/mosque-admin")({
  component: () => (
    <Placeholder
      title="Mosque Admin Dashboard"
      description="Mosque Admin Dashboard coming soon."
    />
  ),
});
