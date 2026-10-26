-- ============================================================
-- MASAIL multi-tenant cutover — run in Supabase SQL Editor
-- Project: yunvtjlyfzkwadzncrkn
-- IMPORTANT: Run PART 1 alone, wait for success, then PART 2, then PART 3.
-- (Enum must commit before later statements use super_super_admin.)
-- ============================================================

-- >>> PART 1 — run this block alone, then stop <<<
-- Must be committed in its own transaction before any statement uses the new value.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_super_admin';


-- >>> PART 2 — run only after PART 1 succeeded <<<
-- Multi-tenant cutover: SSA â†’ tenants â†’ SA â†’ mosques
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
-- Rule: prefer mosque_admin.profiles.mosque_id ownership â†’ that admin's SA tenant;
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
    -- "closest" â€” we cannot know historical ownership. Documented fallback:
    -- leave for second pass using mosque_admin â†’ we attach mosque to the
    -- first SA tenant that has a mosque_admin on that mosque after profiles get tenant_id.
    -- Practical rule for multi-SA without ownership column: round-robin by created_at
    -- is wrong. Prefer: mosques with any mosque_admin stay unassigned until we set
    -- mosque_admin tenant from... they don't have tenant yet.
    -- Final rule: all unassigned mosques â†’ earliest tenant; NOTICE for ops review.
    UPDATE public.mosques SET tenant_id = v_default_tenant WHERE tenant_id IS NULL;
    RAISE NOTICE 'Multiple super_admins found (%). All mosques without tenant_id assigned to earliest tenant %. Review SSA â†’ Mosques if needed.',
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

-- Categories: copy former-global rows into each tenant (per-tenant libraries)
DO $$
DECLARE
  t record;
  c record;
  v_new uuid;
  v_first_tenant uuid;
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

  -- Snapshot orphan (global) categories
  CREATE TEMP TABLE _cat_global ON COMMIT DROP AS
  SELECT id, name, created_at FROM public.categories WHERE tenant_id IS NULL;

  IF NOT EXISTS (SELECT 1 FROM _cat_global) THEN
    -- Nothing global; ensure every category has a tenant
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

-- Platform default branding for public (non-mosque) pages â€” replaces anon table SELECT
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


-- >>> PART 3 — run only after PART 2 succeeded <<<
-- RLS rewrite, protect triggers, signup hook, storage paths (tenant-scoped).

-- ---------------------------------------------------------------------------
-- 1. Sync / protect triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_mosque_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.tenant_id IS NULL THEN
    IF public.is_ssa() THEN
      RAISE EXCEPTION 'tenant_id is required when creating a mosque';
    END IF;
    NEW.tenant_id := public.my_tenant_id();
  ELSIF NOT public.is_ssa()
        AND NEW.tenant_id IS DISTINCT FROM public.my_tenant_id() THEN
    RAISE EXCEPTION 'Cannot assign mosque to another tenant';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_mosque_tenant_id ON public.mosques;
CREATE TRIGGER trg_set_mosque_tenant_id
  BEFORE INSERT ON public.mosques
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_mosque_tenant_id();

CREATE OR REPLACE FUNCTION public.sync_profile_tenant_from_mosque()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.mosque_id IS NOT NULL THEN
    SELECT m.tenant_id INTO NEW.tenant_id
    FROM public.mosques m
    WHERE m.id = NEW.mosque_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_tenant_from_mosque ON public.profiles;
