import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dashboard-placeholder";

export const Route = createFileRoute("/_authenticated/dashboard/ui-settings")({
  component: () => (
    <Placeholder
      title="UI Settings"
      description="UI Settings management coming soon."
    />
  ),
});
