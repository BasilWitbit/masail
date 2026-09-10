import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, ThumbsDown, ThumbsUp, CheckCircle2, Download, Loader2, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RichText } from "@/components/rich-text";

type Attachment = { path: string; name: string; url: string };

async function downloadBlob(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("download failed");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function QuestionAttachments({ paths }: { paths: string[] }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.storage
        .from("question-attachments")
        .createSignedUrls(paths, 60 * 60);
      if (!active) return;
      const list: Attachment[] = (data ?? [])
        .map((d, i) => {
          const path = (d as { path?: string | null }).path ?? paths[i];
          if (!d.signedUrl || !path) return null;
          return { path, name: path.split("/").pop() ?? path, url: d.signedUrl };
        })
        .filter((x): x is Attachment => x !== null);
      setItems(list);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [paths.join("|")]);

  async function handleDownload(item: Attachment) {
    setBusy(item.path);
    setError(null);
    try {
      await downloadBlob(item.url, item.name);
    } catch {
      setError("Could not download the file. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Attachments
        </h2>
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading attachments…
        </p>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-6">
      <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Attachments
      </h2>
      <ul className="mt-3 divide-y divide-border">
        {items.map((item) => (
          <li key={item.path} className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{item.name}</span>
            </span>
            <button
              type="button"
              onClick={() => handleDownload(item)}
              disabled={busy === item.path}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
              style={{
                color: "var(--primary)",
                borderColor: "color-mix(in oklab, var(--primary) 30%, transparent)",
              }}
            >
              {busy === item.path ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}


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

type QuestionRow = {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
  is_urgent: boolean;
  status: QuestionStatus;
  asker_id: string | null;
  attachment_urls: string[] | null;
  categories: { name: string } | null;
};

type AnswerRow = { id: string; body: string; created_at: string };
type FeedbackRow = { id: string; is_helpful: boolean; comment: string | null };

export const Route = createFileRoute("/_authenticated/dashboard/questions/$id")({
  component: QuestionDetail,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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

function QuestionDetail() {
  const { id } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionRow | null>(null);
  const [answer, setAnswer] = useState<AnswerRow | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow | null>(null);

  const [choice, setChoice] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (active) setLoading(false);
        return;
      }
      const uid = userData.user.id;
      if (active) setUserId(uid);

      const { data: q } = await supabase
        .from("questions")
        .select(
          "id, title, body, created_at, is_urgent, status, asker_id, attachment_urls, categories(name)",
        )
        .eq("id", id)
        .eq("asker_id", uid)
        .maybeSingle();

      if (!active) return;
      const qRow = q as unknown as QuestionRow | null;
      setQuestion(qRow);

      if (qRow && (qRow.status === "sent_to_user" || qRow.status === "published")) {
        const [{ data: a }, { data: f }] = await Promise.all([
          supabase
            .from("answers")
            .select("id, body, created_at")
            .eq("question_id", qRow.id)
            .eq("status", "sent_to_user")
            .maybeSingle(),
          supabase
            .from("feedback")
            .select("id, is_helpful, comment")
            .eq("question_id", qRow.id)
            .eq("user_id", uid)
            .maybeSingle(),
        ]);
        if (!active) return;
        setAnswer((a as AnswerRow | null) ?? null);
        setFeedback((f as FeedbackRow | null) ?? null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function submitFeedback() {
    if (!question || !userId || choice === null) return;
    setSubmitting(true);
    setSubmitError(null);
    const { data, error } = await supabase
      .from("feedback")
      .insert({
        question_id: question.id,
        user_id: userId,
        is_helpful: choice,
        comment: comment.trim() ? comment.trim() : null,
      })
      .select("id, is_helpful, comment")
      .maybeSingle();
    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setFeedback(data as FeedbackRow);
  }

  const backLink = (
    <Link
      to="/dashboard/questions"
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to My Questions
    </Link>
  );

  if (loading) {
    return (
      <div>
        {backLink}
        <div className="mt-8 space-y-3">
          <div className="h-32 animate-pulse rounded-lg border border-border bg-muted/40" />
          <div className="h-48 animate-pulse rounded-lg border border-border bg-muted/40" />
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div>
        {backLink}
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/40 p-16 text-center">
          <h1 className="font-heading text-2xl font-bold text-primary">
            Question not found
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            This question doesn't exist or isn't available to you.
          </p>
          <Link
            to="/dashboard/questions"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Questions
          </Link>
        </div>
      </div>
    );
  }

  const title =
    question.title && question.title.trim().length > 0
      ? question.title
      : question.body.length > 120
        ? question.body.slice(0, 120).trim() + "…"
        : question.body;

  return (
    <div>
      {backLink}

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
        {question.categories?.name && (
          <span
            className="rounded-md px-2 py-1 font-medium"
            style={{
              background: "color-mix(in oklab, var(--primary) 6%, transparent)",
              color: "var(--primary)",
            }}
          >
            {question.categories.name}
          </span>
        )}
        {question.is_urgent && (
          <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700">
            <AlertCircle className="h-3 w-3" />
            Urgent
          </span>
        )}
        <span
          className="rounded-md px-2.5 py-1 font-semibold"
          style={statusStyle(question.status)}
        >
          {STATUS_LABELS[question.status]}
        </span>
      </div>

      <h1 className="mt-4 font-heading text-3xl font-bold text-primary md:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Submitted on {formatDate(question.created_at)}
      </p>

      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your Question
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-foreground">
          {question.body}
        </p>
      </div>

      {question.attachment_urls && question.attachment_urls.length > 0 && (
        <QuestionAttachments paths={question.attachment_urls} />
      )}

      {question.status === "reported" ? (
        <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-8 text-center">
          <h3 className="font-heading text-lg font-bold text-foreground">Under Review</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Your question has been flagged for review by our team. We'll update you once
            this has been resolved.
          </p>
        </div>
      ) : question.status !== "sent_to_user" && question.status !== "published" ? (
        <div
          className="mt-6 rounded-2xl p-8 text-center"
          style={{
            background: "color-mix(in oklab, var(--primary) 5%, transparent)",
            border: "1px solid color-mix(in oklab, var(--primary) 15%, transparent)",
          }}
        >
          <h3 className="font-heading text-lg font-bold text-primary">
            {STATUS_LABELS[question.status]}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            A scholar is working on your question. You'll be notified by email once
            it's answered.
          </p>
        </div>
      ) : answer ? (
        <>
          <div
            className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            style={{
              borderTop: "4px solid var(--secondary)",
            }}
          >
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className="h-5 w-5"
                  style={{ color: "var(--secondary)" }}
                />
                <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-primary">
                  Scholar's Answer
                </h2>
              </div>
              <RichText html={answer.body} className="mt-4 text-base leading-[1.8] text-foreground" />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-card p-6">
            <h3 className="font-heading text-base font-bold text-primary">
              Was this answer helpful?
            </h3>
            {feedback ? (
              <div
                className="mt-4 flex items-center gap-3 rounded-lg p-4"
                style={{
                  background: "color-mix(in oklab, var(--primary) 5%, transparent)",
                  border:
                    "1px solid color-mix(in oklab, var(--primary) 15%, transparent)",
                }}
              >
                {feedback.is_helpful ? (
                  <ThumbsUp className="h-5 w-5" style={{ color: "var(--primary)" }} />
                ) : (
                  <ThumbsDown className="h-5 w-5" style={{ color: "var(--primary)" }} />
                )}
                <div>
                  <p className="font-heading text-sm font-semibold text-primary">
                    Thanks for your feedback!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You marked this answer as{" "}
                    {feedback.is_helpful ? "Helpful" : "Not Helpful"}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setChoice(true)}
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition"
                    style={
                      choice === true
                        ? {
                            background: "var(--primary)",
                            color: "var(--primary-foreground)",
                            borderColor: "var(--primary)",
                          }
                        : {
                            background: "transparent",
                            color: "var(--primary)",
                            borderColor:
                              "color-mix(in oklab, var(--primary) 30%, transparent)",
                          }
                    }
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Helpful
                  </button>
                  <button
                    type="button"
                    onClick={() => setChoice(false)}
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition"
                    style={
                      choice === false
                        ? {
                            background: "var(--primary)",
                            color: "var(--primary-foreground)",
                            borderColor: "var(--primary)",
                          }
                        : {
                            background: "transparent",
                            color: "var(--primary)",
                            borderColor:
                              "color-mix(in oklab, var(--primary) 30%, transparent)",
                          }
                    }
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Not Helpful
                  </button>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Additional comments (optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    placeholder="Share any thoughts about this answer…"
                  />
                </div>
                {submitError && (
                  <p className="text-sm text-red-600">{submitError}</p>
                )}
                <button
                  type="button"
                  onClick={submitFeedback}
                  disabled={choice === null || submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit Feedback"}
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          The answer for this question is not available yet.
        </div>
      )}
    </div>
  );
}
