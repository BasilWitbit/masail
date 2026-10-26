import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ssa/audit")({
  component: SsaAudit,
});

type LogRow = {
  id: string;
  action: string;
  target_table: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

// activity_logs is not yet in the generated Supabase types.
type LooseClient = {
  from: (table: string) => {
    select: (cols: string) => {
      order: (
        col: string,
        opts: { ascending: boolean },
      ) => {
        limit: (n: number) => PromiseLike<{ data: LogRow[] | null; error: { message: string } | null }>;
      };
    };
  };
};

function SsaAudit() {
  const [rows, setRows] = useState<LogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (supabase as unknown as LooseClient)
      .from("activity_logs")
      .select("id, action, target_table, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) setError(err.message);
        else setRows(data ?? []);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">Audit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Recent platform-owner activity, newest first.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!rows && !error ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows && rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-10 text-center text-sm text-muted-foreground">
          No activity recorded yet.
        </div>
      ) : rows ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Target</th>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const hasMeta = r.metadata && Object.keys(r.metadata).length > 0;
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="px-4 py-3 font-semibold">{r.action.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.target_table ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {hasMeta ? (
                          <code className="block max-w-md break-all text-xs text-muted-foreground">
                            {JSON.stringify(r.metadata)}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
