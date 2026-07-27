import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dashboard-placeholder";

export const Route = createFileRoute("/_authenticated/dashboard/public-content")({
  component: () => (
    <Placeholder
      title="Public Content"
      description="Public Content management coming soon."
    />
  ),
});
