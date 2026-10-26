-- Multi-tenant cutover: SSA → tenants → SA → mosques
-- Adapts Marriage DB tenants model to Masail (QA) tables + tenant/mosque slugs.

-- ---------------------------------------------------------------------------
-- Helpers: drop all policies on a table
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._drop_all_policies(p_schema text, p_table text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = p_schema AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, p_schema, p_table);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. tenants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#1B4F72',
  secondary_color text NOT NULL DEFAULT '#2E86C1',
  heading_font text NOT NULL DEFAULT 'Montserrat',
  body_font text NOT NULL DEFAULT 'Source Sans 3',
  is_active boolean NOT NULL DEFAULT true,
  deactivated_at timestamptz,
  deactivated_by uuid REFERENCES public.profiles (id),
  created_by uuid REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenants_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS tenants_is_active_idx ON public.tenants (is_active);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. tenant_id columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.mosques ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.shaykhs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.published_qa ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.peer_reviews ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id);

-- ---------------------------------------------------------------------------
-- 3. Backfill: one tenant per existing super_admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._slugify_tenant(p_base text, p_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  base := lower(regexp_replace(coalesce(p_base, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  base := trim(both '-' from base);
  IF base = '' THEN
    base := 'tenant';
  END IF;
  base := left(base, 48);
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = candidate) LOOP
    n := n + 1;
    candidate := left(base, greatest(1, 48 - length('-' || n::text))) || '-' || n::text;
  END LOOP;
  RETURN candidate;
END;
$$;

DO $$
DECLARE
  r record;
  v_tenant uuid;
  v_slug text;
  v_name text;
  v_ps record;
  v_sa_count int;
BEGIN
  FOR r IN
    SELECT id, full_name, email, created_at
    FROM public.profiles
    WHERE role = 'super_admin'::public.user_role
    ORDER BY created_at ASC NULLS LAST, id ASC
  LOOP
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = r.id AND tenant_id IS NOT NULL) THEN
      CONTINUE;
    END IF;

    v_name := coalesce(nullif(trim(r.full_name), ''), split_part(coalesce(r.email, 'tenant'), '@', 1), 'Tenant');
    v_slug := public._slugify_tenant(v_name, r.id);

    SELECT primary_color, secondary_color, logo_url, heading_font, body_font
      INTO v_ps
    FROM public.platform_settings
    WHERE mosque_id IS NULL
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;

    INSERT INTO public.tenants (
      slug, name, logo_url, primary_color, secondary_color, heading_font, body_font,
      is_active, created_by
    ) VALUES (
      v_slug,
      v_name,
      v_ps.logo_url,
      coalesce(v_ps.primary_color, '#1B4F72'),
      coalesce(v_ps.secondary_color, '#2E86C1'),
      coalesce(v_ps.heading_font, 'Montserrat'),
      coalesce(v_ps.body_font, 'Source Sans 3'),
      true,
      r.id
    )
    RETURNING id INTO v_tenant;

    UPDATE public.profiles SET tenant_id = v_tenant WHERE id = r.id;
  END LOOP;

  -- Orphan mosques with no SA: create a legacy tenant so NOT NULL succeeds
  SELECT count(*) INTO v_sa_count FROM public.tenants;
  IF v_sa_count = 0 AND EXISTS (SELECT 1 FROM public.mosques) THEN
    SELECT primary_color, secondary_color, logo_url, heading_font, body_font
      INTO v_ps
    FROM public.platform_settings
    WHERE mosque_id IS NULL
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;

    INSERT INTO public.tenants (
      slug, name, logo_url, primary_color, secondary_color, heading_font, body_font, is_active
    ) VALUES (
      public._slugify_tenant('legacy', gen_random_uuid()),
      'Legacy',
      v_ps.logo_url,
      coalesce(v_ps.primary_color, '#1B4F72'),
      coalesce(v_ps.secondary_color, '#2E86C1'),
      coalesce(v_ps.heading_font, 'Montserrat'),
      coalesce(v_ps.body_font, 'Source Sans 3'),
      true
    );
    RAISE NOTICE 'No super_admin found; created Legacy tenant for existing mosques';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Assign mosques to tenants
-- Rule: prefer mosque_admin.profiles.mosque_id ownership → that admin's SA tenant;
--       else if exactly one SA tenant exists, assign all remaining;
--       else assign remaining to earliest SA tenant and raise notice.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_default_tenant uuid;
  v_sa_count int;
BEGIN
  SELECT count(*) INTO v_sa_count FROM public.tenants;
  SELECT id INTO v_default_tenant FROM public.tenants ORDER BY created_at ASC LIMIT 1;

  -- Mosques currently administered by a mosque_admin whose SA we can resolve
  -- (mosque_admin.tenant_id may still be null; resolve SA via... we only have SA tenants so far)
  -- First: if only one tenant, assign everything to it.
  IF v_sa_count = 1 AND v_default_tenant IS NOT NULL THEN
    UPDATE public.mosques SET tenant_id = v_default_tenant WHERE tenant_id IS NULL;
  ELSIF v_sa_count > 1 THEN
    -- Assign mosques linked from mosque_admin profiles: pick SA tenant that is
    -- "closest" — we cannot know historical ownership. Documented fallback:
    -- leave for second pass using mosque_admin → we attach mosque to the
    -- first SA tenant that has a mosque_admin on that mosque after profiles get tenant_id.
    -- Practical rule for multi-SA without ownership column: round-robin by created_at
    -- is wrong. Prefer: mosques with any mosque_admin stay unassigned until we set
    -- mosque_admin tenant from... they don't have tenant yet.
    -- Final rule: all unassigned mosques → earliest tenant; NOTICE for ops review.
    UPDATE public.mosques SET tenant_id = v_default_tenant WHERE tenant_id IS NULL;
    RAISE NOTICE 'Multiple super_admins found (%). All mosques without tenant_id assigned to earliest tenant %. Review SSA → Mosques if needed.',
      v_sa_count, v_default_tenant;
  END IF;
END $$;

-- Members / staff via mosque
UPDATE public.profiles p
SET tenant_id = m.tenant_id
FROM public.mosques m
WHERE p.mosque_id = m.id
  AND p.tenant_id IS NULL
  AND m.tenant_id IS NOT NULL;

-- Shaykhs: table + profile (profiles.mosque_id often null)
UPDATE public.shaykhs s
SET tenant_id = m.tenant_id
FROM public.mosques m
WHERE s.mosque_id = m.id
  AND s.tenant_id IS NULL
  AND m.tenant_id IS NOT NULL;

UPDATE public.profiles p
SET tenant_id = s.tenant_id
FROM public.shaykhs s
WHERE s.profile_id = p.id
  AND p.tenant_id IS NULL
  AND s.tenant_id IS NOT NULL;

UPDATE public.questions q
SET tenant_id = m.tenant_id
FROM public.mosques m
WHERE q.mosque_id = m.id AND q.tenant_id IS NULL AND m.tenant_id IS NOT NULL;

UPDATE public.published_qa pq
SET tenant_id = m.tenant_id
FROM public.mosques m
WHERE pq.mosque_id = m.id AND pq.tenant_id IS NULL AND m.tenant_id IS NOT NULL;

UPDATE public.published_qa pq
SET tenant_id = s.tenant_id
FROM public.shaykhs s
WHERE pq.published_by_shaykh_id = s.id AND pq.tenant_id IS NULL AND s.tenant_id IS NOT NULL;

UPDATE public.answers a
SET tenant_id = coalesce(q.tenant_id, s.tenant_id)
FROM public.questions q, public.shaykhs s
WHERE a.question_id = q.id AND a.shaykh_id = s.id AND a.tenant_id IS NULL;

UPDATE public.peer_reviews pr
SET tenant_id = a.tenant_id
FROM public.answers a
WHERE pr.answer_id = a.id AND pr.tenant_id IS NULL AND a.tenant_id IS NOT NULL;

UPDATE public.reports r
SET tenant_id = q.tenant_id
FROM public.questions q
WHERE r.question_id = q.id AND r.tenant_id IS NULL AND q.tenant_id IS NOT NULL;

UPDATE public.feedback f
SET tenant_id = q.tenant_id
FROM public.questions q
WHERE f.question_id = q.id AND f.tenant_id IS NULL AND q.tenant_id IS NOT NULL;

UPDATE public.notifications n
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE n.user_id = p.id AND n.tenant_id IS NULL AND p.tenant_id IS NOT NULL;

UPDATE public.platform_settings ps
SET tenant_id = m.tenant_id
FROM public.mosques m
WHERE ps.mosque_id = m.id AND ps.tenant_id IS NULL AND m.tenant_id IS NOT NULL;
-- Global platform_settings (mosque_id null) stay tenant_id null = SSA platform default.

-- Categories were globally unique by name; drop that so each tenant can own the same names.
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;
DROP INDEX IF EXISTS categories_name_key;
DROP INDEX IF EXISTS categories_name_unique;

-- Categories: copy former-global rows into each tenant (per-tenant libraries)
DO $$
DECLARE
  t record;
  c record;
  v_new uuid;
  v_first_tenant uuid;
  v_tenant_count int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants) THEN
    RAISE NOTICE 'No tenants to own categories; skipping category backfill';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.categories WHERE tenant_id IS NOT NULL)
     AND NOT EXISTS (SELECT 1 FROM public.categories WHERE tenant_id IS NULL) THEN
    RETURN;
  END IF;

  SELECT id INTO v_first_tenant FROM public.tenants ORDER BY created_at ASC LIMIT 1;
  SELECT count(*) INTO v_tenant_count FROM public.tenants;

  -- Snapshot orphan (global) categories
  CREATE TEMP TABLE _cat_global ON COMMIT DROP AS
  SELECT id, name, created_at FROM public.categories WHERE tenant_id IS NULL;

  IF NOT EXISTS (SELECT 1 FROM _cat_global) THEN
    UPDATE public.categories SET tenant_id = v_first_tenant WHERE tenant_id IS NULL;
    RETURN;
  END IF;

  -- Single tenant: just stamp tenant_id (no insert/delete race with unique names)
  IF v_tenant_count = 1 THEN
    UPDATE public.categories SET tenant_id = v_first_tenant WHERE tenant_id IS NULL;
    RETURN;
  END IF;

  FOR t IN SELECT id FROM public.tenants ORDER BY created_at ASC LOOP
    FOR c IN SELECT id, name, created_at FROM _cat_global LOOP
      INSERT INTO public.categories (name, created_at, tenant_id)
      VALUES (c.name, c.created_at, t.id)
      RETURNING id INTO v_new;

      UPDATE public.questions
      SET category_id = v_new
      WHERE category_id = c.id AND tenant_id = t.id;

      UPDATE public.published_qa
      SET category_id = v_new
      WHERE category_id = c.id AND tenant_id = t.id;
    END LOOP;
  END LOOP;

  DELETE FROM public.categories c
  WHERE c.tenant_id IS NULL
    AND EXISTS (SELECT 1 FROM _cat_global g WHERE g.id = c.id);
