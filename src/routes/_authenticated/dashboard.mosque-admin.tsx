import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/mosque-admin")({
  beforeLoad: requireRole(["mosque_admin"]),
  component: MosqueAdminDashboard,
});

type Mosque = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

type ShaykhRow = {
  id: string;
  is_active: boolean;
  profile_id: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

type DashboardData = {
  mosque: Mosque | null;
  shaykhs: ShaykhRow[];
};

function MosqueAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setLoading(false);
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("mosque_id")
          .eq("id", userData.user.id)
          .maybeSingle();
        if (!profile?.mosque_id) {
          if (active) setError("Your account isn't linked to a mosque.");
          if (active) setLoading(false);
          return;
        }

        const [mosqueResult, shaykhsResult] = await Promise.all([
          supabase
            .from("mosques")
            .select("id, name, address, city, country, contact_email, contact_phone")
            .eq("id", profile.mosque_id)
            .maybeSingle(),
          supabase
            .from("shaykhs")
            .select("id, is_active, profile_id, profiles(full_name, email)")
            .eq("mosque_id", profile.mosque_id)
            .order("created_at", { ascending: false }),
        ]);

        if (!active) return;
        if (mosqueResult.error) throw mosqueResult.error;
        if (shaykhsResult.error) throw shaykhsResult.error;

        setData({
          mosque: mosqueResult.data as unknown as Mosque,
          shaykhs: (shaykhsResult.data as unknown as ShaykhRow[]) ?? [],
        });
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load dashboard data.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const total = data?.shaykhs.length ?? 0;
  const active = data?.shaykhs.filter((s) => s.is_active).length ?? 0;
  const inactive = data?.shaykhs.filter((s) => !s.is_active).length ?? 0;

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Overview of your mosque and its scholars.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading dashboard…
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1 — Mosque Info Card */}
          {data?.mosque && (
            <div
              className="rounded-lg border border-border bg-card p-6 shadow-sm md:p-8"
              style={{ borderLeft: "6px solid var(--secondary)" }}
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Your Mosque
              </span>
              <div className="mt-3 flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: "color-mix(in oklab, var(--secondary) 12%, transparent)",
                    color: "var(--secondary)",
                  }}
                >
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
                    {data.mosque.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{data.mosque.address}</span>
                    {data.mosque.city && <span>, {data.mosque.city}</span>}
                    {data.mosque.country && <span>, {data.mosque.country}</span>}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {data.mosque.contact_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-foreground">{data.mosque.contact_email}</span>
                      </div>
                    )}
                    {data.mosque.contact_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-foreground">{data.mosque.contact_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2 — Shaykh Stats */}
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">
              Shaykhs
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Total Shaykhs"
                value={total}
                icon={Users}
                tone="default"
              />
              <StatCard
                label="Active Shaykhs"
                value={active}
                icon={UserCheck}
                tone="success"
              />
              <StatCard
                label="Inactive Shaykhs"
                value={inactive}
                icon={UserX}
                tone="warning"
              />
            </div>

            {/* Quick read-only list */}
            <div className="mt-6 rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
              <h3 className="font-heading text-lg font-semibold text-foreground">
                Shaykhs at your mosque
              </h3>
              <div className="mt-4">
                {data?.shaykhs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No shaykhs added yet.{" "}
                    <Link
                      to="/dashboard/create-shaykh"
                      className="font-semibold text-primary hover:underline"
                    >
                      Create a shaykh
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {data?.shaykhs.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">
                            {s.profiles?.full_name ?? "Unnamed"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {s.profiles?.email ?? "—"}
                          </div>
                        </div>
                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                            s.is_active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning";
}) {
  const isSuccess = tone === "success";
  const isWarning = tone === "warning";
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{label}</p>
          <p className="mt-2 font-heading text-3xl font-bold text-foreground md:text-4xl">
            {value}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg md:h-12 md:w-12 ${
            isSuccess
              ? "bg-emerald-100 text-emerald-600"
              : isWarning
                ? "bg-amber-100 text-amber-600"
                : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-5 w-5 md:h-6 md:w-6" />
        </div>
      </div>
    </div>
  );
}
