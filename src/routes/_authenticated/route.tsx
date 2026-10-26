import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccess } from "@/lib/access";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });

    const access = await fetchAccess(data.user.id);
    const path = location.pathname;

    if (access.isSsa) {
      // SSA lives under /ssa; keep them out of the tenant dashboard.
      if (path === "/dashboard" || path.startsWith("/dashboard/")) {
        throw redirect({ to: "/ssa" });
      }
    } else if (!access.tenantActive && path !== "/tenant-unavailable") {
      throw redirect({ to: "/tenant-unavailable" });
    }

    return { user: data.user, role: access.role };
  },
  component: () => <Outlet />,
});
