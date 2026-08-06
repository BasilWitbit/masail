import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Paperclip, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/ask")({
  beforeLoad: requireRole(["user"]),
  component: AskQuestion,
});

type Category = { id: string; name: string };

function AskQuestion() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [mosqueId, setMosqueId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [body, setBody] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const [errors, setErrors] = useState<{ category?: string; body?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [attachmentWarning, setAttachmentWarning] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: userData }, { data: cats }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("categories").select("id, name").order("name"),
      ]);
      if (!active) return;
      if (userData.user) {
        setUserId(userData.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("mosque_id")
          .eq("id", userData.user.id)
          .maybeSingle();
        if (active) setMosqueId((profile?.mosque_id as string | null) ?? null);
      }
      setCategories((cats as Category[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  const totalSize = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files],
  );

  function handleFilesSelected(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    setFiles((prev) => [...prev, ...incoming]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setAttachmentWarning(null);

    const nextErrors: typeof errors = {};
    if (!categoryId) nextErrors.category = "Please choose a category.";
    if (!body.trim()) nextErrors.body = "Please enter your question.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!userId) {
      setFormError("You must be signed in to ask a question.");
      return;
    }
    if (!mosqueId) {
      setFormError(
        "Your profile isn't linked to a mosque yet. Please update your account settings before asking.",
      );
      return;
    }

    setSubmitting(true);
    try {
      // Generate the question id up-front so attachments can be uploaded to
      // {user_id}/{question_id}/{filename} BEFORE the row is inserted. The
      // asker has INSERT rights but no UPDATE policy on `questions`, so the
      // paths must be written as part of the initial insert.
      const questionId = crypto.randomUUID();

      const uploadedPaths: string[] = [];
      const failed: string[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${userId}/${questionId}/${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("question-attachments")
          .upload(path, file, { upsert: true });
        if (upErr) {
          failed.push(file.name);
        } else {
          uploadedPaths.push(path);
        }
      }

      const { data: inserted, error: insertError } = await supabase
        .from("questions")
        .insert({
          id: questionId,
          asker_id: userId,
          mosque_id: mosqueId,
          category_id: categoryId,
          title: title.trim() || null,
          body: body.trim(),
          is_private: isPrivate,
          is_anonymous: isAnonymous,
          is_urgent: isUrgent,
          status: "in_pool",
          attachment_urls: uploadedPaths.length > 0 ? uploadedPaths : null,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        setFormError(insertError?.message ?? "Failed to submit your question.");
        setSubmitting(false);
        return;
      }

      if (failed.length > 0) {
        setAttachmentWarning(
          `Your question was submitted, but ${failed.length} attachment${
            failed.length === 1 ? "" : "s"
          } failed to upload (${failed.join(", ")}). You can share them with the scholar later.`,
        );
      }

      setSuccessId(questionId);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unexpected error while submitting.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (successId) {
    return (
      <div>
        <div
          className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm"
        >
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "color-mix(in oklab, var(--primary) 10%, transparent)" }}
          >
            <CheckCircle2 className="h-7 w-7" style={{ color: "var(--primary)" }} />
          </div>
          <h1 className="mt-5 font-heading text-2xl font-bold text-primary md:text-3xl">
            Your question has been submitted
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            A scholar from your mosque will review it soon. You'll see updates on
            your dashboard as it progresses.
          </p>
          {attachmentWarning && (
            <div className="mx-auto mt-6 max-w-md rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{attachmentWarning}</span>
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/dashboard/questions/$id"
              params={{ id: successId }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              View my question
            </Link>
            <button
              onClick={() => navigate({ to: "/dashboard/questions" })}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Back to My Questions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
          Ask a Question
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Share your question and a scholar from your mosque will respond.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 max-w-3xl space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm md:p-8"
      >
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-foreground">
            Title <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your question a short title"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-semibold text-foreground">
            Category <span className="text-red-600">*</span>
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              if (errors.category) setErrors((p) => ({ ...p, category: undefined }));
            }}
            className={`mt-2 w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/20 ${
              errors.category ? "border-red-500" : "border-border focus:border-primary"
            }`}
          >
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1.5 text-xs font-medium text-red-600">{errors.category}</p>
          )}
        </div>

        <div>
          <label htmlFor="body" className="block text-sm font-semibold text-foreground">
            Your Question <span className="text-red-600">*</span>
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (errors.body) setErrors((p) => ({ ...p, body: undefined }));
            }}
            rows={8}
            placeholder="Describe your question with as much context as you can. The more detail you share, the better a scholar can respond."
            className={`mt-2 w-full resize-y rounded-lg border bg-background px-3.5 py-2.5 text-sm leading-relaxed outline-none transition focus:ring-2 focus:ring-primary/20 ${
              errors.body ? "border-red-500" : "border-border focus:border-primary"
            }`}
          />
          {errors.body && (
            <p className="mt-1.5 text-xs font-medium text-red-600">{errors.body}</p>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <ToggleRow
            label="Keep this question private"
            description="Won't be considered for the public knowledge base."
            checked={isPrivate}
            onChange={setIsPrivate}
          />
          <ToggleRow
            label="Ask anonymously"
            description="Hide my identity from the scholar."
            checked={isAnonymous}
            onChange={setIsAnonymous}
          />
          <ToggleRow
            label="This is urgent"
            description="e.g. marriage, family dispute, funeral, medical, or time-sensitive matter."
            checked={isUrgent}
            onChange={setIsUrgent}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground">
            Attachments <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Add images or documents that help explain your question.
          </p>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/50 hover:bg-muted"
            >
              <Paperclip className="h-4 w-4" />
              Choose files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
          </div>
          {files.length > 0 && (
            <ul className="mt-3 space-y-2">
              {files.map((f, idx) => (
                <li
                  key={`${f.name}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {(f.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
              <li className="text-right text-xs text-muted-foreground">
                Total: {(totalSize / 1024).toFixed(0)} KB
              </li>
            </ul>
          )}
        </div>

        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <Link
            to="/dashboard/questions"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit Question"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