CREATE TRIGGER trg_sync_profile_tenant_from_mosque
  BEFORE INSERT OR UPDATE OF mosque_id ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_profile_tenant_from_mosque();

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role public.user_role;
BEGIN
  IF tg_op = 'INSERT' THEN
    IF auth.role() = 'authenticated'
       AND new.role is distinct from 'user'::public.user_role then
      raise exception 'Not allowed to create this profile role';
    end if;
    -- Clients must not set tenant_id / privileged fields on insert
    IF auth.role() = 'authenticated' THEN
      IF new.tenant_id IS NOT NULL AND new.role = 'user'::public.user_role THEN
        -- Allow tenant_id only when derived from mosque_id (trigger); strip client spoof
        IF new.mosque_id IS NULL THEN
          new.tenant_id := null;
        END IF;
      END IF;
      IF new.role IN (
        'super_admin'::public.user_role,
        'super_super_admin'::public.user_role,
        'mosque_admin'::public.user_role,
        'shaykh'::public.user_role
      ) THEN
        raise exception 'Not allowed to create this profile role';
      END IF;
    END IF;
    return new;
  END IF;

  IF auth.role() = 'service_role' THEN
    RETURN new;
  END IF;

  actor_role := public.get_my_role();

  IF new.tenant_id IS DISTINCT FROM old.tenant_id
     AND NOT public.is_ssa() THEN
    RAISE EXCEPTION 'Not allowed to change tenant';
  END IF;

  IF new.role IS DISTINCT FROM old.role THEN
    IF public.is_ssa() AND new.role IN (
      'super_admin'::public.user_role,
      'super_super_admin'::public.user_role
    ) THEN
      NULL;
    ELSIF actor_role IS DISTINCT FROM 'super_admin'::public.user_role THEN
      RAISE EXCEPTION 'Not allowed to change role';
    ELSIF new.role = 'super_super_admin'::public.user_role THEN
      RAISE EXCEPTION 'Not allowed to create SSA via client';
    END IF;
  END IF;

  IF new.mosque_id IS DISTINCT FROM old.mosque_id
     AND actor_role IS DISTINCT FROM 'super_admin'::public.user_role
     AND NOT public.is_ssa() THEN
    RAISE EXCEPTION 'Not allowed to change mosque';
  END IF;

  IF new.approval_status IS DISTINCT FROM old.approval_status THEN
    IF actor_role IN ('mosque_admin'::public.user_role, 'super_admin'::public.user_role)
       OR public.is_ssa() THEN
      NULL;
    ELSIF auth.uid() = old.id
          AND new.approval_status = 'pending_approval'::public.approval_status THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Not allowed to change approval status';
    END IF;
  END IF;

  IF new.must_change_password IS DISTINCT FROM old.must_change_password THEN
    IF new.must_change_password = false AND auth.uid() = old.id THEN
      NULL;
    ELSIF actor_role = 'super_admin'::public.user_role OR public.is_ssa() THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Not allowed to change password flag';
    END IF;
  END IF;

  IF actor_role IN ('user'::public.user_role, 'shaykh'::public.user_role)
     AND auth.uid() IS DISTINCT FROM old.id THEN
    RAISE EXCEPTION 'Not allowed to update this profile';
  END IF;

  IF actor_role = 'mosque_admin'::public.user_role
     AND auth.uid() IS DISTINCT FROM old.id THEN
    IF new.full_name IS DISTINCT FROM old.full_name
       OR new.email IS DISTINCT FROM old.email
       OR new.phone IS DISTINCT FROM old.phone
       OR new.avatar_url IS DISTINCT FROM old.avatar_url
       OR new.must_change_password IS DISTINCT FROM old.must_change_password THEN
      RAISE EXCEPTION 'Mosque admins may only change member approval status';
    END IF;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.protect_profile_privileges();

