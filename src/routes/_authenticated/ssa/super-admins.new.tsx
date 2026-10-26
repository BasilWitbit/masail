import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, ArrowLeft, ChevronDown, Loader2 } from "lucide-react";
import {
  BrandingFields,
  DEFAULT_BRANDING,
  validateBranding,
  type BrandingValue,
} from "@/components/branding-fields";
import { PasswordInput } from "@/components/password-input";
import { createSuperAdmin } from "@/lib/ssa.functions";

export const Route = createFileRoute("/_authenticated/ssa/super-admins/new")({
  component: NewSuperAdmin,
});

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function NewSuperAdmin() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [password, setPassword] = useState("");
  const [showBranding, setShowBranding] = useState(false);
  const [branding, setBranding] = useState<BrandingValue>(DEFAULT_BRANDING);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (phone.trim().length < 5) return setError("Phone number is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (showBranding) {
      const invalid = validateBranding(branding);
      if (invalid) return setError(invalid);
    }

    setSaving(true);
    try {
      const res = await createSuperAdmin({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          tenant_name: tenantName.trim(),
          password,
          // Defaults are applied server-side when branding is omitted.
          ...(showBranding
            ? {
                branding: {
                  ...branding,
                  primary_color: branding.primary_color.trim(),
                  secondary_color: branding.secondary_color.trim(),
                },
              }
            : {}),
        },
      });
      navigate({ to: "/ssa/super-admins/$saId", params: { saId: res.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create super admin.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div>
        <Link
          to="/ssa/super-admins"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Super Admins
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-bold text-primary md:text-4xl">
          New Super Admin
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Creates a circle and its super admin account. They must change the temporary password on
          first login.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground">Account</h2>
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
              required
              maxLength={80}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Phone">
            <input
              required
              type="tel"
              minLength={5}
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
          <Field label="Temporary password">
            <PasswordInput
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <button
          type="button"
          onClick={() => setShowBranding((v) => !v)}
          aria-expanded={showBranding}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <span>
            <span className="block font-heading text-lg font-semibold text-foreground">
              Branding <span className="text-sm font-normal text-muted-foreground">(optional)</span>
            </span>
            <span className="block text-sm text-muted-foreground">
              Skip to use the default Masail colors and fonts. You can change this later.
            </span>
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
              showBranding ? "rotate-180" : ""
            }`}
          />
        </button>
        {showBranding && (
          <div className="border-t border-border p-6">
            <BrandingFields value={branding} onChange={setBranding} onError={setError} />
          </div>
        )}
      </section>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? "Creating…" : "Create Super Admin"}
      </button>
    </form>
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
