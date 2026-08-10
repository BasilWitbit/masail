import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformThemeGate } from "@/lib/use-platform-theme";
import { ThemeLoadingScreen } from "@/components/theme-loading-screen";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log In — Masail" },
      { name: "description", content: "Log in to your Masail account to ask questions and receive guidance from local scholars." },
      { property: "og:title", content: "Log In — Masail" },
      { property: "og:description", content: "Log in to your Masail account to ask questions and receive guidance from local scholars." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { ready: themeReady } = usePlatformThemeGate();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    setSubmitting(false);

    if (signInError) {
      const msg = signInError.message.toLowerCase();
      if (
        msg.includes("email not confirmed") ||
        msg.includes("email link is invalid") ||
        msg.includes("verify") ||
        msg.includes("confirmation")
      ) {
        setNeedsVerification(true);
        return;
      }
      setError("Invalid email or password.");
      return;
    }

    if (data?.user) {
      navigate({ to: "/dashboard" });
    } else {
      setError("Something went wrong. Please try again.");
    }
  }

  if (!themeReady) return <ThemeLoadingScreen />;


  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto flex max-w-xl flex-col px-6 py-12 md:py-16">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Log in to continue asking questions and receiving guidance from your local scholars.
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

          {needsVerification ? (
            <div
              className="mb-6 flex items-start gap-3 rounded-lg border p-4 text-sm"
              style={{
                background: "color-mix(in oklab, var(--secondary) 12%, #ffffff)",
                borderColor: "color-mix(in oklab, var(--secondary) 40%, transparent)",
                color: "var(--secondary-foreground)",
              }}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Please verify your email first.{" "}
                <Link
                  to="/verify-otp"
                  search={{ email: email.trim() }}
                  className="font-semibold underline"
                  style={{ color: "var(--primary)" }}
                >
                  Resend or enter your verification code
                </Link>
              </span>
            </div>
          ) : null}

          <div className="space-y-5">
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                autoComplete="email"
                placeholder="you@example.com"
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input"
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </Field>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
              onClick={() => alert("Forgot password flow coming soon.")}
            >
              Forgot password?
            </button>
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
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Sign up
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}
