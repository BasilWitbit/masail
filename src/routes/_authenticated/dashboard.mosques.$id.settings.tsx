import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Placeholder } from "@/components/dashboard-placeholder";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/mosques/$id/settings")({
  beforeLoad: requireRole(["super_admin"]),
  component: MosqueSettingsPlaceholder,
});

function MosqueSettingsPlaceholder() {
  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/mosques"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Manage Mosques
      </Link>
      <Placeholder
        title="Mosque Settings"
        description="Per-mosque settings will be available here shortly."
      />
    </div>
  );
}
