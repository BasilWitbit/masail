import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FONT_OPTIONS } from "@/lib/use-platform-theme";

export const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export type BrandingValue = {
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  heading_font: string;
  body_font: string;
};

export const DEFAULT_BRANDING: BrandingValue = {
  primary_color: "#1B4F72",
  secondary_color: "#2E86C1",
  logo_url: null,
  heading_font: "Montserrat",
  body_font: "Source Sans 3",
};

/** Returns an error message when the colors are not valid hex codes. */
export function validateBranding(v: BrandingValue): string | null {
  if (!HEX.test(v.primary_color.trim())) return "Primary color must be a valid hex code.";
  if (!HEX.test(v.secondary_color.trim())) return "Secondary color must be a valid hex code.";
  return null;
}

export function BrandingFields({
  value,
  onChange,
  onError,
}: {
  value: BrandingValue;
  onChange: (next: BrandingValue) => void;
  onError?: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof BrandingValue>(key: K, v: BrandingValue[K]) =>
    onChange({ ...value, [key]: v });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (error) {
      onError?.(error.message);
      return;
    }
    set("logo_url", supabase.storage.from("branding").getPublicUrl(path).data.publicUrl);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground">Brand Colors</h2>
        <ColorField
          label="Primary Color"
          value={value.primary_color}
          onChange={(v) => set("primary_color", v)}
        />
        <ColorField
          label="Secondary Color"
          value={value.secondary_color}
          onChange={(v) => set("secondary_color", v)}
        />
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground">Logo</h2>
        <div className="flex items-center gap-4">
          {value.logo_url ? (
            <img
              src={value.logo_url}
              alt="Current logo"
              className="h-14 w-auto rounded-lg bg-muted/40 p-2 object-contain"
            />
          ) : (
            <span className="font-heading text-xl font-bold tracking-wide text-foreground">
              MASAIL
            </span>
          )}
          {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50">
            <Upload className="h-4 w-4" />
            Upload Logo
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          {value.logo_url && (
            <button
              type="button"
              onClick={() => set("logo_url", null)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Remove
            </button>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground">Typography</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <FontField
            label="Heading Font"
            value={value.heading_font}
            onChange={(v) => set("heading_font", v)}
          />
          <FontField
            label="Body Font"
            value={value.body_font}
            onChange={(v) => set("body_font", v)}
          />
        </div>
      </section>
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
          value={valid && value.trim().length === 7 ? value.trim() : "#000000"}
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
  const options = FONT_OPTIONS.includes(value as (typeof FONT_OPTIONS)[number])
    ? [...FONT_OPTIONS]
    : [value, ...FONT_OPTIONS];
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
      >
        {options.map((f) => (
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
