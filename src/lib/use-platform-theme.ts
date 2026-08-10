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

const SETTINGS_COLUMNS =
  "primary_color, secondary_color, logo_url, heading_font, body_font";

const RESERVED_SEGMENTS = new Set([
  "qa",
  "login",
  "signup",
  "verify-otp",
  "dashboard",
  "api",
]);

function getMosqueSlugFromPath(pathname: string): string | null {
  const first = pathname.split("/").filter(Boolean)[0];
  if (!first) return null;
  if (RESERVED_SEGMENTS.has(first)) return null;
  if (first.includes(".")) return null;
  return first;
}

async function fetchSettingsForMosque(mosqueId: string) {
  const { data } = await supabase
    .from("platform_settings")
    .select(SETTINGS_COLUMNS)
    .eq("mosque_id", mosqueId)
    .maybeSingle();
  return (data as PlatformSettings | null) ?? null;
}

async function fetchGlobalSettings() {
  const { data } = await supabase
    .from("platform_settings")
    .select(SETTINGS_COLUMNS)
    .is("mosque_id", null)
    .maybeSingle();
  return (data as PlatformSettings | null) ?? null;
}

export async function resolvePlatformSettings(
  pathname: string,
): Promise<PlatformSettings | null> {
  // 1. Mosque-slug scoped route
  const slug = getMosqueSlugFromPath(pathname);
  if (slug) {
    const { data: mosque } = await supabase
      .from("mosques")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (mosque?.id) {
      const settings = await fetchSettingsForMosque(mosque.id);
      if (settings) return settings;
    }
    return fetchGlobalSettings();
  }

  // 2. Logged-in user
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, mosque_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && profile.role !== "super_admin") {
      let mosqueId: string | null = profile.mosque_id ?? null;
      if (profile.role === "shaykh") {
        const { data: shaykh } = await supabase
          .from("shaykhs")
          .select("mosque_id")
          .eq("profile_id", user.id)
          .maybeSingle();
        mosqueId = shaykh?.mosque_id ?? mosqueId;
      }
      if (mosqueId) {
        const settings = await fetchSettingsForMosque(mosqueId);
        if (settings) return settings;
      }
    }
  }

  // 3. Guest / super admin / fallback
  return fetchGlobalSettings();
}

export function usePlatformTheme() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    let active = true;
    const pathname = typeof window === "undefined" ? "/" : window.location.pathname;
    resolvePlatformSettings(pathname).then((data) => {
      if (!active || !data) return;
      setSettings(data);
      applyPlatformSettings(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return settings;
}