CREATE OR REPLACE FUNCTION public.protect_question_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN new;
  END IF;

  IF NOT public.my_tenant_is_active() AND NOT public.is_ssa() THEN
    RAISE EXCEPTION 'This service is temporarily unavailable.';
  END IF;

  IF tg_op = 'INSERT' THEN
    IF new.tenant_id IS NULL THEN
      SELECT tenant_id INTO new.tenant_id FROM public.mosques WHERE id = new.mosque_id;
    END IF;
    IF auth.role() = 'authenticated'
       AND new.asker_id IS DISTINCT FROM auth.uid()
       AND public.get_my_role() IS DISTINCT FROM 'super_admin'::public.user_role
       AND NOT public.is_ssa() THEN
      RAISE EXCEPTION 'Cannot ask as another user';
    END IF;
    IF new.tenant_id IS DISTINCT FROM public.my_tenant_id()
       AND NOT public.is_ssa() THEN
      RAISE EXCEPTION 'Cannot create question in another tenant';
    END IF;
    RETURN new;
  END IF;

  IF new.asker_id IS DISTINCT FROM old.asker_id THEN
    RAISE EXCEPTION 'Cannot change question asker';
  END IF;

  IF new.mosque_id IS DISTINCT FROM old.mosque_id
     AND public.get_my_role() IS DISTINCT FROM 'super_admin'::public.user_role
     AND NOT public.is_ssa() THEN
    RAISE EXCEPTION 'Cannot change question mosque';
  END IF;

  IF new.tenant_id IS DISTINCT FROM old.tenant_id AND NOT public.is_ssa() THEN
    RAISE EXCEPTION 'Cannot change question tenant';
  END IF;

  IF public.get_my_role() = 'user'::public.user_role THEN
    RAISE EXCEPTION 'Users cannot update questions';
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS protect_question_invariants ON public.questions;
CREATE TRIGGER protect_question_invariants
  BEFORE INSERT OR UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE PROCEDURE public.protect_question_invariants();

CREATE OR REPLACE FUNCTION public.protect_answer_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN new;
  END IF;

  IF NOT public.my_tenant_is_active() AND NOT public.is_ssa() THEN
    RAISE EXCEPTION 'This service is temporarily unavailable.';
  END IF;

  IF tg_op = 'INSERT' THEN
    SELECT coalesce(q.tenant_id, s.tenant_id) INTO new.tenant_id
    FROM public.questions q, public.shaykhs s
    WHERE q.id = new.question_id AND s.id = new.shaykh_id;
  END IF;

  IF tg_op = 'UPDATE' THEN
    IF new.shaykh_id IS DISTINCT FROM old.shaykh_id
       OR new.question_id IS DISTINCT FROM old.question_id THEN
      RAISE EXCEPTION 'Cannot reassign an answer';
    END IF;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS protect_answer_invariants ON public.answers;
CREATE TRIGGER protect_answer_invariants
  BEFORE INSERT OR UPDATE ON public.answers
  FOR EACH ROW
  EXECUTE PROCEDURE public.protect_answer_invariants();

CREATE OR REPLACE FUNCTION public.protect_notification_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN new;
  END IF;

  IF tg_op = 'UPDATE' THEN
    IF new.user_id IS DISTINCT FROM old.user_id THEN
      RAISE EXCEPTION 'Cannot reassign a notification';
    END IF;
    IF auth.uid() IS DISTINCT FROM old.user_id
       AND public.get_my_role() IS DISTINCT FROM 'super_admin'::public.user_role
       AND NOT public.is_ssa() THEN
      RAISE EXCEPTION 'Not allowed to update this notification';
    END IF;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS protect_notification_owner ON public.notifications;
CREATE TRIGGER protect_notification_owner
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE PROCEDURE public.protect_notification_owner();

-- Signup: never trust role / privileged fields from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mosque uuid;
  v_tenant uuid;
  v_name text;
