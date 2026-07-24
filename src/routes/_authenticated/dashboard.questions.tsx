import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dashboard-placeholder";

export const Route = createFileRoute("/_authenticated/dashboard/questions")({
  component: () => (
    <Placeholder
      title="My Questions"
      description="Your submitted questions and their status will appear here."
    />
  ),
});
