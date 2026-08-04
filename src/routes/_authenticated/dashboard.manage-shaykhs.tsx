import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/manage-shaykhs")({
  beforeLoad: requireRole(["mosque_admin"]),
  component: ManageShaykhs,
});

type ShaykhRow = {
  id: string;
  is_active: boolean;
  profile_id: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

function ManageShaykhs() {
  const [rows, setRows] = useState<ShaykhRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
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
        setError("Your account isn't linked to a mosque.");
        setLoading(false);
        return;
      }
      const { data, error: err } = await supabase
        .from("shaykhs")
        .select("id, is_active, profile_id, profiles(full_name, email)")
        .eq("mosque_id", profile.mosque_id)
        .order("created_at", { ascending: false });
      if (err) setError(err.message);
      setRows((data as unknown as ShaykhRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function toggleActive(id: string, next: boolean) {
    setUpdating(id);
    const { error: err } = await supabase
      .from("shaykhs")
      .update({ is_active: next })
      .eq("id", id);
    if (!err) {
      setRows((r) => r.map((s) => (s.id === id ? { ...s, is_active: next } : s)));
    } else {
      setError(err.message);
    }
    setUpdating(null);
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
          Manage Shaykhs
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Activate or deactivate shaykhs at your mosque.
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

      <div className="rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No shaykhs at your mosque yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {s.profiles?.full_name ?? "Unnamed"}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {s.profiles?.email ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      s.is_active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => toggleActive(s.id, !s.is_active)}
                    disabled={updating === s.id}
                    role="switch"
                    aria-checked={s.is_active}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-60 ${
                      s.is_active ? "bg-primary" : "bg-muted-foreground/40"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        s.is_active ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