BEGIN
  v_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
  BEGIN
    v_mosque := nullif(new.raw_user_meta_data->>'mosque_id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_mosque := null;
  END;

  IF v_mosque IS NOT NULL THEN
    SELECT m.tenant_id INTO v_tenant
    FROM public.mosques m
    JOIN public.tenants t ON t.id = m.tenant_id
    WHERE m.id = v_mosque
      AND t.is_active = true;
    IF v_tenant IS NULL THEN
      v_mosque := null;
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, mosque_id, tenant_id, role, approval_status, must_change_password
  ) VALUES (
    new.id,
    new.email,
    v_name,
    v_mosque,
    v_tenant,
    'user'::public.user_role,
    CASE WHEN v_mosque IS NULL THEN 'approved'::public.approval_status
         ELSE 'pending_approval'::public.approval_status END,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    mosque_id = coalesce(public.profiles.mosque_id, excluded.mosque_id),
    tenant_id = coalesce(public.profiles.tenant_id, excluded.tenant_id);

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_row_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.my_tenant_id();
  END IF;
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required';
  END IF;
  IF NOT public.is_ssa()
     AND NEW.tenant_id IS DISTINCT FROM public.my_tenant_id() THEN
    RAISE EXCEPTION 'Cannot write to another tenant';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_category_tenant_id ON public.categories;
CREATE TRIGGER trg_set_category_tenant_id
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_row_tenant_id();

DROP TRIGGER IF EXISTS trg_set_shaykh_tenant_id ON public.shaykhs;
CREATE TRIGGER trg_set_shaykh_tenant_id
  BEFORE INSERT ON public.shaykhs
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_row_tenant_id();

-- ---------------------------------------------------------------------------
-- 2. RLS: drop all + recreate tenant-scoped
-- ---------------------------------------------------------------------------
SELECT public._drop_all_policies('public', 'tenants');
SELECT public._drop_all_policies('public', 'profiles');
SELECT public._drop_all_policies('public', 'mosques');
SELECT public._drop_all_policies('public', 'shaykhs');
SELECT public._drop_all_policies('public', 'questions');
SELECT public._drop_all_policies('public', 'answers');
SELECT public._drop_all_policies('public', 'peer_reviews');
SELECT public._drop_all_policies('public', 'reports');
SELECT public._drop_all_policies('public', 'feedback');
SELECT public._drop_all_policies('public', 'notifications');
SELECT public._drop_all_policies('public', 'published_qa');
SELECT public._drop_all_policies('public', 'categories');
SELECT public._drop_all_policies('public', 'platform_settings');

-- tenants
CREATE POLICY tenants_ssa_all ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_ssa())
  WITH CHECK (public.is_ssa());

CREATE POLICY tenants_sa_select ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_super_admin() AND id = public.my_tenant_id());

CREATE POLICY tenants_sa_update ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.is_super_admin() AND id = public.my_tenant_id() AND is_active)
  WITH CHECK (public.is_super_admin() AND id = public.my_tenant_id());

GRANT SELECT, INSERT, UPDATE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

-- profiles
CREATE POLICY profiles_self_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_ssa()
    OR (
      public.my_tenant_is_active()
      AND tenant_id = public.my_tenant_id()
      AND public.get_my_role() IN (
        'super_admin'::public.user_role,
        'mosque_admin'::public.user_role
      )
    )
  );

CREATE POLICY profiles_self_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND role = 'user'::public.user_role);

CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR public.is_ssa()
    OR (
      public.is_super_admin()
      AND tenant_id = public.my_tenant_id()
    )
    OR (
      public.get_my_role() = 'mosque_admin'::public.user_role
      AND public.my_tenant_is_active()
      AND tenant_id = public.my_tenant_id()
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR public.is_ssa()
    OR (
      public.is_super_admin()
      AND tenant_id = public.my_tenant_id()
    )
    OR (
      public.get_my_role() = 'mosque_admin'::public.user_role
      AND tenant_id = public.my_tenant_id()
    )
  );

CREATE POLICY profiles_sa_delete ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_super_admin() AND tenant_id = public.my_tenant_id());

-- mosques: no blanket anon SELECT; use resolve_mosque_by_slugs / list_active_signup_mosques
REVOKE ALL ON public.mosques FROM anon;
CREATE POLICY mosques_member_select ON public.mosques
  FOR SELECT TO authenticated
  USING (
    public.is_ssa()
    OR (
      public.my_tenant_is_active()
      AND tenant_id = public.my_tenant_id()
    )
  );

CREATE POLICY mosques_sa_all ON public.mosques
  FOR ALL TO authenticated
  USING (public.is_super_admin() AND tenant_id = public.my_tenant_id())
  WITH CHECK (public.is_super_admin() AND tenant_id = public.my_tenant_id());

-- shaykhs
CREATE POLICY shaykhs_tenant_select ON public.shaykhs
  FOR SELECT TO authenticated
  USING (
    public.is_ssa()
    OR (
      public.my_tenant_is_active()
      AND tenant_id = public.my_tenant_id()
    )
    OR profile_id = auth.uid()
  );

