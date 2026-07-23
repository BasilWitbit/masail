import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformTheme } from "@/lib/use-platform-theme";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign Up — Masail" },
      { name: "description", content: "Create your Masail account to ask questions to your local scholars." },
      { property: "og:title", content: "Sign Up — Masail" },
      { property: "og:description", content: "Join Masail to connect with your local mosque scholars." },
    ],
  }),
  component: SignupPage,
});

type Mosque = { id: string; name: string; city: string | null };

function SignupPage() {
  usePlatformTheme();
  const navigate = useNavigate();

  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mosqueId, setMosqueId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    supabase
      .from("mosques")
      .select("id, name, city")
      .order("name")
      .then(({ data }) => {
        if (active && data) setMosques(data as Mosque[]);
      });
    return () => {
      active = false;
    };
  }, []);

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
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "Full name is required.";
    if (!email.trim()) errs.email = "Email is required.";
    if (!pwChecks.length || !pwChecks.lower || !pwChecks.upper || !pwChecks.digit)
      errs.password = "Password does not meet the requirements.";
    if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match.";
    if (!mosqueId) errs.mosqueId = "Please select your mosque.";

    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          mosque_id: mosqueId,
        },
      },
    });

    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    navigate({ to: "/verify-otp", search: { email } });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto flex max-w-xl flex-col px-6 py-12 md:py-16">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Join Masail to ask questions and receive guidance from your local scholars.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-border bg-card p-8 shadow-sm md:p-10"
        >
          {error ? (
            <div
              className="mb-6 flex items-start gap-3 rounded-lg border p-4 text-sm"
              style={{
                background: "color-mix(in oklab, var(--destructive) 8%, #ffffff)",
                borderColor: "color-mix(in oklab, var(--destructive) 30%, transparent)",
                color: "var(--destructive)",
              }}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="space-y-5">
            <Field label="Full Name" error={fieldErrors.fullName}>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="input"
                autoComplete="name"
              />
            </Field>

            <Field label="Email" error={fieldErrors.email}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                autoComplete="email"
              />
            </Field>

            <Field label="Password" error={fieldErrors.password}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input"
                autoComplete="new-password"
              />
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <Requirement ok={pwChecks.length} label="At least 8 characters" />
                <Requirement ok={pwChecks.lower} label="One lowercase letter" />
                <Requirement ok={pwChecks.upper} label="One uppercase letter" />
                <Requirement ok={pwChecks.digit} label="One digit" />
              </ul>
            </Field>

            <Field label="Confirm Password" error={fieldErrors.confirmPassword}>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input"
                autoComplete="new-password"
              />
            </Field>

            <Field label="Mosque" error={fieldErrors.mosqueId}>
              <select
                value={mosqueId}
                onChange={(e) => setMosqueId(e.target.value)}
                required
                className="input"
              >
                <option value="">Select your mosque…</option>
                {mosques.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.city ? ` — ${m.city}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 disabled:opacity-60"
            style={{ background: "var(--primary)" }}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              "Create Account"
            )}
          </button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </main>

      <style>{`
        .input {
          width: 100%;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: #fff;
          padding: 10px 14px;
          font-size: 14px;
          font-family: var(--font-sans);
          color: var(--foreground);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 20%, transparent);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs" style={{ color: "var(--destructive)" }}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

function Requirement({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <Check
        className="h-3 w-3"
        style={{ color: ok ? "var(--primary)" : "var(--muted-foreground)" }}
      />
      <span style={{ color: ok ? "var(--foreground)" : undefined }}>{label}</span>
    </li>
  );
}
