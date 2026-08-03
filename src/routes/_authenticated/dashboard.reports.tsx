import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flag, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/reports")({
  component: Reports,
});

type Item = {
  id: string;
  reason: "spam" | "abusive" | "other";
  notes: string | null;
  created_at: string;
  question_id: string;
  questions: {
    id: string;
    title: string | null;
    body: string;
    status: string;
    is_anonymous: boolean;
    categories: { name: string } | null;
    mosques: { name: string } | null;
  } | null;
  shaykhs: { profiles: { full_name: string | null } | null } | null;
};

const REASON_LABEL: Record<Item["reason"], string> = {
  spam: "Spam",
  abusive: "Abusive",
  other: "Other",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Tag({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "muted" | "danger";
}) {
  if (tone === "muted") {
    return (
      <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        {children}
      </span>
    );
  }
  if (tone === "danger") {
    return (
      <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        {children}
      </span>
    );
  }
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        background: "color-mix(in oklab, var(--primary) 10%, transparent)",
        color: "var(--primary)",
        border: "1px solid color-mix(in oklab, var(--primary) 20%, transparent)",
      }}
    >
      {children}
    </span>
  );
}

type Pending = { item: Item; action: "dismiss" | "reject" };

function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rErr } = await supabase
          .from("reports")
          .select(
            "id, reason, notes, created_at, question_id, questions(id, title, body, status, is_anonymous, categories(name), mosques(name)), shaykhs(profiles(full_name))",
          )
          .order("created_at", { ascending: false });
        if (rErr) throw rErr;
        if (!active) return;
        const list = ((data as unknown as Item[]) ?? []).filter(
          (r) => r.questions?.status === "reported",
        );
        setItems(list);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load reports.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const confirmAction = async () => {
    if (!pending) return;
    const { item, action } = pending;
    setBusy(true);
    try {
      const { error: uErr } = await supabase
        .from("questions")
        .update({ status: action === "dismiss" ? "in_pool" : "rejected" })
        .eq("id", item.question_id);
      if (uErr) throw uErr;
      setItems((prev) => prev.filter((r) => r.id !== item.id));
      setPending(null);
      toast.success(
        action === "dismiss"
          ? "Report dismissed — question returned to the pool."
          : "Question rejected.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update this question.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">Reports</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Questions flagged by scholars, awaiting your decision.
        </p>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center shadow-sm">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "color-mix(in oklab, var(--primary) 10%, transparent)" }}
            >
              <ShieldCheck className="h-6 w-6" style={{ color: "var(--primary)" }} />
            </div>
            <p className="mt-4 font-heading text-lg font-semibold text-foreground">
              No reports to review right now.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4">
            {items.map((r) => {
              const q = r.questions;
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone="danger">
                      <span className="inline-flex items-center gap-1">
                        <Flag className="h-3 w-3" /> {REASON_LABEL[r.reason]}
                      </span>
                    </Tag>
                    {q?.categories?.name && <Tag>{q.categories.name}</Tag>}
                    {q?.mosques?.name && <Tag tone="muted">{q.mosques.name}</Tag>}
                    <span className="ml-auto text-xs text-muted-foreground">
                      Reported {formatDate(r.created_at)}
                    </span>
                  </div>

                  <h2 className="mt-3 font-heading text-lg font-semibold text-foreground">
                    {q?.title?.trim() || "Untitled question"}
                  </h2>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
                    {q?.body}
                  </p>

                  {r.notes?.trim() && (
                    <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Reporter notes
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">
                        {r.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                    <span className="text-xs text-muted-foreground">
                      Reported by {r.shaykhs?.profiles?.full_name?.trim() || "a scholar"} on{" "}
                      {formatDate(r.created_at)}
                    </span>
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => setPending({ item: r, action: "dismiss" })}
                        className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => setPending({ item: r, action: "reject" })}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-heading text-lg font-bold text-foreground">
                {pending.action === "dismiss" ? "Dismiss this report?" : "Reject this question?"}
              </h3>
              <button
                onClick={() => setPending(null)}
                className="text-muted-foreground transition hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {pending.action === "dismiss"
                ? "The question will return to the pool so scholars can claim it again."
                : "The question will be permanently removed from the workflow and the asker will see it as “Not Accepted”."}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setPending(null)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={busy}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${
                  pending.action === "reject" ? "bg-red-600 hover:bg-red-700" : ""
                }`}
                style={
                  pending.action === "dismiss" ? { background: "var(--primary)" } : undefined
                }
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {pending.action === "dismiss" ? "Yes, dismiss" : "Yes, reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
