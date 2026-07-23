import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: () => (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-heading text-2xl font-bold">Log In</h1>
      <p className="mt-2 text-sm text-muted-foreground">Coming soon.</p>
    </div>
  ),
});
