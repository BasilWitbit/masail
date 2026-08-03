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

export function usePlatformTheme() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("platform_settings")
      .select("primary_color, secondary_color, logo_url, heading_font, body_font")
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        setSettings(data as PlatformSettings);
        applyPlatformSettings(data as PlatformSettings);
      });
    return () => {
      active = false;
    };
  }, []);

  return settings;
}
