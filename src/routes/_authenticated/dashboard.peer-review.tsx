import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dashboard-placeholder";

export const Route = createFileRoute("/_authenticated/dashboard/peer-review")({
  component: () => (
    <Placeholder title="Peer Review" description="Peer Review coming soon." />
  ),
});
