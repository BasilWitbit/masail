import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/dashboard-placeholder";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: () => (
    <Placeholder
      title="Account Settings"
      description="Manage your profile, mosque affiliation, and preferences here soon."
    />
  ),
});
