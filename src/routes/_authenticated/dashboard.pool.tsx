import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Flag, Inbox, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/pool")({
  beforeLoad: requireRole(["shaykh"]),
  component: QuestionPool,
});

type Category = { id: string; name: string };

type PoolQuestion = {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
  is_urgent: boolean;
  is_anonymous: boolean;
  category_id: string | null;
  categories: { name: string } | null;
};

type DateFilter = "7" | "30" | "all";

type ReportReason = "spam" | "abusive" | "other";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncate(text: string, n = 140) {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

function QuestionPool() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shaykhId, setShaykhId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PoolQuestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<PoolQuestion | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("spam");
  const [reportNotes, setReportNotes] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  function openReport(q: PoolQuestion) {
    setReportTarget(q);
    setReportReason("spam");
    setReportNotes("");
    setReportError(null);
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportTarget || !shaykhId) return;
    setReporting(true);
    setReportError(null);
    const qid = reportTarget.id;
    const { error: rErr } = await supabase.from("reports").insert({
      question_id: qid,
      reported_by_shaykh_id: shaykhId,
      reason: reportReason,
      notes: reportNotes.trim() || null,
    });
    if (rErr) {
      setReporting(false);
      setReportError(rErr.message);
      return;
    }
    const { error: uErr } = await supabase
      .from("questions")
      .update({ status: "reported" })
      .eq("id", qid);
    setReporting(false);
    if (uErr) {
      setReportError(uErr.message);
      return;
    }
    setReportTarget(null);
    setQuestions((cur) => cur.filter((q) => q.id !== qid));
    toast.success("Question reported");
  }

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          if (active) setError("You must be signed in.");
          return;
        }
        const { data: shaykh, error: sErr } = await supabase
          .from("shaykhs")
          .select("id, mosque_id")
          .eq("profile_id", userData.user.id)
          .eq("is_active", true)
          .maybeSingle();
        if (sErr) throw sErr;
        if (!shaykh) {
          if (active) setError("You are not registered as an active shaykh.");
          return;
        }
        if (!active) return;
        setShaykhId(shaykh.id as string);

        const [{ data: qs, error: qErr }, { data: cats }] = await Promise.all([
          supabase
            .from("questions")
            .select(
              "id, title, body, created_at, is_urgent, is_anonymous, category_id, categories(name)",
            )
            .eq("mosque_id", shaykh.mosque_id as string)
            .eq("status", "in_pool")
            .order("is_urgent", { ascending: false })
            .order("created_at", { ascending: true }),
          supabase.from("categories").select("id, name").order("name"),
        ]);
        if (qErr) throw qErr;
        if (!active) return;
        setQuestions((qs as PoolQuestion[]) ?? []);
        setCategories((cats as Category[]) ?? []);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load pool.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoffDays = dateFilter === "7" ? 7 : dateFilter === "30" ? 30 : null;
    return questions.filter((q) => {
      if (categoryId !== "all" && q.category_id !== categoryId) return false;
      if (cutoffDays !== null) {
        const age = now - new Date(q.created_at).getTime();
        if (age > cutoffDays * 24 * 60 * 60 * 1000) return false;
      }
      return true;
    });
  }, [questions, categoryId, dateFilter]);

  async function claim(qid: string) {
    if (!shaykhId) return;
    setClaimingId(qid);
    const prev = questions;
    setQuestions((cur) => cur.filter((q) => q.id !== qid));
    const { error: uErr } = await supabase
      .from("questions")
      .update({ status: "claimed", claimed_by: shaykhId })
      .eq("id", qid)
      .eq("status", "in_pool");
    if (uErr) {
      setQuestions(prev);
      toast.error("Could not claim question", { description: uErr.message });
    } else {
      toast.success("Question claimed", {
        description: "Find it in My Answers.",
      });
    }
    setClaimingId(null);
  }

  return (
    <div>
      <div className="max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
          Question Pool
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Unclaimed questions from your mosque. Claim one to begin answering.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: "color-mix(in oklab, var(--primary) 10%, transparent)",
            color: "var(--primary)",
          }}
        >
          Showing: Unclaimed Questions
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
            Category
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
            Date
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading pool…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center shadow-sm">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                background: "color-mix(in oklab, var(--primary) 10%, transparent)",
              }}
            >
              <Inbox className="h-6 w-6" style={{ color: "var(--primary)" }} />
            </div>
            <p className="mt-4 font-heading text-lg font-semibold text-foreground">
              No unclaimed questions right now.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4">
            {filtered.map((q) => (
              <li
                key={q.id}
                className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {q.is_urgent && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                      <AlertTriangle className="h-3 w-3" /> Urgent
                    </span>
                  )}
                  {q.categories?.name && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{
                        background:
                          "color-mix(in oklab, var(--primary) 10%, transparent)",
                        color: "var(--primary)",
                        border:
                          "1px solid color-mix(in oklab, var(--primary) 20%, transparent)",
                      }}
                    >
                      {q.categories.name}
                    </span>
                  )}
                  {q.is_anonymous && (
                    <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Anonymous
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDate(q.created_at)}
                  </span>
                </div>
                <h2 className="mt-3 font-heading text-lg font-semibold text-foreground">
                  {q.title?.trim() || truncate(q.body, 90)}
                </h2>
                {q.title?.trim() && (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {truncate(q.body, 180)}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => openReport(q)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-red-600"
                  >
                    <Flag className="h-3.5 w-3.5" /> Report
                  </button>
                  <button
                    onClick={() => claim(q.id)}
                    disabled={claimingId === q.id}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {claimingId === q.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Claiming…
                      </>
                    ) : (
                      "Claim Question"
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {reportTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <form
            onSubmit={submitReport}
            className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-primary">
                Report Question
              </h2>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {truncate(reportTarget.title?.trim() || reportTarget.body, 110)}
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-semibold" htmlFor="report-reason">
                  Reason
                </label>
                <select
                  id="report-reason"
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as ReportReason)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="spam">Spam</option>
                  <option value="abusive">Abusive</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold" htmlFor="report-notes">
                  Notes <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="report-notes"
                  rows={4}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {reportError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {reportError}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reporting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  "Submit Report"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
