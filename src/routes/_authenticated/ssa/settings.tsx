import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BrandingFields,
  DEFAULT_BRANDING,
  validateBranding,
  type BrandingValue,
} from "@/components/branding-fields";
import { applyPlatformSettings } from "@/lib/use-platform-theme";

export const Route = createFileRoute("/_authenticated/ssa/settings")({
  component: SsaSettings,
});

const COLUMNS = "id, primary_color, secondary_color, logo_url, heading_font, body_font";

function SsaSettings() {
  const [loading, setLoading] = useState(true);
  const [rowId, setRowId] = useState<string | null>(null);
  const [value, setValue] = useState<BrandingValue>(DEFAULT_BRANDING);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("platform_settings")
      .select(COLUMNS)
      .is("mosque_id", null)
      .is("tenant_id", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) setError(err.message);
        const row = data?.[0];
        if (row) {
          setRowId(row.id);
          setValue({
            primary_color: row.primary_color,
            secondary_color: row.secondary_color,
            logo_url: row.logo_url,
            heading_font: row.heading_font,
            body_font: row.body_font,
          });
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
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
      updated_at: new Date().toISOString(),
    };
    if (rowId) {
      const { error: err } = await supabase
        .from("platform_settings")
        .update(payload)
        .eq("id", rowId);
      if (err) setError(err.message);
      else setSuccess("Platform default branding saved.");
    } else {
      const { data, error: err } = await supabase
        .from("platform_settings")
        .insert({ ...payload, mosque_id: null, tenant_id: null })
        .select("id")
        .single();
      if (err) setError(err.message);
      else {
        setRowId(data.id);
        setSuccess("Platform default branding saved.");
      }
    }
    setSaving(false);
    applyPlatformSettings(payload);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
          Platform Branding
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Default look used until a tenant or mosque sets its own branding.
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
    </div>
  );
}
