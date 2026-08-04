import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/questions")({
  beforeLoad: requireRole(["user"]),
  component: QuestionsLayout,
});

function QuestionsLayout() {
  return <Outlet />;
}
