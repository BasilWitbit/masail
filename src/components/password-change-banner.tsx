import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const reqs = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One digit", test: (v: string) => /\d/.test(v) },
];

export function PasswordChangeBanner({ userId, email }: { userId: string; email: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setError(null);
    }
  }, [open]);

  if (dismissed || hidden) return null;

  const allValid = reqs.every((r) => r.test(next));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!allValid) {
      setError("New password does not meet requirements.");
      return;
    }
    if (next !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signInErr) {
      setLoading(false);
      setError("Current password is incorrect.");
      return;
    }
    const { error: updErr } = await supabase.auth.updateUser({ password: next });
    if (updErr) {
      setLoading(false);
      setError(updErr.message);
      return;
    }
    await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", userId);
    setLoading(false);
    setOpen(false);
    setHidden(true);
  }

  return (
    <>
      <div
        className="mb-6 flex items-start gap-4 rounded-lg border p-4"
        style={{
          background: "color-mix(in oklab, var(--secondary) 15%, transparent)",
          borderColor: "color-mix(in oklab, var(--secondary) 40%, transparent)",
        }}
      >
        <div className="flex-1">
          <div className="font-heading font-semibold text-foreground">
            You're using a temporary password
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            We recommend changing it now.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Change Password
        </button>
        <button
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-black/5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <form
            onSubmit={submit}
            className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-primary">
                Change Password
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-semibold">Current Password</label>
                <input
                  type="password"
                  required
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">New Password</label>
                <input
                  type="password"
                  required
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <ul className="mt-2 space-y-0.5 text-xs">
                  {reqs.map((r) => {
                    const ok = r.test(next);
                    return (
                      <li
                        key={r.label}
                        className={ok ? "text-green-600" : "text-muted-foreground"}
                      >
                        {ok ? "✓" : "•"} {r.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <label className="text-sm font-semibold">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Updating…" : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