CREATE POLICY shaykhs_staff_write ON public.shaykhs
  FOR ALL TO authenticated
  USING (
    public.is_super_admin() AND tenant_id = public.my_tenant_id()
    OR (
      public.get_my_role() = 'mosque_admin'::public.user_role
      AND public.my_tenant_is_active()
      AND tenant_id = public.my_tenant_id()
    )
  )
  WITH CHECK (
    public.is_super_admin() AND tenant_id = public.my_tenant_id()
    OR (
      public.get_my_role() = 'mosque_admin'::public.user_role
      AND tenant_id = public.my_tenant_id()
    )
  );

-- questions
CREATE POLICY questions_tenant_select ON public.questions
  FOR SELECT TO authenticated
  USING (
    public.is_ssa()
    OR (
      public.my_tenant_is_active()
      AND tenant_id = public.my_tenant_id()
      AND (
        asker_id = auth.uid()
        OR public.get_my_role() IN (
          'super_admin'::public.user_role,
          'mosque_admin'::public.user_role,
          'shaykh'::public.user_role
        )
      )
    )
  );

CREATE POLICY questions_insert ON public.questions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.my_tenant_is_active()
    AND tenant_id = public.my_tenant_id()
    AND asker_id = auth.uid()
  );

CREATE POLICY questions_staff_update ON public.questions
  FOR UPDATE TO authenticated
  USING (
    public.my_tenant_is_active()
    AND tenant_id = public.my_tenant_id()
    AND public.get_my_role() IN (
      'super_admin'::public.user_role,
      'mosque_admin'::public.user_role,
      'shaykh'::public.user_role
    )
  )
  WITH CHECK (tenant_id = public.my_tenant_id());

-- answers / peer_reviews / reports / feedback / notifications
CREATE POLICY answers_tenant_select ON public.answers
  FOR SELECT TO authenticated
  USING (
    public.is_ssa()
    OR (
      public.my_tenant_is_active()
      AND (
        tenant_id = public.my_tenant_id()
        OR EXISTS (
          SELECT 1 FROM public.questions q
          WHERE q.id = answers.question_id
            AND (q.asker_id = auth.uid() OR q.tenant_id = public.my_tenant_id())
        )
      )
    )
  );

CREATE POLICY answers_shaykh_write ON public.answers
  FOR ALL TO authenticated
  USING (
    public.my_tenant_is_active()
    AND (
      tenant_id = public.my_tenant_id()
      OR tenant_id IS NULL
    )
    AND public.get_my_role() IN (
      'shaykh'::public.user_role,
      'super_admin'::public.user_role
    )
  )
  WITH CHECK (public.my_tenant_is_active());

CREATE POLICY peer_reviews_tenant ON public.peer_reviews
  FOR ALL TO authenticated
  USING (
    public.is_ssa()
    OR (
      public.my_tenant_is_active()
      AND (
        tenant_id = public.my_tenant_id()
        OR EXISTS (
          SELECT 1 FROM public.answers a
          WHERE a.id = peer_reviews.answer_id AND a.tenant_id = public.my_tenant_id()
        )
      )
    )
  )
  WITH CHECK (public.my_tenant_is_active());

CREATE POLICY reports_tenant ON public.reports
  FOR ALL TO authenticated
  USING (
    public.is_ssa()
    OR (
      public.my_tenant_is_active()
      AND (
        tenant_id = public.my_tenant_id()
        OR EXISTS (
          SELECT 1 FROM public.questions q
          WHERE q.id = reports.question_id AND q.tenant_id = public.my_tenant_id()
        )
      )
    )
  )
  WITH CHECK (public.my_tenant_is_active());

CREATE POLICY feedback_tenant ON public.feedback
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_ssa()
    OR (
      public.my_tenant_is_active()
      AND tenant_id = public.my_tenant_id()
    )
  )
  WITH CHECK (user_id = auth.uid() AND public.my_tenant_is_active());

