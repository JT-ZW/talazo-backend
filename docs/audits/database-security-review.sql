-- Read-only: run in the configured project's SQL editor to finish the review.
-- The REST OpenAPI inventory cannot establish policy or constraint correctness.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by c.relname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname='public' order by tablename, policyname;

select table_name, grantee, privilege_type from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;

select conrelid::regclass as table_name, conname,
       pg_get_constraintdef(oid) as definition
from pg_constraint where connamespace='public'::regnamespace
order by conrelid::regclass::text, conname;

select tablename, indexname, indexdef from pg_indexes
where schemaname='public' order by tablename,indexname;

select n.nspname as schema_name, p.proname, p.prosecdef as security_definer,
       p.proconfig, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','private') and p.prokind='f';
