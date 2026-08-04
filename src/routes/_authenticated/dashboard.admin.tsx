import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Flag,
  Loader2,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/admin")({
  beforeLoad: requireRole(["super_admin"]),
  component: AdminDashboard,
});

type Question = {
  id: string;
  status: string;
  created_at: string;
  category_id: string | null;
  mosque_id: string;
  categories: { name: string } | null;
  mosques: { name: string } | null;
};

type DashboardStats = {
  totalQuestions: number;
  answered: number;
  pending: number;
  slaBreaches: number;
  pendingReports: number;
  totalMosques: number;
  totalShaykhs: number;
};

type CountRow = { name: string; count: number };

const PENDING_STATUSES = [
  "submitted",
  "in_pool",
  "claimed",
  "pending_peer_review",
  "peer_approved",
  "needs_revision",
];

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

function useAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          questionsResult,
          reportsCountResult,
          mosquesCountResult,
          shaykhsCountResult,
        ] = await Promise.all([
          supabase
            .from("questions")
            .select(
              "id, status, created_at, category_id, mosque_id, categories(name), mosques(name)",
            )
            .order("created_at", { ascending: false }),
          supabase
            .from("reports")
            .select("id, questions!inner(status)", { count: "exact", head: true })
            .eq("questions.status", "reported"),
          supabase.from("mosques").select("*", { count: "exact", head: true }),
          supabase
            .from("shaykhs")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true),
        ]);

        if (!active) return;

        if (questionsResult.error) throw questionsResult.error;
        if (reportsCountResult.error) throw reportsCountResult.error;
        if (mosquesCountResult.error) throw mosquesCountResult.error;
        if (shaykhsCountResult.error) throw shaykhsCountResult.error;

        const allQuestions = (questionsResult.data as unknown as Question[]) ?? [];
        const totalQuestions = allQuestions.length;
        const answered = allQuestions.filter((q) => q.status === "sent_to_user").length;
        const pending = allQuestions.filter((q) => PENDING_STATUSES.includes(q.status)).length;
        const slaBreaches = allQuestions.filter((q) => {
          if (q.status === "sent_to_user") return false;
          const created = new Date(q.created_at).getTime();
          return Date.now() - created > FORTY_EIGHT_HOURS_MS;
        }).length;

        setQuestions(allQuestions);
        setStats({
          totalQuestions,
          answered,
          pending,
          slaBreaches,
          pendingReports: reportsCountResult.count ?? 0,
          totalMosques: mosquesCountResult.count ?? 0,
          totalShaykhs: shaykhsCountResult.count ?? 0,
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

  const categories = useMemo<CountRow[]>(() => {
    const map = new Map<string, number>();
    questions.forEach((q) => {
      const key = q.categories?.name?.trim() || "Uncategorized";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [questions]);

  const mosques = useMemo<CountRow[]>(() => {
    const map = new Map<string, number>();
    questions.forEach((q) => {
      const key = q.mosques?.name?.trim() || "Unknown mosque";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [questions]);

  return { loading, error, stats, categories, mosques };
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  to,
  children,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning" | "primary";
  to?: string;
  children?: React.ReactNode;
}) {
  const isWarning = tone === "warning";
  const isPrimary = tone === "primary";
  const content = (
    <div
      className={`relative overflow-hidden rounded-lg border bg-card p-5 shadow-sm transition md:p-6 ${
        isWarning
          ? "border-red-200 bg-red-50"
          : "border-border hover:shadow-md"
      } ${to ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className={`text-sm font-semibold ${
              isWarning ? "text-red-700" : "text-muted-foreground"
            }`}
          >
            {label}
          </p>
          <p
            className={`mt-2 font-heading text-3xl font-bold md:text-4xl ${
              isWarning ? "text-red-700" : "text-foreground"
            }`}
          >
            {value}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg md:h-12 md:w-12 ${
            isWarning
              ? "bg-red-100 text-red-600"
              : isPrimary
                ? "text-primary-foreground"
                : "bg-muted text-muted-foreground"
          }`}
          style={
            isPrimary ? { background: "var(--primary)" } : undefined
          }
        >
          <Icon className="h-5 w-5 md:h-6 md:w-6" />
        </div>
      </div>
      {children}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
        {content}
      </Link>
    );
  }
  return content;
}

function RankedList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: CountRow[];
  empty: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
      <h2 className="font-heading text-lg font-bold text-foreground md:text-xl">
        {title}
      </h2>
      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li
                key={row.name}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <span className="text-sm font-medium text-foreground">{row.name}</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    background: "color-mix(in oklab, var(--primary) 10%, transparent)",
                    color: "var(--primary)",
                  }}
                >
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { loading, error, stats, categories, mosques } = useAdminDashboard();

  return (
    <div>
      <div className="max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Overview of questions, scholars, and activity across the platform.
        </p>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading dashboard…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Questions"
                value={stats?.totalQuestions ?? 0}
                icon={FileText}
                tone="primary"
              />
              <StatCard
                label="Answered"
                value={stats?.answered ?? 0}
                icon={CheckCircle2}
              />
              <StatCard
                label="Pending"
                value={stats?.pending ?? 0}
                icon={Clock}
              />
              <StatCard
                label="SLA Breaches"
                value={stats?.slaBreaches ?? 0}
                icon={AlertTriangle}
                tone="warning"
              />
              <StatCard
                label="Pending Reports"
                value={stats?.pendingReports ?? 0}
                icon={Flag}
                tone="primary"
                to="/dashboard/reports"
              >
                <p className="mt-3 text-xs text-muted-foreground">Click to review reports</p>
              </StatCard>
              <StatCard
                label="Total Mosques"
                value={stats?.totalMosques ?? 0}
                icon={Building2}
              />
              <StatCard
                label="Total Shaykhs"
                value={stats?.totalShaykhs ?? 0}
                icon={Users}
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <RankedList
                title="Questions by Category"
                rows={categories}
                empty="No questions have been categorized yet."
              />
              <RankedList
                title="Questions by Mosque"
                rows={mosques}
                empty="No mosque activity yet."
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
