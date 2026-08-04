import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/questions")({
  component: QuestionsLayout,
});

function QuestionsLayout() {
  return <Outlet />;
}
