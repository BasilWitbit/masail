create or replace function public.get_my_effective_mosque_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select mosque_id from public.profiles where id = auth.uid()),
    (select mosque_id from public.shaykhs where profile_id = auth.uid() limit 1)
  )
$$;

grant execute on function public.get_my_effective_mosque_id() to authenticated, anon, service_role;

drop policy if exists "platform_settings_read" on public.platform_settings;

create policy "platform_settings_read" on public.platform_settings
for select
using (
  mosque_id is null
  or mosque_id = public.get_my_effective_mosque_id()
  or get_my_role() = 'super_admin'::user_role
);