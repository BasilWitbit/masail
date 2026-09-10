-- Defense in depth for console/API privilege escalation.
-- Does not drop or replace existing RLS SELECT policies (those stay as-is so current
-- role flows keep working). Triggers only block writes the UI never performs.

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.user_role;
begin
  if tg_op = 'INSERT' then
    -- Edge functions (service_role) and auth DB hooks may create staff profiles.
    -- Authenticated clients may only insert a normal user row.
    if auth.role() = 'authenticated'
       and new.role is distinct from 'user'::public.user_role then
      raise exception 'Not allowed to create this profile role';
    end if;
    return new;
  end if;

  if auth.role() = 'service_role' then
    return new;
  end if;

  actor_role := public.get_my_role();

  if new.role is distinct from old.role
     and actor_role is distinct from 'super_admin'::public.user_role then
    raise exception 'Not allowed to change role';
  end if;

  if new.mosque_id is distinct from old.mosque_id
     and actor_role is distinct from 'super_admin'::public.user_role then
    raise exception 'Not allowed to change mosque';
  end if;

  if new.approval_status is distinct from old.approval_status then
    if actor_role in ('mosque_admin'::public.user_role, 'super_admin'::public.user_role) then
      null;
    elsif auth.uid() = old.id
          and new.approval_status = 'pending_approval'::public.approval_status then
      null;
    else
      raise exception 'Not allowed to change approval status';
    end if;
  end if;

  if new.must_change_password is distinct from old.must_change_password then
    if new.must_change_password = false and auth.uid() = old.id then
      null;
    elsif actor_role = 'super_admin'::public.user_role then
      null;
    else
      raise exception 'Not allowed to change password flag';
    end if;
  end if;

  if actor_role in ('user'::public.user_role, 'shaykh'::public.user_role)
     and auth.uid() is distinct from old.id then
    raise exception 'Not allowed to update this profile';
  end if;

  -- Mosque admins editing other members only change approval_status in the app.
  if actor_role = 'mosque_admin'::public.user_role
     and auth.uid() is distinct from old.id then
    if new.full_name is distinct from old.full_name
       or new.email is distinct from old.email
       or new.phone is distinct from old.phone
       or new.avatar_url is distinct from old.avatar_url
       or new.must_change_password is distinct from old.must_change_password then
      raise exception 'Mosque admins may only change member approval status';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
  before insert or update on public.profiles
  for each row
  execute procedure public.protect_profile_privileges();

create or replace function public.protect_question_invariants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if auth.role() = 'authenticated'
       and new.asker_id is distinct from auth.uid()
       and public.get_my_role() is distinct from 'super_admin'::public.user_role then
      raise exception 'Cannot ask as another user';
    end if;
    return new;
  end if;

  if new.asker_id is distinct from old.asker_id then
    raise exception 'Cannot change question asker';
  end if;

  if new.mosque_id is distinct from old.mosque_id
     and public.get_my_role() is distinct from 'super_admin'::public.user_role then
    raise exception 'Cannot change question mosque';
  end if;

  if public.get_my_role() = 'user'::public.user_role then
    raise exception 'Users cannot update questions';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_question_invariants on public.questions;
create trigger protect_question_invariants
  before insert or update on public.questions
  for each row
  execute procedure public.protect_question_invariants();

create or replace function public.protect_answer_invariants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.shaykh_id is distinct from old.shaykh_id
       or new.question_id is distinct from old.question_id then
      raise exception 'Cannot reassign an answer';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_answer_invariants on public.answers;
create trigger protect_answer_invariants
  before insert or update on public.answers
  for each row
  execute procedure public.protect_answer_invariants();

create or replace function public.protect_notification_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'Cannot reassign a notification';
    end if;
    if auth.uid() is distinct from old.user_id
       and public.get_my_role() is distinct from 'super_admin'::public.user_role then
      raise exception 'Not allowed to update this notification';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_notification_owner on public.notifications;
create trigger protect_notification_owner
  before update on public.notifications
  for each row
  execute procedure public.protect_notification_owner();

revoke all on function public.protect_profile_privileges() from public, anon, authenticated;
revoke all on function public.protect_question_invariants() from public, anon, authenticated;
revoke all on function public.protect_answer_invariants() from public, anon, authenticated;
revoke all on function public.protect_notification_owner() from public, anon, authenticated;
