import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireRole } from "@/lib/require-role";
import { applyPlatformSettings } from "@/lib/use-platform-theme";
import {
  BrandingFields,
  DEFAULT_BRANDING,
  validateBranding,
  type BrandingValue,
} from "@/components/branding-fields";

export const Route = createFileRoute("/_authenticated/dashboard/ui-settings")({
  beforeLoad: requireRole(["super_admin"]),
  component: UiSettings,
});

/** Super admins edit their own tenant's branding (platform default is SSA-only at /ssa/settings). */
function UiSettings() {
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [value, setValue] = useState<BrandingValue>(DEFAULT_BRANDING);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userData.user?.id ?? "")
        .maybeSingle();
      if (!active) return;
      if (!profile?.tenant_id) {
        setError("Your account is not linked to a tenant.");
        setLoading(false);
        return;
      }
      const { data: tenant, error: err } = await supabase
        .from("tenants")
        .select("id, primary_color, secondary_color, logo_url, heading_font, body_font")
        .eq("id", profile.tenant_id)
        .maybeSingle();
      if (!active) return;
      if (err || !tenant) {
        setError(err?.message ?? "Tenant not found.");
      } else {
        setTenantId(tenant.id);
        setValue({
          primary_color: tenant.primary_color,
          secondary_color: tenant.secondary_color,
          logo_url: tenant.logo_url,
          heading_font: tenant.heading_font,
          body_font: tenant.body_font,
        });
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    if (!tenantId) return;
    setError(null);
    setSuccess(null);
    const invalid = validateBranding(value);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    const payload = {
      primary_color: value.primary_color.trim(),
      secondary_color: value.secondary_color.trim(),
      logo_url: value.logo_url,
      heading_font: value.heading_font,
      body_font: value.body_font,
    };
    const { error: err } = await supabase
      .from("tenants")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", tenantId);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    applyPlatformSettings(payload);
    setSuccess("Settings updated — changes will apply across your organisation.");
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading UI settings…
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">UI Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Control your organisation's brand colors, logo, and typography. Mosques can override
          these with their own branding.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {tenantId && (
        <>
          <BrandingFields value={value} onChange={setValue} onError={setError} />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </>
      )}
    </div>
  );
}
