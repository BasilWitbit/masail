-- Phase 0 live inventory (run with DB password / Management SQL editor / supabase db query --db-url).
-- Captures what the incomplete repo cannot: full RLS, helper bodies, signup trigger, storage policies.

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public','storage')
order by 1,2,3;

select p.proname, pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.proname in (
      'get_my_role','get_my_mosque_id','get_my_effective_mosque_id',
      'handle_new_user','handle_new_auth_user','on_auth_user_created'
    )
    or p.proname ilike '%new_user%'
    or p.proname ilike '%signup%'
  );

select event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema in ('public','auth')
order by 1,2,3;

select id, name, public from storage.buckets order by name;

select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;

select role, count(*) from public.profiles group by role order by 1;
select count(*) as mosques, count(distinct slug) as distinct_slugs from public.mosques;
