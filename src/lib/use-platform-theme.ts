import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlatformSettings = {
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
};

export function usePlatformTheme() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("platform_settings")
      .select("primary_color, secondary_color, logo_url")
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        setSettings(data as PlatformSettings);
        const root = document.documentElement;
        if (data.primary_color) {
          root.style.setProperty("--primary", data.primary_color);
          root.style.setProperty("--ring", data.primary_color);
        }
        if (data.secondary_color) {
          root.style.setProperty("--secondary", data.secondary_color);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return settings;
}
