import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/qa")({
  component: QALayout,
});

function QALayout() {
  return <Outlet />;
}