END $$;

-- Enforce NOT NULL where required (mosques must belong to a tenant after backfill)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.mosques WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'Mosque backfill left rows without tenant_id';
  END IF;
END $$;

ALTER TABLE public.mosques ALTER COLUMN tenant_id SET NOT NULL;

DROP INDEX IF EXISTS mosques_slug_unique;
CREATE UNIQUE INDEX IF NOT EXISTS mosques_tenant_slug_unique
  ON public.mosques (tenant_id, slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_tenant_id_idx ON public.profiles (tenant_id);
CREATE INDEX IF NOT EXISTS mosques_tenant_id_idx ON public.mosques (tenant_id);
CREATE INDEX IF NOT EXISTS questions_tenant_id_idx ON public.questions (tenant_id);
CREATE INDEX IF NOT EXISTS categories_tenant_id_idx ON public.categories (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS categories_tenant_name_unique
  ON public.categories (tenant_id, lower(name));
CREATE INDEX IF NOT EXISTS published_qa_tenant_id_idx ON public.published_qa (tenant_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.categories WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'Category backfill left rows without tenant_id';
  END IF;
  IF EXISTS (SELECT 1 FROM public.categories) THEN
    ALTER TABLE public.categories ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public._slugify_tenant(text, uuid);

-- ---------------------------------------------------------------------------
-- 5. Helper functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_ssa()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_super_admin'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.tenant_is_active(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_active FROM public.tenants WHERE id = p_tenant_id), false);
$$;

CREATE OR REPLACE FUNCTION public.my_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.profiles WHERE id = auth.uid();
  IF v_tenant IS NOT NULL THEN
    RETURN v_tenant;
  END IF;

  -- Shaykhs often have profiles.mosque_id null
  SELECT s.tenant_id INTO v_tenant
  FROM public.shaykhs s
  WHERE s.profile_id = auth.uid()
  LIMIT 1;
  IF v_tenant IS NOT NULL THEN
    RETURN v_tenant;
  END IF;

  SELECT m.tenant_id INTO v_tenant
  FROM public.shaykhs s
  JOIN public.mosques m ON m.id = s.mosque_id
  WHERE s.profile_id = auth.uid()
  LIMIT 1;

  RETURN v_tenant;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_tenant_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_ssa() THEN true
    WHEN public.my_tenant_id() IS NULL THEN false
    ELSE public.tenant_is_active(public.my_tenant_id())
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'::public.user_role
      AND tenant_id IS NOT NULL
      AND public.tenant_is_active(tenant_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.mosque_in_my_tenant(p_mosque_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mosques m
    WHERE m.id = p_mosque_id AND m.tenant_id = public.my_tenant_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_mosque_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mosque_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_effective_mosque_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT mosque_id FROM public.profiles WHERE id = auth.uid()),
    (SELECT mosque_id FROM public.shaykhs WHERE profile_id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_branding()
RETURNS TABLE (
  primary_color text,
  secondary_color text,
  logo_url text,
  heading_font text,
  body_font text,
  source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.my_tenant_id();
  v_mosque uuid := public.get_my_effective_mosque_id();
BEGIN
  IF v_mosque IS NOT NULL THEN
    RETURN QUERY
    SELECT ps.primary_color, ps.secondary_color, ps.logo_url, ps.heading_font, ps.body_font, 'mosque'::text
    FROM public.platform_settings ps
    WHERE ps.mosque_id = v_mosque
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  IF v_tenant IS NOT NULL THEN
    RETURN QUERY
    SELECT t.primary_color, t.secondary_color, t.logo_url, t.heading_font, t.body_font, 'tenant'::text
    FROM public.tenants t
    WHERE t.id = v_tenant;
    IF FOUND THEN RETURN; END IF;
  END IF;

  RETURN QUERY
  SELECT ps.primary_color, ps.secondary_color, ps.logo_url, ps.heading_font, ps.body_font, 'platform'::text
  FROM public.platform_settings ps
  WHERE ps.mosque_id IS NULL AND ps.tenant_id IS NULL
  ORDER BY ps.updated_at DESC NULLS LAST
  LIMIT 1;
END;
$$;

-- Narrow public RPC for signup / theme (active tenant + mosque only)
CREATE OR REPLACE FUNCTION public.resolve_mosque_by_slugs(p_tenant_slug text, p_mosque_slug text)
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
  FROM public.tenants t
  JOIN public.mosques m ON m.tenant_id = t.id
  LEFT JOIN public.platform_settings ps ON ps.mosque_id = m.id
  WHERE t.slug = p_tenant_slug
    AND m.slug = p_mosque_slug
    AND t.is_active = true
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_active_signup_mosques()
RETURNS TABLE (
  mosque_id uuid,
  mosque_name text,
  mosque_slug text,
  tenant_id uuid,
  tenant_slug text,
  tenant_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.name, m.slug, t.id, t.slug, t.name
  FROM public.mosques m
  JOIN public.tenants t ON t.id = m.tenant_id
  WHERE t.is_active = true
    AND m.slug IS NOT NULL
  ORDER BY t.name, m.name;
$$;

-- Platform default branding for public (non-mosque) pages — replaces anon table SELECT
CREATE OR REPLACE FUNCTION public.get_platform_branding()
RETURNS TABLE (
  primary_color text,
  secondary_color text,
  logo_url text,
  heading_font text,
  body_font text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ps.primary_color, ps.secondary_color, ps.logo_url, ps.heading_font, ps.body_font
  FROM public.platform_settings ps
  WHERE ps.mosque_id IS NULL AND ps.tenant_id IS NULL
  ORDER BY ps.updated_at DESC NULLS LAST
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.is_ssa() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_is_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_tenant_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_tenant_is_active() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mosque_in_my_tenant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_mosque_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_effective_mosque_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_branding() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_mosque_by_slugs(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_active_signup_mosques() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_branding() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_ssa() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_tenant_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_tenant_is_active() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_is_active(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mosque_in_my_tenant(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_branding() FROM PUBLIC, anon;
