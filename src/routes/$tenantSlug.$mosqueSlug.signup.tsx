import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy dual-slug signup → canonical mosque-only link. */
export const Route = createFileRoute("/$tenantSlug/$mosqueSlug/signup")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$mosqueSlug/signup",
      params: { mosqueSlug: params.mosqueSlug },
      replace: true,
    });
  },
});
