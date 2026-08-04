import { createFileRoute } from "@tanstack/react-router";
import { QALibraryPanel } from "@/components/qa-library-panel";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/library")({
  beforeLoad: requireRole(["user"]),
  component: () => <QALibraryPanel variant="embedded" />,
});
