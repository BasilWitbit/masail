import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ssa/super-admins")({
  component: () => <Outlet />,
});
