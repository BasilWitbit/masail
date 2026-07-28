import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dashboard-placeholder";

export const Route = createFileRoute("/_authenticated/dashboard/my-answers")({
  component: () => (
    <Placeholder title="My Answers" description="My Answers coming soon." />
  ),
});
