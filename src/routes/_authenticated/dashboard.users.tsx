import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Download, Loader2, Mail, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/users")({
  beforeLoad: requireRole(["mosque_admin"]),
  component: MosqueUsers,
});

type Tab = "pending" | "approved" | "qr";

const TABS: { key: Tab; label: string; empty: string }[] = [
  { key: "pending", label: "Pending Users", empty: "No pending signup requests right now." },
  { key: "approved", label: "Approved Users", empty: "No approved users yet." },
  { key: "qr", label: "Signup QR Code", empty: "" },
];

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  approval_status: "pending_approval" | "approved" | "rejected";
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MosqueUsers() {
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("mosque_id")
          .eq("id", userData.user.id)
          .maybeSingle();
        if (!profile?.mosque_id) {
          if (active) setError("Your account isn't linked to a mosque.");
          return;
        }
        const { data, error: err } = await supabase
          .from("profiles")
          .select("id, full_name, email, created_at, approval_status")
          .eq("role", "user")
          .eq("mosque_id", profile.mosque_id)
          .in("approval_status", ["pending_approval", "approved"])
          .order("created_at", { ascending: false });
        if (err) throw err;
        if (active) setRows((data as unknown as UserRow[]) ?? []);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load users.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(
    () =>
      rows.filter((r) =>
        tab === "pending" ? r.approval_status === "pending_approval" : r.approval_status === "approved",
      ),
    [rows, tab],
  );

  async function decide(row: UserRow, next: "approved" | "rejected") {
    const name = row.full_name?.trim() || row.email || "this user";
    const verb = next === "approved" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${verb} ${name}?`)) return;

    setBusy(row.id);
    const prev = rows;
    setRows((r) =>
      next === "approved"
        ? r.map((u) => (u.id === row.id ? { ...u, approval_status: "approved" as const } : u))
        : r.filter((u) => u.id !== row.id),
    );

    const { error: err } = await supabase
      .from("profiles")
      .update({ approval_status: next })
      .eq("id", row.id);

    setBusy(null);
    if (err) {
      setRows(prev);
      toast.error(err.message);
      return;
    }
    toast.success(next === "approved" ? `${name} approved.` : `${name} rejected.`);
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">Users</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review signup requests and see approved members of your mosque.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.key
                ? "border-b-2 border-primary text-primary"
                : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
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
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading users…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-12 text-center text-sm text-muted-foreground">
          {TABS.find((t) => t.key === tab)!.empty}
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-5 shadow-sm md:p-6"
            >
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: "color-mix(in oklab, var(--primary) 10%, transparent)",
                    color: "var(--primary)",
                  }}
                >
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {u.full_name?.trim() || "Unnamed"}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{u.email ?? "—"}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Signed up {formatDate(u.created_at)}
                  </div>
                </div>
              </div>

              {tab === "pending" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => decide(u, "approved")}
                    disabled={busy === u.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button
                    onClick={() => decide(u, "rejected")}
                    disabled={busy === u.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
