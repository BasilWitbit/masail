import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/questions/$id")({
  component: QuestionDetailPlaceholder,
});

function QuestionDetailPlaceholder() {
  const { id } = Route.useParams();
  return (
    <div>
      <Link
        to="/dashboard/questions"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Questions
      </Link>
      <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/40 p-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-primary">Question Detail</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Detailed view for question <span className="font-mono">{id}</span> is coming soon.
        </p>
      </div>
    </div>
  );
}
