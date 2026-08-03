import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessageSquareWarning,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/peer-review")({
  component: PeerReview,
});

type Question = {
  id: string;
  title: string | null;
  body: string;
  is_urgent: boolean;
  is_anonymous: boolean;
  mosque_id: string;
  categories: { name: string } | null;
};

type Item = {
  id: string;
  body: string;
  status: "submitted" | "under_peer_review";
  created_at: string;
  updated_at: string;
  shaykh_id: string;
  question_id: string;
  questions: Question | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncate(text: string, n = 200) {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

function Tag({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "muted";
}) {
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

function PeerReview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shaykhId, setShaykhId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);

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
          .select("id, mosque_id")
          .eq("profile_id", userData.user.id)
          .maybeSingle();
        if (sErr) throw sErr;
        if (!shaykh) throw new Error("You are not registered as a shaykh.");
        if (!active) return;
        setShaykhId(shaykh.id as string);

        const { data, error: aErr } = await supabase
          .from("answers")
          .select(
            "id, body, status, created_at, updated_at, shaykh_id, question_id, questions(id, title, body, is_urgent, is_anonymous, mosque_id, categories(name))",
          )
          .in("status", ["submitted", "under_peer_review"])
          .neq("shaykh_id", shaykh.id as string)
          .order("created_at", { ascending: true });
        if (aErr) throw aErr;
        if (!active) return;

        const list = ((data as unknown as Item[]) ?? []).filter(
          (i) => i.questions?.mosque_id === (shaykh.mosque_id as string),
        );
        setItems(list);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load answers.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const remove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelected(null);
  };

  if (selected) {
    return (
      <ReviewDetail
        item={selected}
        shaykhId={shaykhId}
        onBack={() => setSelected(null)}
        onDone={() => remove(selected.id)}
      />
    );
  }

  return (
    <div>
      <div className="max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">Peer Review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Answers written by other scholars at your mosque, awaiting your review.
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
              No answers awaiting your review right now.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4">
            {items.map((i) => {
              const q = i.questions;
              return (
                <li key={i.id}>
                  <button
                    onClick={() => setSelected(i)}
                    className="w-full rounded-lg border border-border bg-card p-5 text-left shadow-sm transition hover:border-primary/40 hover:shadow md:p-6"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {q?.is_urgent && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          <AlertTriangle className="h-3 w-3" /> Urgent
                        </span>
                      )}
                      {q?.categories?.name && <Tag>{q.categories.name}</Tag>}
                      {q?.is_anonymous && <Tag tone="muted">Anonymous</Tag>}
                      <span className="ml-auto text-xs text-muted-foreground">
                        Submitted {formatDate(i.created_at)}
                      </span>
                    </div>
                    <h2 className="mt-3 font-heading text-lg font-semibold text-foreground">
                      {q?.title?.trim() || truncate(q?.body ?? "", 90)}
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {truncate(q?.body ?? "")}
                    </p>
                    <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Submitted answer
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{i.body}</p>
                    </div>
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

function ReviewDetail({
  item,
  shaykhId,
  onBack,
  onDone,
}: {
  item: Item;
  shaykhId: string | null;
  onBack: () => void;
  onDone: () => void;
}) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<"approve" | "send_back" | null>(null);
  const [showComment, setShowComment] = useState(false);
  const q = item.questions;

  const approve = async () => {
    if (!shaykhId) return;
    setBusy("approve");
    try {
      const { error: prErr } = await supabase.from("peer_reviews").insert({
        answer_id: item.id,
        reviewer_shaykh_id: shaykhId,
        decision: "approved",
        comments: comment.trim() || null,
      });
      if (prErr) throw prErr;

      const { error: a1 } = await supabase
        .from("answers")
        .update({ status: "peer_approved" })
        .eq("id", item.id);
      if (a1) throw a1;
      const { error: a2 } = await supabase
        .from("answers")
        .update({ status: "sent_to_user" })
        .eq("id", item.id);
      if (a2) throw a2;

      const { error: q1 } = await supabase
        .from("questions")
        .update({ status: "peer_approved" })
        .eq("id", item.question_id);
      if (q1) throw q1;
      const { error: q2 } = await supabase
        .from("questions")
        .update({ status: "sent_to_user" })
        .eq("id", item.question_id);
      if (q2) throw q2;

      toast.success("Answer approved and sent to the user.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not approve this answer.");
    } finally {
      setBusy(null);
    }
  };

  const sendBack = async () => {
    if (!shaykhId) return;
    if (!comment.trim()) {
      setShowComment(true);
      toast.error("Please explain what needs to change.");
      return;
    }
    setBusy("send_back");
    try {
      const { error: prErr } = await supabase.from("peer_reviews").insert({
        answer_id: item.id,
        reviewer_shaykh_id: shaykhId,
        decision: "sent_back",
        comments: comment.trim(),
      });
      if (prErr) throw prErr;

      const { error: aErr } = await supabase
        .from("answers")
        .update({ status: "draft" })
        .eq("id", item.id);
      if (aErr) throw aErr;

      const { error: qErr } = await supabase
        .from("questions")
        .update({ status: "needs_revision" })
        .eq("id", item.question_id);
      if (qErr) throw qErr;

      toast.success("Sent back for revision.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send this answer back.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-3xl">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to peer review
      </button>

      <div className="mt-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {q?.is_urgent && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
              <AlertTriangle className="h-3 w-3" /> Urgent
            </span>
          )}
          {q?.categories?.name && <Tag>{q.categories.name}</Tag>}
          {q?.is_anonymous && <Tag tone="muted">Anonymous</Tag>}
          <span className="ml-auto text-xs text-muted-foreground">
            Submitted {formatDate(item.created_at)}
          </span>
        </div>

        <h1 className="mt-4 font-heading text-2xl font-bold text-foreground">
          {q?.title?.trim() || "Question"}
        </h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {q?.body}
        </p>

        <div className="mt-6 rounded-lg border border-border bg-muted/40 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Submitted answer
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {item.body}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-foreground">Your review</h2>
        <label className="mt-4 block text-sm font-semibold text-foreground" htmlFor="comment">
          Comment{" "}
          <span className="font-normal text-muted-foreground">
            (required when sending back for revision)
          </span>
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
          placeholder="Explain what needs to change, or leave optional notes with your approval…"
          className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary"
        />
        {showComment && !comment.trim() && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-700">
            <MessageSquareWarning className="h-3.5 w-3.5" /> A comment is required to send back for
            revision.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={approve}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {busy === "approve" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve
          </button>
          <button
            onClick={sendBack}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60"
            style={{
              borderColor: "color-mix(in oklab, var(--secondary) 50%, transparent)",
              background: "color-mix(in oklab, var(--secondary) 12%, transparent)",
              color: "var(--foreground)",
            }}
          >
            {busy === "send_back" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquareWarning className="h-4 w-4" />
            )}
            Send Back for Revision
          </button>
        </div>
      </div>
    </div>
  );
}
