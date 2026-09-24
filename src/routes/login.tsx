import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformThemeGate } from "@/lib/use-platform-theme";
import { ThemeLoadingScreen } from "@/components/theme-loading-screen";
import { PasswordInput } from "@/components/password-input";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log In — Masail" },
      { name: "description", content: "Log in to your Masail account to ask questions and receive guidance from local scholars." },
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
    <div className="min-h-screen font-sans selection:bg-[#DBEAFE] selection:text-[#0F172A]" style={{ backgroundColor: "#F8FAFC", color: "#0F172A" }}>
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-24">
        <div className="mb-10 text-center flex flex-col items-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 18h20" />
                <path d="M9 18v-4a3 3 0 0 1 6 0v4" />
                <path d="M12 11V7" />
                <path d="M5 18V9l2-2 2 2v9" />
                <path d="M15 18V9l2-2 2 2v9" />
              </svg>
            </div>
            <span className="font-bold text-3xl tracking-tight text-[#0F172A]">MASAIL</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-[#0F172A] md:text-4xl tracking-tight mb-3">Welcome back</h1>
          <p className="text-[#64748B] text-lg">
            Log in to continue asking questions and receiving guidance from your local scholars.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[#E2E8F0] bg-white p-8 md:p-10 shadow-lg shadow-[#0F172A]/5"
        >
          {error ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {needsVerification ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Please verify your email first.{" "}
                <Link
                  to="/verify-otp"
                  search={{ email: email.trim() }}
                  className="font-semibold underline hover:text-blue-800"
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
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0F172A] outline-none transition-all focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE] placeholder:text-[#94A3B8]"
                autoComplete="email"
                placeholder="you@example.com"
              />
            </Field>

            <Field label="Password">
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0F172A] outline-none transition-all focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE] placeholder:text-[#94A3B8]"
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </Field>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              className="text-sm font-medium text-[#64748B] transition-colors hover:text-[#0F172A]"
              onClick={() => alert("Forgot password flow coming soon.")}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] px-5 py-4 text-sm font-medium text-white shadow-sm shadow-[#2563EB]/25 transition-all disabled:opacity-60"
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

          <div className="mt-8 flex flex-col items-center gap-4">
            {/* <p className="text-center text-sm text-[#64748B]">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline">
                Sign up
              </Link>
            </p> */}
            <Link 
              to="/" 
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3 text-center text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#E2E8F0]"
            >
              Return to Home
            </Link>
          </div>
        </form>
      </main>
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
      <span className="mb-2 block text-sm font-semibold text-[#0F172A]">{label}</span>
      {children}
    </label>
  );
}
