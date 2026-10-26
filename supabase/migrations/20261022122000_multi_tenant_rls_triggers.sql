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
