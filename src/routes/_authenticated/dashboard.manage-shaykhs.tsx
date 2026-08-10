import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/manage-shaykhs")({
  beforeLoad: requireRole(["mosque_admin"]),
  component: ManageShaykhs,
});

type ShaykhRow = {
  id: string;
  is_active: boolean;
  profile_id: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

function ManageShaykhs() {
  const [rows, setRows] = useState<ShaykhRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("mosque_id")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!profile?.mosque_id) {
      setError("Your account isn't linked to a mosque.");
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from("shaykhs")
      .select("id, is_active, profile_id, profiles(full_name, email)")
      .eq("mosque_id", profile.mosque_id)
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    setRows((data as unknown as ShaykhRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleActive(id: string, next: boolean) {
    setUpdating(id);
    const { error: err } = await supabase
      .from("shaykhs")
      .update({ is_active: next })
      .eq("id", id);
    if (!err) {
      setRows((r) => r.map((s) => (s.id === id ? { ...s, is_active: next } : s)));
    } else {
      setError(err.message);
    }
    setUpdating(null);
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
            Manage Shaykhs
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Activate or deactivate shaykhs at your mosque.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" />
          Create Shaykh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No shaykhs at your mosque yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {s.profiles?.full_name ?? "Unnamed"}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {s.profiles?.email ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      s.is_active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => toggleActive(s.id, !s.is_active)}
                    disabled={updating === s.id}
                    role="switch"
                    aria-checked={s.is_active}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-60 ${
                      s.is_active ? "bg-primary" : "bg-muted-foreground/40"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        s.is_active ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {createOpen && (
        <CreateShaykhModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function CreateShaykhModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
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
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create Shaykh"
        className="w-full max-w-lg rounded-[24px] border border-border bg-card p-6 shadow-xl md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-primary">Create Shaykh</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Provision a new shaykh account at your mosque with a temporary password.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Cancel
            </button>
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
