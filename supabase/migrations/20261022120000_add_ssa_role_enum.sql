-- Must be committed in its own transaction before any statement uses the new value.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_super_admin';
