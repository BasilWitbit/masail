import { createFileRoute } from "@tanstack/react-router";
import { QALibraryPanel } from "@/components/qa-library-panel";

export const Route = createFileRoute("/_authenticated/dashboard/library")({
  component: () => <QALibraryPanel variant="embedded" />,
});
