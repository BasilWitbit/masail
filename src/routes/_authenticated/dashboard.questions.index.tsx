import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, HelpCircle, MessageSquarePlus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type QuestionStatus =
  | "submitted"
  | "in_pool"
  | "claimed"
  | "pending_peer_review"
  | "needs_revision"
  | "peer_approved"
  | "sent_to_user"
  | "reported"
  | "rejected"
  | "published";

type QuestionRow = {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
  is_urgent: boolean;
  status: QuestionStatus;
  categories: { name: string } | null;
};

const STATUS_LABELS: Record<QuestionStatus, string> = {
  submitted: "Submitted",
  in_pool: "Waiting for a Scholar",
  claimed: "Scholar Assigned",
  pending_peer_review: "Being Reviewed",
  needs_revision: "Being Reviewed",
  peer_approved: "Almost Ready",
  sent_to_user: "Answered",
  reported: "Under Review",
  rejected: "Not Accepted",
  published: "Published",
};

function statusStyle(status: QuestionStatus): React.CSSProperties {
  if (status === "sent_to_user" || status === "published") {
    return {
      background: "color-mix(in oklab, var(--secondary) 18%, transparent)",
      color: "color-mix(in oklab, var(--secondary) 55%, #4a3a00)",
      border: "1px solid color-mix(in oklab, var(--secondary) 45%, transparent)",
    };
  }
  if (status === "rejected") {
    return {
      background: "color-mix(in oklab, #b91c1c 10%, transparent)",
      color: "#991b1b",
      border: "1px solid color-mix(in oklab, #b91c1c 25%, transparent)",
    };
  }
  if (status === "pending_peer_review" || status === "needs_revision") {
    return {
      background: "color-mix(in oklab, var(--primary) 8%, transparent)",
      color: "var(--primary)",
      border: "1px solid color-mix(in oklab, var(--primary) 20%, transparent)",
    };
  }
  return {
    background: "color-mix(in oklab, var(--primary) 8%, transparent)",
    color: "var(--primary)",
    border: "1px solid color-mix(in oklab, var(--primary) 20%, transparent)",
  };
}

export const Route = createFileRoute("/_authenticated/dashboard/questions/")({
  component: MyQuestions,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MyQuestions() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [searchText, setSearchText] = useState("");

  const filteredRows = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((q) => {
      const title = (q.title ?? "").toLowerCase();
      const body = (q.body ?? "").toLowerCase();
      const category = (q.categories?.name ?? "").toLowerCase();
      return title.includes(term) || body.includes(term) || category.includes(term);
    });
  }, [rows, searchText]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (active) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("questions")
        .select("id, title, body, created_at, is_urgent, status, categories(name)")
        .eq("asker_id", userData.user.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      setRows((data as unknown as QuestionRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
            My Questions
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track the status of every question you've submitted.
          </p>
        </div>
        <Link
          to="/dashboard/ask"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Ask a Question
        </Link>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-16 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
            >
              <HelpCircle className="h-6 w-6" style={{ color: "var(--primary)" }} />
            </div>
            <h2 className="mt-5 font-heading text-xl font-bold text-primary">
              You haven't asked any questions yet.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              When you submit a question, it will appear here with its current status.
            </p>
            <Link
              to="/dashboard/ask"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Ask Your First Question
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((q) => {
              const title =
                q.title && q.title.trim().length > 0
                  ? q.title
                  : q.body.length > 120
                    ? q.body.slice(0, 120).trim() + "…"
                    : q.body;
              return (
                <li key={q.id}>
                  <Link
                    to="/dashboard/questions/$id"
                    params={{ id: q.id }}
                    className="block rounded-lg border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading text-base font-semibold text-primary md:text-lg">
                          {title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          {q.categories?.name && (
                            <span
                              className="rounded-md px-2 py-1 font-medium"
                              style={{
                                background:
                                  "color-mix(in oklab, var(--primary) 6%, transparent)",
                                color: "var(--primary)",
                              }}
                            >
                              {q.categories.name}
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {formatDate(q.created_at)}
                          </span>
                          {q.is_urgent && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700">
                              <AlertCircle className="h-3 w-3" />
                              Urgent
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className="shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold"
                        style={statusStyle(q.status)}
                      >
                        {STATUS_LABELS[q.status]}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
