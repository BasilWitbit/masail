-- Mosque-only public resolve + lightweight SSA activity log

CREATE OR REPLACE FUNCTION public.resolve_mosque_by_slug(p_mosque_slug text)
RETURNS TABLE (
  mosque_id uuid,
  mosque_name text,
  mosque_slug text,
  tenant_id uuid,
  tenant_slug text,
  tenant_name text,
  primary_color text,
  secondary_color text,
  logo_url text,
  heading_font text,
  body_font text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.name,
    m.slug,
    t.id,
    t.slug,
    t.name,
    coalesce(ps.primary_color, t.primary_color),
    coalesce(ps.secondary_color, t.secondary_color),
    coalesce(ps.logo_url, t.logo_url),
    coalesce(ps.heading_font, t.heading_font),
    coalesce(ps.body_font, t.body_font)
  FROM public.mosques m
  JOIN public.tenants t ON t.id = m.tenant_id
  LEFT JOIN public.platform_settings ps ON ps.mosque_id = m.id
  WHERE m.slug = p_mosque_slug
    AND t.is_active = true
  ORDER BY m.created_at ASC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_mosque_by_slug(text) TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles (id),
  action text NOT NULL,
  target_table text,
  target_id uuid,
  tenant_id uuid REFERENCES public.tenants (id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs (created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_logs_ssa_all ON public.activity_logs;
CREATE POLICY activity_logs_ssa_all ON public.activity_logs
  FOR ALL TO authenticated
  USING (public.is_ssa())
  WITH CHECK (public.is_ssa());

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
