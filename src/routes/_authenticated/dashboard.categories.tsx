import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/categories")({
  component: ManageCategories,
});

type Category = { id: string; name: string };

function ManageCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("categories").select("id, name").order("name");
    setCategories((data as Category[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = newName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setError("A category with that name already exists.");
      return;
    }
    setAdding(true);
    const { error: err } = await supabase.from("categories").insert({ name });
    setAdding(false);
    if (err) {
      setError(
        err.code === "23505"
          ? "A category with that name already exists."
          : err.message,
      );
      return;
    }
    setNewName("");
    load();
  }

  async function handleDelete(cat: Category) {
    const { count } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("category_id", cat.id);
    const inUse = count ?? 0;
    const warn = inUse > 0
      ? `Warning: "${cat.name}" is used by ${inUse} question(s). Delete anyway?`
      : `Delete category "${cat.name}"?`;
    if (!confirm(warn)) return;
    const { error: err } = await supabase.from("categories").delete().eq("id", cat.id);
    if (err) {
      alert(err.message);
      return;
    }
    load();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
          Manage Categories
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add or remove categories used for organizing questions.
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <div>
          <label className="block text-sm font-semibold text-foreground">
            New Category Name
          </label>
          <div className="mt-2 flex gap-2">
            <input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Prayer"
              className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> {adding ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}
      </form>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No categories yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-foreground">{c.name}</span>
                <button
                  onClick={() => handleDelete(c)}
                  className="grid h-8 w-8 place-items-center rounded-md text-red-600 transition hover:bg-red-50"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
