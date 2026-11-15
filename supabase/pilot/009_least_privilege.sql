-- RLS does not govern TRUNCATE. Remove Supabase default table grants as well
-- as ordinary writes; authenticated mutations use the checked RPCs only.
begin;
do $$ declare item record; begin
 for item in select tablename from pg_tables where schemaname='public'
   and (tablename like 'talazo\_%' escape '\' or tablename='platform_admins')
 loop
  execute format('revoke all privileges on table public.%I from anon, authenticated',item.tablename);
  execute format('grant select on table public.%I to authenticated',item.tablename);
 end loop;
end $$;
commit;
