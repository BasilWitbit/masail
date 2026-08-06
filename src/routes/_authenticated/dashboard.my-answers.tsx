import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, BookOpenCheck, Download, FileText, Loader2, MessageSquareWarning, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requireRole } from "@/lib/require-role";


export const Route = createFileRoute("/_authenticated/dashboard/my-answers")({
  beforeLoad: requireRole(["shaykh"]),
  component: MyAnswers,
});

type Tab = "drafts" | "submitted" | "needs_revision" | "completed";

const TABS: { key: Tab; label: string; empty: string }[] = [
  { key: "drafts", label: "Drafts", empty: "No drafts right now." },
  { key: "submitted", label: "Submitted", empty: "Nothing submitted yet." },
  { key: "needs_revision", label: "Needs Revision", empty: "No answers need revision right now." },
  { key: "completed", label: "Completed", empty: "Nothing completed yet." },
];

type AnswerRow = {
  id: string;
  body: string;
  status: "draft" | "submitted" | "under_peer_review" | "peer_approved" | "sent_to_user";
  updated_at: string;
  shaykh_id: string;
};

type Row = {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  is_urgent: boolean;
  is_anonymous: boolean;
  is_private: boolean;
  status: string;
  asker_id: string | null;
  category_id: string | null;
  mosque_id: string;
  attachment_urls: string[] | null;
  categories: { name: string } | null;
  answers: AnswerRow | null;
};


