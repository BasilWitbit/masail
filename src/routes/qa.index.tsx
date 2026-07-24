import { createFileRoute } from "@tanstack/react-router";
import { usePlatformTheme } from "@/lib/use-platform-theme";
import { SiteHeader } from "@/components/site-header";
import { QALibraryPanel } from "@/components/qa-library-panel";

export const Route = createFileRoute("/qa/")({
  head: () => ({
    meta: [
      { title: "Public Q&A — Masail" },
      {
        name: "description",
        content:
          "Browse verified answers from local scholars. Search the Masail public Q&A library by keyword or category.",
      },
      { property: "og:title", content: "Public Q&A — Masail" },
      {
        property: "og:description",
        content: "A growing library of trusted, scholar-reviewed answers.",
      },
    ],
  }),
  component: QAPage,
});

function QAPage() {
  usePlatformTheme();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader active="qa" />
      <QALibraryPanel variant="public" />
    </div>
  );
}
