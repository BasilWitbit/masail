import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dashboard-placeholder";

export const Route = createFileRoute("/_authenticated/dashboard/reports")({
  component: () => (
    <Placeholder title="Reports" description="Reports coming soon." />
  ),
});
