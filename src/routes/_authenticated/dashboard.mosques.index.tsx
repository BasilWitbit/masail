import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { assignMosqueSlug, insertMosqueWithSlug } from "@/lib/mosque-slug";
import { requireRole } from "@/lib/require-role";
import { PasswordInput } from "@/components/password-input";

export const Route = createFileRoute("/_authenticated/dashboard/mosques/")({
  beforeLoad: requireRole(["super_admin"]),
  component: ManageMosquesPage,
});

type Mosque = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  slug: string | null;
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

type SubTab = "mosques" | "admins";

function ManageMosquesPage() {
  const [tab, setTab] = useState<SubTab>("mosques");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
          Manage Mosques
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage mosques on the platform and the admins who run them.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {(
          [
            ["mosques", "Mosques"],
            ["admins", "Mosque Admins"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`-mb-px rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
              tab === value
                ? "border-b-2 border-primary text-primary"
                : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "mosques" ? <MosquesTab /> : <MosqueAdminsTab />}
    </div>
  );
}

/* ------------------------------- Mosques tab ------------------------------ */

function MosquesTab() {
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
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
      .select("id, name, address, city, country, contact_email, contact_phone, slug")
      .order("name");
    const rows = (data as Mosque[]) ?? [];
    for (const row of rows) {
      if (row.slug) continue;
      try {
        row.slug = await assignMosqueSlug(row.id, row.name);
      } catch {
        // Leave slug empty; mosque-admin QR tab will surface a clear error if needed.
      }
    }
    setMosques(rows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mosques;
    return mosques.filter((m) =>
      [m.name, m.city ?? "", m.country ?? ""].some((v) => v.toLowerCase().includes(q)),
    );
  }, [mosques, query]);

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
    if (editingId) {
      const { error: err } = await supabase.from("mosques").update(payload).eq("id", editingId);
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
    } else {
      const { error: err } = await insertMosqueWithSlug(payload);
      setSaving(false);
      if (err) {
        setError(err);
        return;
      }
    }
    setModalOpen(false);
    setSuccess(editingId ? "Mosque updated." : "Mosque added.");
    setTimeout(() => setSuccess(null), 3000);
    load();
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, city, or country…"
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
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
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No mosques match your search.
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
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold text-foreground">{m.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.city ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.country ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.contact_email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.contact_phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to="/dashboard/mosques/$id/settings"
                          params={{ id: m.id }}
                          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Settings"
                        >
                          <Settings className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => openEdit(m)}
                          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
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
              <Field label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <Field label="Address *" value={form.address} onChange={(v) => setForm({ ...form, address: v })} required />
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

/* ---------------------------- Mosque Admins tab --------------------------- */

type MosqueOption = { id: string; name: string; city: string | null };
type AdminRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  mosque_id: string | null;
  mosques: { name: string } | null;
};

function MosqueAdminsTab() {
  const [mosques, setMosques] = useState<MosqueOption[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mosqueId, setMosqueId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pwChecks = useMemo(
    () => ({
      length: password.length >= 8,
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      digit: /\d/.test(password),
    }),
    [password],
  );

  async function loadAdmins() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, mosque_id, mosques(name)")
      .eq("role", "mosque_admin")
      .order("created_at", { ascending: false });
    setAdmins((data as unknown as AdminRow[]) ?? []);
  }

  useEffect(() => {
    (async () => {
      const { data: mList } = await supabase
        .from("mosques")
        .select("id, name, city")
        .order("name");
      setMosques((mList as MosqueOption[]) ?? []);
      await loadAdmins();
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((a) =>
      [a.full_name ?? "", a.email ?? "", a.mosques?.name ?? ""].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [admins, query]);

  const freeMosques = useMemo(() => {
    const assignedIds = new Set(admins.map((a) => a.mosque_id).filter(Boolean));
    if (editingId) {
      const current = admins.find(a => a.id === editingId);
      if (current?.mosque_id) assignedIds.delete(current.mosque_id);
    }
    return mosques.filter((m) => !assignedIds.has(m.id));
  }, [mosques, admins, editingId]);

  function openCreate() {
    setEditingId(null);
    setFullName("");
    setEmail("");
    setMosqueId("");
    setPassword("");
    setError(null);
    setModalOpen(true);
  }

  function openEdit(a: AdminRow) {
    setEditingId(a.id);
    setFullName(a.full_name ?? "");
    setEmail(a.email ?? "");
    setMosqueId(a.mosque_id ?? "");
    setPassword("");
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim() || !email.trim() || !mosqueId) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);

    if (editingId) {
      const { error: err } = await supabase.from("profiles").update({
        full_name: fullName.trim(),
        email: email.trim(),
        mosque_id: mosqueId,
      }).eq("id", editingId);
      
      setSubmitting(false);
      if (err) {
        setError(err.message);
        return;
      }
      setSuccess("Mosque admin updated successfully.");
    } else {
      if (!pwChecks.length || !pwChecks.lower || !pwChecks.upper || !pwChecks.digit) {
        setError("Password doesn't meet the requirements.");
        setSubmitting(false);
        return;
      }

      const { data, error: err } = await supabase.functions.invoke("create-mosque-admin", {
        body: {
          full_name: fullName.trim(),
          email: email.trim(),
          mosque_id: mosqueId,
          password,
        },
      });
      setSubmitting(false);

      if (err) {
        setError(
          err.message?.includes("Function not found") || err.message?.includes("404")
            ? "The create-mosque-admin function isn't deployed yet."
            : err.message || "Failed to create mosque admin.",
        );
        return;
      }
      if (data?.error) {
        setError(data.error);
        return;
      }
      setSuccess("Mosque admin created successfully.");
    }

    setModalOpen(false);
    setFullName("");
    setEmail("");
    setMosqueId("");
    setPassword("");
    loadAdmins();
    setTimeout(() => setSuccess(null), 4000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or mosque…"
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Create Admin
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

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm md:p-8">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Existing Mosque Admins
        </h2>
        {admins.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No mosque admins yet.</p>
        ) : filtered.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No admins match your search.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {filtered.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {a.full_name ?? "Unnamed"}
                  </div>
                  <div className="text-xs text-muted-foreground">{a.email ?? "—"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                    {a.mosques?.name ?? "No mosque"}
                  </span>
                  <button
                    onClick={() => openEdit(a)}
                    className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                {editingId ? "Edit Mosque Admin" : "Create Mosque Admin"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <label className="block text-sm font-semibold text-foreground">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground">
                  Mosque <span className="text-red-600">*</span>
                </label>
                <select
                  value={mosqueId}
                  onChange={(e) => setMosqueId(e.target.value)}
                  disabled={freeMosques.length === 0}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                >
                  <option value="">
                    {freeMosques.length === 0 ? "No free mosques available" : "Select a mosque…"}
                  </option>
                  {freeMosques.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.city ? ` — ${m.city}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              
              {!editingId && (
                <div>
                  <label className="block text-sm font-semibold text-foreground">
                    Temporary Password <span className="text-red-600">*</span>
                  </label>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <PwRule ok={pwChecks.length} label="At least 8 characters" active={password.length > 0} />
                    <PwRule ok={pwChecks.lower} label="One lowercase letter" active={password.length > 0} />
                    <PwRule ok={pwChecks.upper} label="One uppercase letter" active={password.length > 0} />
                    <PwRule ok={pwChecks.digit} label="One digit" active={password.length > 0} />
                  </ul>
                </div>
              )}

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
                  disabled={submitting}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? "Saving…" : editingId ? "Save Changes" : "Create Mosque Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PwRule({ ok, label, active }: { ok: boolean; label: string; active: boolean }) {
  const color = !active ? "text-muted-foreground" : ok ? "text-emerald-700" : "text-red-600";
  return (
    <li className={`flex items-center gap-1.5 ${color}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </li>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
