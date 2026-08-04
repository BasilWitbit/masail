import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireRole } from "@/lib/require-role";
import {
  FONT_OPTIONS,
  applyPlatformSettings,
} from "@/lib/use-platform-theme";

export const Route = createFileRoute("/_authenticated/dashboard/ui-settings")({
  beforeLoad: requireRole(["super_admin"]),
  component: UiSettings,
});

type Settings = {
  id: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  heading_font: string;
  body_font: string;
};

const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

function UiSettings() {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Settings | null>(null);
  const [primary, setPrimary] = useState("#0F5C4D");
  const [secondary, setSecondary] = useState("#D4AF37");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [headingFont, setHeadingFont] = useState("Montserrat");
  const [bodyFont, setBodyFont] = useState("Source Sans 3");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("platform_settings")
      .select("id, primary_color, secondary_color, logo_url, heading_font, body_font")
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) setError(err.message);
        if (data) {
          const s = data as Settings;
          setRow(s);
          setPrimary(s.primary_color ?? "#0F5C4D");
          setSecondary(s.secondary_color ?? "#D4AF37");
          setLogoUrl(s.logo_url);
          setHeadingFont(s.heading_font ?? "Montserrat");
          setBodyFont(s.body_font ?? "Source Sans 3");
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      setError(upErr.message);
      return;
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);
    if (!HEX.test(primary.trim())) {
      setError("Primary color must be a valid hex code (e.g. #0F5C4D).");
      return;
    }
    if (!HEX.test(secondary.trim())) {
      setError("Secondary color must be a valid hex code (e.g. #D4AF37).");
      return;
    }
    if (!row) {
      setError("Settings row not found.");
      return;
    }
    setSaving(true);
    const payload = {
      primary_color: primary.trim(),
      secondary_color: secondary.trim(),
      logo_url: logoUrl,
      heading_font: headingFont,
      body_font: bodyFont,
    };
    const { error: err } = await supabase
      .from("platform_settings")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    applyPlatformSettings(payload);
    setSuccess("Settings updated — changes will apply across the site.");
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading UI settings…
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">UI Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Control the platform's brand colors, logo, and typography.
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

      <section className="rounded-lg border border-border bg-card p-6 space-y-6">
        <h2 className="font-heading text-lg font-semibold text-foreground">Brand Colors</h2>
        <ColorField label="Primary Color" value={primary} onChange={setPrimary} />
        <ColorField label="Secondary Color" value={secondary} onChange={setSecondary} />
      </section>

      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">Logo</h2>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Current platform logo"
              className="h-14 w-auto rounded-lg bg-muted/40 p-2 object-contain"
            />
          ) : (
            <span className="font-heading text-xl font-bold tracking-wide text-foreground">
              MASAIL
            </span>
          )}
          {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50">
          <Upload className="h-4 w-4" />
          Upload New Logo
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
        <p className="text-sm text-muted-foreground">
          PNG or SVG with a transparent background works best.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 space-y-6">
        <h2 className="font-heading text-lg font-semibold text-foreground">Typography</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <FontField label="Heading Font" value={headingFont} onChange={setHeadingFont} />
          <FontField label="Body Font" value={bodyFont} onChange={setBodyFont} />
        </div>
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || uploading}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = HEX.test(value.trim());
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={valid ? value.trim() : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent p-1"
          aria-label={`${label} picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-40 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
          aria-label={`${label} hex value`}
        />
        {!valid && <span className="text-sm text-destructive">Invalid hex</span>}
      </div>
    </div>
  );
}

function FontField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <p className="text-sm text-muted-foreground" style={{ fontFamily: `"${value}", sans-serif` }}>
        The quick brown fox jumps over the lazy dog.
      </p>
    </div>
  );
}
