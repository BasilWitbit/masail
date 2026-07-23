import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/verify-otp")({
  validateSearch: z.object({ email: z.string().optional() }),
  component: VerifyOtp,
});

function VerifyOtp() {
  const { email } = Route.useSearch();
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-heading text-2xl font-bold">Verify your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent a verification code{email ? ` to ${email}` : ""}. This page is coming soon.
      </p>
    </div>
  );
}
