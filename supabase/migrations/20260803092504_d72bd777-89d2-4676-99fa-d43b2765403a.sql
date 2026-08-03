ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS heading_font text NOT NULL DEFAULT 'Montserrat',
  ADD COLUMN IF NOT EXISTS body_font text NOT NULL DEFAULT 'Source Sans 3';