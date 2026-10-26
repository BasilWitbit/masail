import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type SuperAdminRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_slug: string | null;
  is_active: boolean;
  mosque_count: number;
  people_count: number;
};

export const DEACTIVATE_WARNING =
  "Are you sure you want to deactivate this Super Admin? Deactivating will block access to all mosques, users, and data under this tenant until you reactivate it. This action does NOT delete any data.";

const PEOPLE_ROLES: ("mosque_admin" | "shaykh" | "user")[] = ["mosque_admin", "shaykh", "user"];
const PAGE = 1000;

async function fetchTenantIds(table: "mosques" | "profiles"): Promise<string[]> {
  const out: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const base =
      table === "mosques"
        ? supabase.from("mosques").select("tenant_id")
        : supabase.from("profiles").select("tenant_id").in("role", PEOPLE_ROLES);
    const { data, error } = await base.not("tenant_id", "is", null).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) if (r.tenant_id) out.push(r.tenant_id);
    if (!data || data.length < PAGE) break;
  }
  return out;
}

function tally(ids: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

/** Loads every super admin with their tenant plus mosque / people counts. */
export function useSuperAdminRows() {
  const [rows, setRows] = useState<SuperAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const { data: admins, error: err } = await supabase
        .from("profiles")
        .select("id, full_name, email, tenant_id, created_at")
        .eq("role", "super_admin")
        .order("created_at", { ascending: false });
      if (err) throw new Error(err.message);

      const tenantIds = [
        ...new Set((admins ?? []).map((a) => a.tenant_id).filter(Boolean)),
      ] as string[];
      const [tenantsRes, mosqueIds, peopleIds] = await Promise.all([
        tenantIds.length
          ? supabase.from("tenants").select("id, name, slug, is_active").in("id", tenantIds)
          : Promise.resolve({ data: [], error: null }),
        fetchTenantIds("mosques"),
        fetchTenantIds("profiles"),
      ]);
      if (tenantsRes.error) throw new Error(tenantsRes.error.message);

      const byId = new Map((tenantsRes.data ?? []).map((t) => [t.id, t]));
      const mosques = tally(mosqueIds);
      const people = tally(peopleIds);

      setRows(
        (admins ?? []).map((a) => {
          const t = a.tenant_id ? byId.get(a.tenant_id) : undefined;
          return {
            id: a.id,
            full_name: a.full_name,
            email: a.email,
            created_at: a.created_at,
            tenant_id: a.tenant_id,
            tenant_name: t?.name ?? null,
            tenant_slug: t?.slug ?? null,
            is_active: t?.is_active ?? false,
            mosque_count: a.tenant_id ? (mosques.get(a.tenant_id) ?? 0) : 0,
            people_count: a.tenant_id ? (people.get(a.tenant_id) ?? 0) : 0,
          };
        }),
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load super admins.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, loading, error, reload };
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

/** Table of super admins. Pass `onToggleActive` to render an inline Active switch. */
export function SuperAdminsTable({
  rows,
  loading,
  showCreated = false,
  togglingId,
  onToggleActive,
  emptyText = "No super admins found.",
}: {
  rows: SuperAdminRow[];
  loading: boolean;
  showCreated?: boolean;
  togglingId?: string | null;
  onToggleActive?: (row: SuperAdminRow) => void;
  emptyText?: string;
}) {
  const navigate = useNavigate();

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (rows.length === 0) {
    return <div className="p-8 text-center text-sm text-muted-foreground">{emptyText}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Email</th>
            <th className="px-4 py-3 font-semibold">Circle</th>
            <th className="px-4 py-3 text-right font-semibold">Mosques</th>
            <th className="px-4 py-3 text-right font-semibold">People</th>
            <th className="px-4 py-3 font-semibold">Active</th>
            {showCreated && <th className="px-4 py-3 font-semibold">Created</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr
              key={r.id}
              tabIndex={0}
              onClick={() => navigate({ to: "/ssa/super-admins/$saId", params: { saId: r.id } })}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  navigate({ to: "/ssa/super-admins/$saId", params: { saId: r.id } });
              }}
              className="cursor-pointer hover:bg-muted/30 focus:bg-muted/30 focus:outline-none"
            >
              <td className="px-4 py-3 font-semibold text-primary">{r.full_name || "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.email ?? "—"}</td>
              <td className="px-4 py-3">{r.tenant_name ?? "—"}</td>
              <td className="px-4 py-3 text-right tabular-nums">{r.mosque_count}</td>
              <td className="px-4 py-3 text-right tabular-nums">{r.people_count}</td>
              <td className="px-4 py-3">
                {onToggleActive ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={r.is_active}
                    aria-label={r.is_active ? "Deactivate" : "Activate"}
                    disabled={togglingId === r.id || !r.tenant_id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleActive(r);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-60 ${
                      r.is_active ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    {togglingId === r.id ? (
                      <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-white" />
                    ) : (
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          r.is_active ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    )}
                  </button>
                ) : (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      r.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {r.is_active ? "Active" : "Inactive"}
                  </span>
                )}
              </td>
              {showCreated && (
                <td className="px-4 py-3 text-muted-foreground">{formatDate(r.created_at)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
