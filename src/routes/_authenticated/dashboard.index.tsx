import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (data?.role === "super_admin") {
        throw redirect({ to: "/dashboard/admin" });
      }
      if (data?.role === "mosque_admin") {
        throw redirect({ to: "/dashboard/mosque-admin" });
      }
      if (data?.role === "shaykh") {
        throw redirect({ to: "/dashboard/pool" });
      }
    }
    throw redirect({ to: "/dashboard/questions" });
  },
});
