import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dashboard-placeholder";

export const Route = createFileRoute("/_authenticated/dashboard/ask")({
  component: () => (
    <Placeholder
      title="Ask a Question"
      description="A form to submit a new question to your local scholars is coming soon."
    />
  ),
});
