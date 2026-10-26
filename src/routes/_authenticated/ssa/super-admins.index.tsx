import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Plus, Search } from "lucide-react";
import {
  DEACTIVATE_WARNING,
  SuperAdminsTable,
  useSuperAdminRows,
  type SuperAdminRow,
} from "@/components/ssa-super-admins-table";
import { setSuperAdminActive } from "@/lib/ssa.functions";

export const Route = createFileRoute("/_authenticated/ssa/super-admins/")({
  component: SuperAdminsList,
});

type StatusFilter = "all" | "active" | "inactive";

function SuperAdminsList() {
  const { rows, loading, error, reload } = useSuperAdminRows();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === "active" && !r.is_active) return false;
      if (status === "inactive" && r.is_active) return false;
      if (!q) return true;
      return [r.full_name ?? "", r.email ?? "", r.tenant_name ?? ""].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  }, [rows, query, status]);

  async function handleToggle(row: SuperAdminRow) {
    const next = !row.is_active;
    const message = next
      ? `Reactivate ${row.full_name || "this Super Admin"} and restore access to their tenant?`
      : DEACTIVATE_WARNING;
    if (!window.confirm(message)) return;
    setActionError(null);
    setNotice(null);
    setTogglingId(row.id);
    try {
      await setSuperAdminActive({ data: { sa_id: row.id, active: next } });
      setNotice(next ? "Super Admin activated." : "Super Admin deactivated.");
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update status.");
    }
    setTogglingId(null);
  }

  const shownError = actionError ?? error;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
            Super Admins
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Each super admin owns one circle with its own mosques and people.
          </p>
        </div>
        <Link
          to="/ssa/super-admins/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New Super Admin
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or circle…"
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          aria-label="Filter by status"
          className="rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {shownError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{shownError}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <SuperAdminsTable
          rows={filtered}
          loading={loading}
          showCreated
          togglingId={togglingId}
          onToggleActive={handleToggle}
        />
      </div>
    </div>
  );
}
