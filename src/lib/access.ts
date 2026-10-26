import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/lib/use-dashboard-nav";

export type AccessInfo = {
  role: UserRole | null;
  isSsa: boolean;
  /** False when the user's tenant has been deactivated (never true-negative for SSA). */
  tenantActive: boolean;
};

/** Lightweight lookup used by route guards: role + tenant-active flag. */
export async function fetchAccess(userId: string): Promise<AccessInfo> {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = (data?.role as UserRole | undefined) ?? null;
  const isSsa = role === "super_super_admin";
  if (isSsa) return { role, isSsa, tenantActive: true };

  const { data: active, error } = await supabase.rpc("my_tenant_is_active");
  // If the RPC fails (e.g. migration not applied yet) do not lock users out.
  const tenantActive = error ? true : active !== false;
  return { role, isSsa, tenantActive };
}
