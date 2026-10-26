import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BrandingFields,
  DEFAULT_BRANDING,
  validateBranding,
  type BrandingValue,
} from "@/components/branding-fields";
import { PasswordInput } from "@/components/password-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { insertMosqueWithSlug, signupPath } from "@/lib/mosque-slug";
import {
  resetSuperAdminPassword,
  setSuperAdminActive,
  updateSuperAdmin,
} from "@/lib/ssa.functions";

export const Route = createFileRoute("/_authenticated/ssa/super-admins/$saId")({
  component: SuperAdminDetail,
});

type Sa = { id: string; full_name: string | null; email: string | null; phone: string | null };
type Tenant = { id: string; name: string; slug: string; is_active: boolean } & BrandingValue;
type Tab = "details" | "mosques" | "people" | "branding" | "security";

const TABS: [Tab, string][] = [
  ["details", "Details"],
  ["mosques", "Mosques"],
  ["people", "People"],
  ["branding", "Branding"],
  ["security", "Security"],
];

const DEACTIVATE_TEXT =
  "Are you sure you want to deactivate this Super Admin? Deactivating will block access to all mosques, users, and data under this tenant until you reactivate it. This action does NOT delete any data.";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function splitName(full: string | null): { first: string; last: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function SuperAdminDetail() {
  const { saId } = Route.useParams();
  const [tab, setTab] = useState<Tab>("details");
  const [sa, setSa] = useState<Sa | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const { data: profile, error: err } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, tenant_id, role")
      .eq("id", saId)
      .maybeSingle();
    if (err || !profile || profile.role !== "super_admin" || !profile.tenant_id) {
      setError(err?.message ?? "Super admin not found.");
      setLoading(false);
      return;
    }
    const { data: t, error: tErr } = await supabase
      .from("tenants")
      .select(
        "id, name, slug, is_active, primary_color, secondary_color, logo_url, heading_font, body_font",
      )
      .eq("id", profile.tenant_id)
      .maybeSingle();
    if (tErr || !t) {
      setError(tErr?.message ?? "Tenant not found.");
      setLoading(false);
      return;
    }
    setSa(profile);
    setTenant(t);
    setLoading(false);
  }, [saId]);

  useEffect(() => {
    load();
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [load]);

  function flash(message: string) {
    setError(null);
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          to="/ssa/super-admins"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Super Admins
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-bold text-primary md:text-4xl">
          {tenant?.name ?? "Super Admin"}
        </h1>
        {sa && (
          <p className="mt-2 text-sm text-muted-foreground">
            {sa.full_name} · {sa.email}
            {tenant && !tenant.is_active && (
              <span className="ml-2 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                Inactive
              </span>
            )}
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {sa && tenant && (
        <>
          <div className="flex flex-wrap gap-2 border-b border-border">
            {TABS.map(([value, label]) => (
              <button
                key={value}
                type="button"
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

          {tab === "details" && (
            <DetailsTab sa={sa} tenant={tenant} onSaved={load} onError={setError} onNotice={flash} />
          )}
          {tab === "mosques" && (
            <MosquesTab tenant={tenant} onError={setError} onNotice={flash} />
          )}
          {tab === "people" && <PeopleTab tenantId={tenant.id} />}
          {tab === "branding" && (
            <BrandingTab sa={sa} tenant={tenant} onSaved={load} onError={setError} onNotice={flash} />
          )}
          {tab === "security" && (
            <SecurityTab sa={sa} tenant={tenant} onSaved={load} onError={setError} onNotice={flash} />
          )}
        </>
      )}
    </div>
  );
}

type TabProps = {
  sa: Sa;
  tenant: Tenant;
  onSaved: () => void;
  onError: (m: string | null) => void;
  onNotice: (m: string) => void;
};

function SaveButton({ saving, label = "Save Changes" }: { saving: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
      {saving ? "Saving…" : label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

/* -------------------------------- Details -------------------------------- */

function DetailsTab({ sa, tenant, onSaved, onError, onNotice }: TabProps) {
  const initial = splitName(sa.full_name);
  const [firstName, setFirstName] = useState(initial.first);
  const [lastName, setLastName] = useState(initial.last);
  const [phone, setPhone] = useState(sa.phone ?? "");
  const [tenantName, setTenantName] = useState(tenant.name);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    if (!firstName.trim()) return onError("First name is required.");
    setSaving(true);
    try {
      await updateSuperAdmin({
        data: {
          sa_id: sa.id,
          first_name: firstName.trim(),
          // The server falls back to the existing last name when omitted.
          ...(lastName.trim() ? { last_name: lastName.trim() } : {}),
          phone: phone.trim() || null,
          tenant_name: tenantName.trim(),
        },
      });
      onNotice("Details saved.");
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save.");
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name">
          <input
            required
            maxLength={80}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Last name">
          <input
            maxLength={80}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Email">
          <input value={sa.email ?? ""} disabled readOnly className={`${inputClass} opacity-60`} />
        </Field>
        <Field label="Phone">
          <input
            type="tel"
            maxLength={40}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Circle name">
          <input
            required
            maxLength={120}
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <SaveButton saving={saving} />
    </form>
  );
}

/* -------------------------------- Mosques -------------------------------- */

type MosqueRow = {
  id: string;
  name: string;
  slug: string | null;
  address: string;
  city: string | null;
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

type MosqueForm = {
  name: string;
  address: string;
  city: string;
  country: string;
  contact_email: string;
  contact_phone: string;
};

const EMPTY_MOSQUE: MosqueForm = {
  name: "",
  address: "",
  city: "",
  country: "",
  contact_email: "",
  contact_phone: "",
};

function MosquesTab({
  tenant,
  onError,
  onNotice,
}: {
  tenant: Tenant;
  onError: (m: string | null) => void;
  onNotice: (m: string) => void;
}) {
  const [rows, setRows] = useState<MosqueRow[] | null>(null);
  // `null` = closed, "new" = creating, otherwise editing that mosque id
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<MosqueForm>(EMPTY_MOSQUE);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from("mosques")
      .select("id, name, slug, address, city, country, contact_email, contact_phone")
      .eq("tenant_id", tenant.id)
      .order("name");
    if (error) onError(error.message);
    setRows(data ?? []);
  }, [tenant.id, onError]);

  useEffect(() => {
    reload();
  }, [reload]);

  function openNew() {
    onError(null);
    setForm(EMPTY_MOSQUE);
    setEditing("new");
  }

  function openEdit(m: MosqueRow) {
    onError(null);
    setForm({
      name: m.name,
      address: m.address,
      city: m.city ?? "",
      country: m.country ?? "",
      contact_email: m.contact_email ?? "",
      contact_phone: m.contact_phone ?? "",
    });
    setEditing(m.id);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
    };
    if (editing === "new") {
      const { error } = await insertMosqueWithSlug({ ...payload, tenant_id: tenant.id });
      if (error) onError(error);
      else {
        onNotice("Mosque created.");
        setEditing(null);
        await reload();
      }
    } else if (editing) {
      const { error } = await supabase.from("mosques").update(payload).eq("id", editing);
      if (error) onError(error.message);
      else {
        onNotice("Mosque updated.");
        setEditing(null);
        await reload();
      }
    }
    setSaving(false);
  }

  async function handleDelete(m: MosqueRow) {
    if (
      !window.confirm(
        `Delete "${m.name}"? This removes the mosque record and its signup link. This cannot be undone.`,
      )
    )
      return;
    onError(null);
    setDeletingId(m.id);
    const { error } = await supabase.from("mosques").delete().eq("id", m.id);
    if (error) onError(error.message);
    else {
      onNotice("Mosque deleted.");
      await reload();
    }
    setDeletingId(null);
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const set = (k: keyof MosqueForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!editing && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New Mosque
          </button>
        )}
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-lg border border-border bg-card p-6"
        >
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {editing === "new" ? "New mosque" : "Edit mosque"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Address">
              <input
                required
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="City">
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Country">
              <input
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Contact email">
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Contact phone">
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => set("contact_phone", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-3">
            <SaveButton saving={saving} label={editing === "new" ? "Create Mosque" : "Save Changes"} />
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={saving}
              className="rounded-lg border border-border px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty text="This tenant has no mosques yet." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <ul className="divide-y divide-border">
            {rows.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {m.name}
                    {m.city && (
                      <span className="ml-2 font-normal text-muted-foreground">{m.city}</span>
                    )}
                  </div>
                  {m.slug && (
                    <code className="mt-1 block break-all text-xs text-muted-foreground">
                      {origin}
                      {signupPath(m.slug)}
                    </code>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    aria-label={`Edit ${m.name}`}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m)}
                    disabled={deletingId === m.id}
                    aria-label={`Delete ${m.name}`}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                  >
                    {deletingId === m.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- People -------------------------------- */

type PersonRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
};

const PEOPLE_GROUPS: ["mosque_admin" | "shaykh" | "user", string][] = [
  ["mosque_admin", "Mosque admins"],
  ["shaykh", "Shaykhs"],
  ["user", "Users"],
];

function PeopleTab({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<PersonRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("tenant_id", tenantId)
      .in("role", PEOPLE_GROUPS.map(([r]) => r))
      .order("full_name")
      .limit(1000)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        setRows(data ?? []);
      });
  }, [tenantId]);

  if (!rows) return <Loading />;
  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {rows.length === 0 ? (
        <Empty text="No people in this tenant yet." />
      ) : (
        PEOPLE_GROUPS.map(([role, label]) => {
          const group = rows.filter((p) => p.role === role);
          return (
            <section key={role} className="space-y-2">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                {label}{" "}
                <span className="text-sm font-normal text-muted-foreground">({group.length})</span>
              </h2>
              {group.length === 0 ? (
                <Empty text={`No ${label.toLowerCase()}.`} />
              ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.map((p) => (
                        <tr key={p.id}>
                          <td className="px-4 py-3 font-semibold">{p.full_name || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.email ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

/* -------------------------------- Branding ------------------------------- */

function BrandingTab({ sa, tenant, onSaved, onError, onNotice }: TabProps) {
  const [value, setValue] = useState<BrandingValue>({
    ...DEFAULT_BRANDING,
    primary_color: tenant.primary_color,
    secondary_color: tenant.secondary_color,
    logo_url: tenant.logo_url,
    heading_font: tenant.heading_font,
    body_font: tenant.body_font,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    const invalid = validateBranding(value);
    if (invalid) return onError(invalid);
    setSaving(true);
    try {
      await updateSuperAdmin({
        data: {
          sa_id: sa.id,
          branding: {
            ...value,
            primary_color: value.primary_color.trim(),
            secondary_color: value.secondary_color.trim(),
          },
        },
      });
      onNotice("Branding saved.");
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save.");
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <BrandingFields value={value} onChange={setValue} onError={onError} />
      <SaveButton saving={saving} />
    </form>
  );
}

/* -------------------------------- Security ------------------------------- */

function SecurityTab({ sa, tenant, onSaved, onError, onNotice }: TabProps) {
  const [password, setPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    if (password.length < 8) return onError("Password must be at least 8 characters.");
    setResetting(true);
    try {
      await resetSuperAdminPassword({ data: { sa_id: sa.id, password } });
      setPassword("");
      onNotice("Password reset. The super admin must change it on next login.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to reset password.");
    }
    setResetting(false);
  }

  async function applyActive(next: boolean) {
    onError(null);
    setToggling(true);
    try {
      await setSuperAdminActive({ data: { sa_id: sa.id, active: next } });
      onNotice(next ? "Super Admin activated." : "Super Admin deactivated.");
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update status.");
    }
    setToggling(false);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleReset}
        className="space-y-4 rounded-lg border border-border bg-card p-6"
      >
        <h2 className="font-heading text-lg font-semibold">Reset password</h2>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          placeholder="New temporary password"
          autoComplete="new-password"
          className={`${inputClass} max-w-sm`}
        />
        <div>
          <SaveButton saving={resetting} label="Reset Password" />
        </div>
      </form>

      <div className="space-y-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg font-semibold">
          {tenant.is_active ? "Deactivate Super Admin" : "Reactivate Super Admin"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {tenant.is_active
            ? "Blocks access to all mosques, users, and data under this tenant until reactivated. No data is deleted."
            : "This Super Admin is currently inactive. Reactivating restores access for everyone in the tenant."}
        </p>
        <button
          type="button"
          onClick={() => (tenant.is_active ? setConfirmOpen(true) : applyActive(true))}
          disabled={toggling}
          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
            tenant.is_active
              ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "bg-primary text-primary-foreground hover:opacity-90"
          }`}
        >
          {toggling && <Loader2 className="h-4 w-4 animate-spin" />}
          {tenant.is_active ? "Deactivate" : "Activate"}
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Super Admin?</AlertDialogTitle>
            <AlertDialogDescription>{DEACTIVATE_TEXT}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => applyActive(false)}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
