DROP POLICY IF EXISTS platform_settings_read ON public.platform_settings;
CREATE POLICY platform_settings_read ON public.platform_settings FOR SELECT USING (true);
GRANT SELECT ON public.platform_settings TO anon;
GRANT SELECT ON public.mosques TO anon;