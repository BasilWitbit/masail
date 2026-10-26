import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  PauseCircle,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminsTable, useSuperAdminRows } from "@/components/ssa-super-admins-table";

export const Route = createFileRoute("/_authenticated/ssa/")({
  component: SsaOverview,
});

type Stats = { tenants: number; active: number; inactive: number; mosques: number; people: number };

function SsaOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { rows, loading, error: rowsError } = useSuperAdminRows();

  useEffect(() => {
    let active = true;
    (async () => {
      const [tenants, activeT, mosques, people] = await Promise.all([
        supabase.from("tenants").select("*", { count: "exact", head: true }),
        supabase.from("tenants").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("mosques").select("*", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .in("role", ["mosque_admin", "shaykh", "user"])
          .not("tenant_id", "is", null),
      ]);
      if (!active) return;
      const err = tenants.error ?? activeT.error ?? mosques.error ?? people.error;
      if (err) {
        setError(err.message);
        return;
      }
      const total = tenants.count ?? 0;
      const act = activeT.count ?? 0;
      setStats({
        tenants: total,
        active: act,
        inactive: total - act,
        mosques: mosques.count ?? 0,
        people: people.count ?? 0,
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  const shownError = error ?? rowsError;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">Overview</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Platform-wide view of tenants, mosques and members.
          </p>
        </div>
        <Link
          to="/ssa/super-admins/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          New Super Admin
        </Link>
      </div>

      {shownError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{shownError}</span>
        </div>
      )}

      {!stats && !error ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi icon={Users} label="Tenants" value={stats.tenants} />
          <Kpi icon={CheckCircle2} label="Active" value={stats.active} />
          <Kpi icon={PauseCircle} label="Inactive" value={stats.inactive} />
          <Kpi icon={Building2} label="Mosques" value={stats.mosques} />
          <Kpi icon={UserRound} label="People" value={stats.people} />
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold text-foreground">Super Admins</h2>
          <Link
            to="/ssa/super-admins"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Manage
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <SuperAdminsTable rows={rows} loading={loading} />
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-sm font-semibold text-muted-foreground">{label}</div>
      </div>
      <div className="mt-4 font-heading text-3xl font-bold text-foreground">{value}</div>
    </div>
  );
}
