import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlatformSettings = {
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  heading_font?: string | null;
  body_font?: string | null;
};

export const FONT_OPTIONS = [
  "Montserrat",
  "Playfair Display",
  "Source Sans 3",
  "Georgia",
  "Inter",
] as const;

export function applyPlatformSettings(data: PlatformSettings) {
  const root = document.documentElement;
  if (data.primary_color) {
    root.style.setProperty("--primary", data.primary_color);
    root.style.setProperty("--ring", data.primary_color);
  }
  if (data.secondary_color) {
    root.style.setProperty("--secondary", data.secondary_color);
  }
  if (data.heading_font) {
    root.style.setProperty(
      "--font-heading",
      `"${data.heading_font}", ui-sans-serif, system-ui, sans-serif`,
    );
  }
  if (data.body_font) {
    root.style.setProperty(
      "--font-sans",
      `"${data.body_font}", ui-sans-serif, system-ui, sans-serif`,
    );
  }
}

export function clearPlatformTheme() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const prop of ["--primary", "--ring", "--secondary", "--font-heading", "--font-sans"]) {
    root.style.removeProperty(prop);
  }
}

const RESERVED_SEGMENTS = new Set([
  "qa",
  "login",
  "signup",
  "verify-otp",
  "dashboard",
  "ssa",
  "tenant-unavailable",
  "api",
]);

/** Parses `/{mosqueSlug}/...` public paths (e.g. the signup link). */
function getMosqueSlugFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 1) return null;
  // Legacy dual-slug: /tenant/mosque/signup — use mosque segment
  if (parts.length >= 2 && parts[parts.length - 1] === "signup") {
    const mosqueSlug = parts[parts.length - 2];
    if (!RESERVED_SEGMENTS.has(mosqueSlug) && !mosqueSlug.includes(".")) return mosqueSlug;
  }
  const first = parts[0];
  if (RESERVED_SEGMENTS.has(first) || first.includes(".")) return null;
  return first;
}

async function fetchPublicThemeByMosqueSlug(mosqueSlug: string): Promise<PlatformSettings | null> {
  const { data, error } = await supabase.rpc("resolve_mosque_by_slug", {
    p_mosque_slug: mosqueSlug,
  });
  if (error) return null;
  const row = data?.[0];
  if (!row) return null;
  return {
    primary_color: row.primary_color,
    secondary_color: row.secondary_color,
    logo_url: row.logo_url,
    heading_font: row.heading_font,
    body_font: row.body_font,
  };
}

async function fetchMyBranding(): Promise<PlatformSettings | null> {
  const { data, error } = await supabase.rpc("get_my_branding");
  if (error) {
    console.warn("[theme] get_my_branding failed:", error.message);
    return null;
  }
  const row = data?.[0];
  if (!row) return null;
  return {
    primary_color: row.primary_color,
    secondary_color: row.secondary_color,
    logo_url: row.logo_url,
    heading_font: row.heading_font,
    body_font: row.body_font,
  };
}

export async function resolvePlatformSettings(
  pathname: string,
  mosqueSlugOverride?: string | null,
): Promise<PlatformSettings | null> {
  const mosqueSlug = mosqueSlugOverride?.trim() || getMosqueSlugFromPath(pathname);
  if (mosqueSlug) {
    return fetchPublicThemeByMosqueSlug(mosqueSlug);
  }

  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    return fetchMyBranding();
  }

  const { data, error } = await supabase.rpc("get_platform_branding");
  if (error) {
    console.warn("[theme] get_platform_branding failed:", error.message);
    return null;
  }
  const row = data?.[0];
  if (!row) return null;
  return {
    primary_color: row.primary_color,
    secondary_color: row.secondary_color,
    logo_url: row.logo_url,
    heading_font: row.heading_font,
    body_font: row.body_font,
  };
}

export function usePlatformThemeGate(mosqueSlug?: string | null) {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    const pathname = typeof window === "undefined" ? "/" : window.location.pathname;
    resolvePlatformSettings(pathname, mosqueSlug)
      .then((data) => {
        if (!active) return;
        if (data) {
          setSettings(data);
          applyPlatformSettings(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [mosqueSlug]);

  return { settings, ready };
}

export function usePlatformTheme() {
  return usePlatformThemeGate().settings;
}