const STATUS_LABEL: Record<AnswerRow["status"], string> = {
  draft: "Draft",
  submitted: "Submitted for peer review",
  under_peer_review: "Under peer review",
  peer_approved: "Peer approved",
  sent_to_user: "Sent to user",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncate(text: string, n = 160) {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

function myAnswer(r: Row, shaykhId: string | null) {
  if (!r.answers) return null;
  if (!shaykhId || r.answers.shaykh_id === shaykhId) return r.answers;
  return null;
}

function Tag({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "muted" }) {
  if (tone === "muted") {
    return (
      <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
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

function MyAnswers() {
  const [tab, setTab] = useState<Tab>("drafts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shaykhId, setShaykhId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [reload, setReload] = useState(0);
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());


  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error("You must be signed in.");
        const { data: shaykh, error: sErr } = await supabase
          .from("shaykhs")
          .select("id")
          .eq("profile_id", userData.user.id)
          .maybeSingle();
        if (sErr) throw sErr;
        if (!shaykh) throw new Error("You are not registered as a shaykh.");
        if (!active) return;
        setShaykhId(shaykh.id as string);

        const { data, error: qErr } = await supabase
          .from("questions")
          .select(
            "id, title, body, created_at, updated_at, is_urgent, is_anonymous, is_private, status, asker_id, category_id, mosque_id, categories(name), answers(id, body, status, updated_at, shaykh_id)",
          )
          .eq("claimed_by", shaykh.id as string)
          .order("updated_at", { ascending: false });
        if (qErr) throw qErr;
        if (!active) return;
        const list = (data as unknown as Row[]) ?? [];
        setRows(list);

        if (list.length > 0) {
          const { data: pub } = await supabase
            .from("published_qa")
            .select("question_id")
            .in("question_id", list.map((r) => r.id));
          if (!active) return;
          setPublishedIds(new Set((pub ?? []).map((p) => p.question_id as string)));
        } else {
          setPublishedIds(new Set());
        }



        const answerIds = list
          .filter((r) => r.status === "needs_revision")
          .map((r) => r.answers)
          .filter((a): a is AnswerRow => !!a && (!shaykh.id || a.shaykh_id === (shaykh.id as string)))
          .map((a) => a.id);
        if (answerIds.length > 0) {
          const { data: reviews } = await supabase
            .from("peer_reviews")
            .select("answer_id, comments, created_at")
            .in("answer_id", answerIds)
            .eq("decision", "sent_back")
            .order("created_at", { ascending: false });
          if (!active) return;
          const map: Record<string, string> = {};
          for (const rev of reviews ?? []) {
            const key = rev.answer_id as string;
            if (!(key in map) && rev.comments) map[key] = rev.comments as string;
          }
          setReviewComments(map);
        } else {
          setReviewComments({});
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  const buckets = useMemo(() => {
    const out: Record<Tab, Row[]> = {
      drafts: [],
      submitted: [],
      needs_revision: [],
      completed: [],
    };
    for (const r of rows) {
      const a = myAnswer(r, shaykhId);
      if (r.status === "needs_revision") out.needs_revision.push(r);
      else if (!a || a.status === "draft") out.drafts.push(r);
      else if (a.status === "submitted" || a.status === "under_peer_review") out.submitted.push(r);
      else if (a.status === "sent_to_user") out.completed.push(r);
    }
    return out;
  }, [rows, shaykhId]);

  if (selected) {
    const a = myAnswer(selected, shaykhId);
    const needsRevision = selected.status === "needs_revision";
    const editable = needsRevision || !a || a.status === "draft";
    return (
      <Detail
        row={selected}
        answer={a}
        editable={editable}
        revisionComment={needsRevision && a ? (reviewComments[a.id] ?? null) : null}
        shaykhId={shaykhId}
        isPublished={publishedIds.has(selected.id)}
        onPublished={() => setPublishedIds((prev) => new Set(prev).add(selected.id))}
        onBack={() => setSelected(null)}

        onSaved={() => {
          setSelected(null);
          setTab(needsRevision ? "needs_revision" : "drafts");
          setReload((n) => n + 1);
        }}
        onSubmitted={() => {
          setSelected(null);
          setTab("submitted");
          setReload((n) => n + 1);
        }}
      />
    );
  }

  const active = TABS.find((t) => t.key === tab)!;
  const list = buckets[tab];

  return (
    <div>
      <div className="max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">My Answers</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Questions you've claimed, grouped by where they are in the review process.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 rounded-lg border border-border bg-card p-2 shadow-sm">
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition"
              style={
                on
                  ? { background: "var(--primary)", color: "var(--primary-foreground)" }
                  : { color: "var(--muted-foreground)" }
              }
            >
              {t.label}
              <span className="ml-2 text-xs opacity-70">{buckets[t.key].length}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        ) : list.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center shadow-sm">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "color-mix(in oklab, var(--primary) 10%, transparent)" }}
            >
              <FileText className="h-6 w-6" style={{ color: "var(--primary)" }} />
            </div>
            <p className="mt-4 font-heading text-lg font-semibold text-foreground">{active.empty}</p>
          </div>
        ) : (
          <ul className="grid gap-4">
            {list.map((r) => {
              const a = myAnswer(r, shaykhId);
              const date = tab === "drafts" ? (a?.updated_at ?? r.updated_at) : (a?.updated_at ?? r.updated_at);
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setSelected(r)}
                    className="w-full rounded-lg border border-border bg-card p-5 text-left shadow-sm transition hover:border-primary/40 hover:shadow md:p-6"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {r.is_urgent && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          <AlertTriangle className="h-3 w-3" /> Urgent
                        </span>
                      )}
                      {r.categories?.name && <Tag>{r.categories.name}</Tag>}
                      {r.status === "needs_revision" ? (
                        <Tag tone="muted">Needs revision</Tag>
                      ) : (
                        a && <Tag tone="muted">{STATUS_LABEL[a.status]}</Tag>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">{formatDate(date)}</span>
                    </div>
                    <h2 className="mt-3 font-heading text-lg font-semibold text-foreground">
                      {r.title?.trim() || truncate(r.body, 90)}
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">{truncate(r.body)}</p>
                    {r.status === "needs_revision" && a && reviewComments[a.id] && (
                      <div
                        className="mt-4 rounded-lg border p-4"
                        style={{
                          background: "color-mix(in oklab, var(--secondary) 12%, transparent)",
                          borderColor: "color-mix(in oklab, var(--secondary) 40%, transparent)",
                        }}
                      >
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <MessageSquareWarning className="h-4 w-4" /> Reviewer's comment
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">
                          {reviewComments[a.id]}
                        </p>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Detail({
  row,
  answer,
  editable,
  revisionComment = null,
  shaykhId,
  isPublished = false,
  onPublished,
  onBack,
  onSaved,
  onSubmitted,
}: {
  row: Row;
  answer: AnswerRow | null;
  editable: boolean;
  revisionComment?: string | null;
  shaykhId: string | null;
  isPublished?: boolean;
  onPublished?: () => void;
  onBack: () => void;
  onSaved: () => void;
  onSubmitted: () => void;
}) {
  const [body, setBody] = useState(answer?.body ?? "");
  const [busy, setBusy] = useState<"draft" | "submit" | null>(null);
  const [published, setPublished] = useState(isPublished);
  const [showPublish, setShowPublish] = useState(false);
  const [genericQuestion, setGenericQuestion] = useState(
    (row.title?.trim() ? `${row.title.trim()}\n\n` : "") + row.body,
  );
  const [genericAnswer, setGenericAnswer] = useState(answer?.body ?? "");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const isCompleted = answer?.status === "sent_to_user";
  const isAuthor = !!answer && !!shaykhId && answer.shaykh_id === shaykhId;

  async function submitPublish(e: React.FormEvent) {
    e.preventDefault();
    if (!genericQuestion.trim() || !genericAnswer.trim()) {
      setPublishError("Both the generic question and answer are required.");
      return;
    }
    setPublishing(true);
    setPublishError(null);
    try {
      const { error: insErr } = await supabase.from("published_qa").insert({
        question_id: row.id,
        published_by_shaykh_id: shaykhId!,
        generic_question: genericQuestion.trim(),
        generic_answer: genericAnswer.trim(),
        category_id: row.category_id,
        mosque_id: row.mosque_id,
      });
      if (insErr) throw insErr;
      const { error: qErr } = await supabase
        .from("questions")
        .update({ status: "published" })
        .eq("id", row.id);
      if (qErr) throw qErr;
      setPublished(true);
      setShowPublish(false);
      onPublished?.();
      toast.success("Published to the knowledge base");
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Could not publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  }


  async function persist(): Promise<string> {
    if (!shaykhId) throw new Error("Missing shaykh id.");
    if (!body.trim()) throw new Error("Please write an answer first.");
    if (answer) {
      const { error } = await supabase
        .from("answers")
        .update({ body, status: "draft", updated_at: new Date().toISOString() })
        .eq("id", answer.id);
      if (error) throw error;
      return answer.id;
    }
    const { data, error } = await supabase
      .from("answers")
      .insert({ question_id: row.id, shaykh_id: shaykhId, body, status: "draft" })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async function saveDraft() {
    setBusy("draft");
    try {
      await persist();
      toast.success("Draft saved");
      onSaved();
    } catch (err) {
      toast.error("Could not save draft", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  async function submitForReview() {
    setBusy("submit");
    try {
      const answerId = await persist();
      const { error: aErr } = await supabase
        .from("answers")
        .update({ status: "submitted", updated_at: new Date().toISOString() })
        .eq("id", answerId);
      if (aErr) throw aErr;
      const { error: qErr } = await supabase
        .from("questions")
        .update({ status: "pending_peer_review" })
        .eq("id", row.id);
      if (qErr) throw qErr;
      toast.success("Submitted for peer review");
      onSubmitted();
    } catch (err) {
      toast.error("Could not submit", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Answers
      </button>

      {revisionComment && (
        <div
          className="mt-4 rounded-lg border p-5"
          style={{
            background: "color-mix(in oklab, var(--secondary) 12%, transparent)",
            borderColor: "color-mix(in oklab, var(--secondary) 40%, transparent)",
          }}
        >
          <div className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
            <MessageSquareWarning className="h-4 w-4" /> Reviewer asked for revisions
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {revisionComment}
          </p>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {row.is_urgent && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
              <AlertTriangle className="h-3 w-3" /> Urgent
            </span>
          )}
          {row.categories?.name && <Tag>{row.categories.name}</Tag>}
          {answer && <Tag tone="muted">{STATUS_LABEL[answer.status]}</Tag>}
          <span className="ml-auto text-xs text-muted-foreground">{formatDate(row.created_at)}</span>
        </div>
        <h1 className="mt-4 font-heading text-2xl font-bold text-primary">
          {row.title?.trim() || truncate(row.body, 90)}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Asked by {row.is_anonymous ? "Anonymous" : "a member of your mosque"}
        </p>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{row.body}</p>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-primary">
          {editable ? "Your Answer" : "Answer"}
        </h2>
        {editable ? (
          <>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Write your answer here…"
              className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <button
                onClick={saveDraft}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                {busy === "draft" && <Loader2 className="h-4 w-4 animate-spin" />} Save Draft
              </button>
              <button
                onClick={submitForReview}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
              >
                {busy === "submit" && <Loader2 className="h-4 w-4 animate-spin" />} Submit for Peer Review
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {answer?.body}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Status: {answer ? STATUS_LABEL[answer.status] : "—"} · Updated{" "}
              {answer ? formatDate(answer.updated_at) : "—"}
            </p>
            {isCompleted && (
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                {row.is_private ? (
                  <Tag tone="muted">Private — not eligible for publishing</Tag>
                ) : published ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: "color-mix(in oklab, var(--secondary) 18%, transparent)",
                      color: "color-mix(in oklab, var(--secondary) 70%, black)",
                      border: "1px solid color-mix(in oklab, var(--secondary) 45%, transparent)",
                    }}
                  >
                    <BookOpenCheck className="h-3.5 w-3.5" /> Published
                  </span>
                ) : isAuthor ? (
                  <button
                    onClick={() => {
                      setPublishError(null);
                      setShowPublish(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
                  >
                    <BookOpenCheck className="h-4 w-4" /> Publish to Knowledge Base
                  </button>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      {showPublish && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <form
            onSubmit={submitPublish}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-card p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-primary">
                Publish to Knowledge Base
              </h2>
              <button
                type="button"
                onClick={() => setShowPublish(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Reword these to remove any personal or identifying details before publishing. This
              will be visible to the public.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-semibold" htmlFor="generic-question">
                  Generic Question
                </label>
                <textarea
                  id="generic-question"
                  required
                  rows={5}
                  value={genericQuestion}
                  onChange={(e) => setGenericQuestion(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-sm font-semibold" htmlFor="generic-answer">
                  Generic Answer
                </label>
                <textarea
                  id="generic-answer"
                  required
                  rows={8}
                  value={genericAnswer}
                  onChange={(e) => setGenericAnswer(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {publishError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {publishError}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPublish(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={publishing}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
                {publishing ? "Publishing…" : "Publish"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