CREATE POLICY notifications_own ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_ssa()
    OR (public.is_super_admin() AND tenant_id = public.my_tenant_id())
  );

CREATE POLICY notifications_own_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_ssa())
  WITH CHECK (user_id = auth.uid() OR public.is_ssa());

CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- published_qa + categories: tenant-scoped (no cross-tenant public dump)
CREATE POLICY published_qa_tenant_select ON public.published_qa
  FOR SELECT TO authenticated
  USING (
    public.is_ssa()
    OR (
      public.my_tenant_is_active()
      AND tenant_id = public.my_tenant_id()
    )
  );

CREATE POLICY published_qa_staff_write ON public.published_qa
  FOR ALL TO authenticated
  USING (
    public.my_tenant_is_active()
    AND tenant_id = public.my_tenant_id()
    AND public.get_my_role() IN (
      'shaykh'::public.user_role,
      'super_admin'::public.user_role,
      'mosque_admin'::public.user_role
    )
  )
  WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY categories_tenant_select ON public.categories
  FOR SELECT TO authenticated
  USING (
    public.is_ssa()
    OR (
      public.my_tenant_is_active()
      AND tenant_id = public.my_tenant_id()
    )
  );

CREATE POLICY categories_sa_write ON public.categories
  FOR ALL TO authenticated
  USING (public.is_super_admin() AND tenant_id = public.my_tenant_id())
  WITH CHECK (public.is_super_admin() AND tenant_id = public.my_tenant_id());

-- platform_settings: revoke anon blanket read
REVOKE ALL ON public.platform_settings FROM anon;
CREATE POLICY platform_settings_auth_read ON public.platform_settings
  FOR SELECT TO authenticated
  USING (
    public.is_ssa()
    OR (mosque_id IS NULL AND tenant_id IS NULL)
    OR (
      public.my_tenant_is_active()
      AND (
        tenant_id = public.my_tenant_id()
        OR mosque_id = public.get_my_effective_mosque_id()
      )
    )
  );

CREATE POLICY platform_settings_ssa_write ON public.platform_settings
  FOR ALL TO authenticated
  USING (
    public.is_ssa()
    OR (
      public.is_super_admin()
      AND (
        (mosque_id IS NULL AND tenant_id IS NULL)
        OR tenant_id = public.my_tenant_id()
        OR EXISTS (
          SELECT 1 FROM public.mosques m
          WHERE m.id = platform_settings.mosque_id
            AND m.tenant_id = public.my_tenant_id()
        )
      )
    )
    OR (
      public.get_my_role() = 'mosque_admin'::public.user_role
      AND public.my_tenant_is_active()
      AND mosque_id = public.get_my_mosque_id()
    )
  )
  WITH CHECK (
    public.is_ssa()
    OR public.is_super_admin()
    OR public.get_my_role() = 'mosque_admin'::public.user_role
  );

-- ---------------------------------------------------------------------------
-- 3. Storage policies (branding / avatars / question-attachments)
-- ---------------------------------------------------------------------------
SELECT public._drop_all_policies('storage', 'objects');

CREATE POLICY branding_select ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket_id = 'branding');

CREATE POLICY branding_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'branding'
    AND (
      public.is_ssa()
      OR public.is_super_admin()
      OR public.get_my_role() = 'mosque_admin'::public.user_role
    )
  );

CREATE POLICY branding_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'branding'
    AND (public.is_ssa() OR public.is_super_admin() OR public.get_my_role() = 'mosque_admin'::public.user_role)
  );

CREATE POLICY branding_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'branding'
    AND (public.is_ssa() OR public.is_super_admin() OR public.get_my_role() = 'mosque_admin'::public.user_role)
  );

CREATE POLICY avatars_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY avatars_own_write ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY question_attachments_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'question-attachments' AND public.my_tenant_is_active());

CREATE POLICY question_attachments_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'question-attachments'
    AND public.my_tenant_is_active()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP FUNCTION IF EXISTS public._drop_all_policies(text, text);

