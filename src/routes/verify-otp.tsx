import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformThemeGate } from "@/lib/use-platform-theme";
import { ThemeLoadingScreen } from "@/components/theme-loading-screen";
import { SiteHeader } from "@/components/site-header";
import { z } from "zod";

export const Route = createFileRoute("/verify-otp")({
  validateSearch: z.object({ email: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Verify Email — Masail" },
      { name: "description", content: "Verify your email to complete your Masail account registration." },
      { property: "og:title", content: "Verify Email — Masail" },
      { property: "og:description", content: "Verify your email to complete your Masail account registration." },
    ],
  }),
  component: VerifyOtpPage,
});

function VerifyOtpPage() {
  const { ready: themeReady } = usePlatformThemeGate();
  const navigate = useNavigate();
  const { email } = Route.useSearch();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate({ to: "/" });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    setCode((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    if (index < 5) {
      inputsRef.current[index + 1]?.focus();
    } else {
      inputsRef.current[index]?.blur();
    }
    setError(null);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (code[index]) {
        setCode((prev) => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        setCode((prev) => {
          const next = [...prev];
          next[index - 1] = "";
          return next;
        });
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = pasted.split("").concat(Array(6 - pasted.length).fill(""));
    setCode(next);
    setError(null);

    const focusIndex = Math.min(pasted.length, 5);
    inputsRef.current[focusIndex]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    const otp = code.join("");
    if (otp.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setError(null);
    setSubmitting(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });

    setSubmitting(false);

    if (verifyError) {
      setError("Invalid or expired code. Please try again or request a new one.");
      return;
    }

    setSuccess(true);
  }

  async function handleResend() {
    if (!email || resendCountdown > 0) return;

    setResent(false);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (resendError) {
      setError("Could not resend the code. Please try again shortly.");
      return;
    }

    setResent(true);
    setResendCountdown(30);
  }

  if (!themeReady) return <ThemeLoadingScreen />;

  if (!email) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto flex max-w-xl flex-col px-6 py-12 md:py-16">
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm md:p-10">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "var(--primary-soft)" }}
            >
              <MailCheck className="h-6 w-6" style={{ color: "var(--primary)" }} />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">No email provided</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please start from the signup page to receive a verification code.
            </p>
            <Link
              to="/signup"
              className="mt-6 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
              style={{ background: "var(--primary)" }}
            >
              Sign up
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto flex max-w-xl flex-col px-6 py-12 md:py-16">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">Verify your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the code sent to <span className="font-semibold text-foreground">{email}</span>
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

          {success ? (
            <div
              className="mb-6 flex items-start gap-3 rounded-lg border p-4 text-sm"
              style={{
                background: "color-mix(in oklab, var(--primary) 8%, #ffffff)",
                borderColor: "color-mix(in oklab, var(--primary) 30%, transparent)",
                color: "var(--primary)",
              }}
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Email verified! Redirecting you to the homepage…</span>
            </div>
          ) : null}

          <div className="flex justify-center gap-2 md:gap-3">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                disabled={submitting || success}
                className="otp-input h-12 w-12 text-center text-xl font-semibold md:h-14 md:w-14"
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting || success || code.join("").length !== 6}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 disabled:opacity-60"
            style={{ background: "var(--primary)" }}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify Email"
            )}
          </button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCountdown > 0 || submitting || success}
              className="text-sm font-semibold text-primary transition hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
            >
              {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend code"}
            </button>
            {resent && resendCountdown > 0 ? (
              <p className="mt-1 text-xs text-primary">Code resent!</p>
            ) : null}
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Need a new account?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </main>

      <style>{`
        .otp-input {
          border-radius: 8px;
          border: 1px solid var(--border);
          background: #fff;
          color: var(--foreground);
          font-family: var(--font-heading);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .otp-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 20%, transparent);
        }
        .otp-input:disabled {
          background: var(--muted);
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}
