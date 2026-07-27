import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/create-shaykh")({
  component: CreateShaykh,
});

function CreateShaykh() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pwChecks = useMemo(
    () => ({
      length: password.length >= 8,
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      digit: /\d/.test(password),
    }),
    [password],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim() || !email.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!pwChecks.length || !pwChecks.lower || !pwChecks.upper || !pwChecks.digit) {
      setError("Password doesn't meet the requirements.");
      return;
    }

    setSubmitting(true);
    const { data, error: err } = await supabase.functions.invoke("create-shaykh", {
      body: {
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      },
    });
    setSubmitting(false);

    if (err) {
      setError(
        err.message?.includes("Function not found") || err.message?.includes("404")
          ? "The create-shaykh function isn't deployed yet."
          : err.message || "Failed to create shaykh.",
      );
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }

    setSuccess("Shaykh created successfully.");
    setFullName("");
    setEmail("");
    setPassword("");
    setTimeout(() => setSuccess(null), 4000);
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
          Create Shaykh
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Provision a new shaykh account at your mosque with a temporary password.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-lg border border-border bg-card p-6 shadow-sm md:p-8"
      >
        <div>
          <label className="block text-sm font-semibold text-foreground">
            Full Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground">
            Email <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground">
            Temporary Password <span className="text-red-600">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <PwRule ok={pwChecks.length} label="At least 8 characters" active={password.length > 0} />
            <PwRule ok={pwChecks.lower} label="One lowercase letter" active={password.length > 0} />
            <PwRule ok={pwChecks.upper} label="One uppercase letter" active={password.length > 0} />
            <PwRule ok={pwChecks.digit} label="One digit" active={password.length > 0} />
          </ul>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create Shaykh"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PwRule({ ok, label, active }: { ok: boolean; label: string; active: boolean }) {
  const color = !active ? "text-muted-foreground" : ok ? "text-emerald-700" : "text-red-600";
  return (
    <li className={`flex items-center gap-1.5 ${color}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </li>
  );
}
