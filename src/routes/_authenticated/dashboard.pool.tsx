import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dashboard-placeholder";

export const Route = createFileRoute("/_authenticated/dashboard/pool")({
  component: () => (
    <Placeholder title="Question Pool" description="Question Pool coming soon." />
  ),
});
