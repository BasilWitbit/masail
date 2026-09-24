-- Ensure every mosque has a unique signup slug, then enforce uniqueness.

-- 1) Resolve duplicate non-null slugs (keep earliest created_at, rename the rest).
WITH ranked AS (
  SELECT
    id,
    slug,
    ROW_NUMBER() OVER (
      PARTITION BY slug
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.mosques
  WHERE slug IS NOT NULL AND btrim(slug) <> ''
)
UPDATE public.mosques m
SET slug = left(ranked.slug, 50) || '-d' || ranked.rn::text
FROM ranked
WHERE m.id = ranked.id
  AND ranked.rn > 1;

-- 2) Backfill missing slugs from mosque name.
DO $$
DECLARE
  r RECORD;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN
    SELECT id, name
    FROM public.mosques
    WHERE slug IS NULL OR btrim(slug) = ''
    ORDER BY created_at ASC NULLS LAST, id ASC
  LOOP
    base := lower(regexp_replace(coalesce(r.name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
    base := trim(both '-' from base);
    IF base = '' THEN
      base := 'mosque';
    END IF;
    base := left(base, 60);

    candidate := base;
    n := 1;
    WHILE EXISTS (
      SELECT 1 FROM public.mosques WHERE slug = candidate AND id <> r.id
    ) LOOP
      n := n + 1;
      candidate := left(base, greatest(1, 60 - length('-' || n::text))) || '-' || n::text;
    END LOOP;

    UPDATE public.mosques SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

-- 3) Unique index so client/backfill races cannot create colliding signup links.
CREATE UNIQUE INDEX IF NOT EXISTS mosques_slug_unique
  ON public.mosques (slug)
  WHERE slug IS NOT NULL;
