import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/dashboard/mosques")({
  beforeLoad: requireRole(["super_admin"]),
  component: ManageMosques,
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

type FormState = {
  name: string;
  address: string;
  city: string;
  country: string;
  contact_email: string;
  contact_phone: string;
};

const emptyForm: FormState = {
  name: "",
  address: "",
  city: "",
  country: "",
  contact_email: "",
  contact_phone: "",
};

function ManageMosques() {
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("mosques")
      .select("id, name, address, city, country, contact_email, contact_phone")
      .order("name");
    setMosques((data as Mosque[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(m: Mosque) {
    setEditingId(m.id);
    setForm({
      name: m.name,
      address: m.address,
      city: m.city ?? "",
      country: m.country ?? "",
      contact_email: m.contact_email ?? "",
      contact_phone: m.contact_phone ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.address.trim()) {
      setError("Name and address are required.");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
    };
    const { error: err } = editingId
      ? await supabase.from("mosques").update(payload).eq("id", editingId)
      : await supabase.from("mosques").insert(payload);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setModalOpen(false);
    setSuccess(editingId ? "Mosque updated." : "Mosque added.");
    setTimeout(() => setSuccess(null), 3000);
    load();
  }

  async function handleDelete(m: Mosque) {
    if (!confirm(`Delete mosque "${m.name}"? This cannot be undone.`)) return;
    const { error: err } = await supabase.from("mosques").delete().eq("id", m.id);
    if (err) {
      alert(err.message);
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
            Manage Mosques
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add, edit, or remove mosques on the platform.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add Mosque
        </button>
      </div>

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : mosques.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No mosques yet. Click "Add Mosque" to create the first one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">City</th>
                  <th className="px-4 py-3 font-semibold">Country</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mosques.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold text-foreground">{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.city ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.country ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.contact_email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.contact_phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(m)}
                          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="grid h-8 w-8 place-items-center rounded-md text-red-600 transition hover:bg-red-50"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                {editingId ? "Edit Mosque" : "Add Mosque"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <Field label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Address *" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
              </div>
              <Field
                label="Contact Email"
                type="email"
                value={form.contact_email}
                onChange={(v) => setForm({ ...form, contact_email: v })}
              />
              <Field
                label="Contact Phone"
                type="tel"
                value={form.contact_phone}
                onChange={(v) => setForm({ ...form, contact_phone: v })}
              />
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Saving…" : editingId ? "Save Changes" : "Add Mosque"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
