import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/lib/use-dashboard-nav";

const homeForRole: Record<UserRole, string> = {
  super_admin: "/dashboard/admin",
  mosque_admin: "/dashboard/mosque-admin",
  shaykh: "/dashboard/pool",
  user: "/dashboard/questions",
};

async function fetchRole(): Promise<UserRole | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  return (data?.role as UserRole | undefined) ?? null;
}

/**
 * Route guard: only the listed roles may load the route.
 * Anyone else is silently redirected to their own role's dashboard home.
 */
export function requireRole(allowed: UserRole[]) {
  return async () => {
    const role = await fetchRole();
    if (!role) throw redirect({ to: "/login" });
    if (!allowed.includes(role)) {
      throw redirect({ to: homeForRole[role] });
    }
    return { role };
  };
}
