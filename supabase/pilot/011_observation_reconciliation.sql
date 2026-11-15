-- Prevent an in-flight refresh from restoring old advice/imagery after a
-- concurrent provider crop, planting-date or boundary change clears the cache.
begin;
create function public.talazo_commit_observations(p_monitoring uuid,p_setup jsonb,p_data jsonb,p_status text,p_error text) returns void
language plpgsql security definer set search_path='' as $$
declare m public.talazo_monitoring; z public.talazo_zones; expected jsonb;
begin
 if p_status not in ('active','awaiting') then raise exception 'Invalid observation status'; end if;
 select * into m from public.talazo_monitoring where id=p_monitoring for update;
 if m.id is null or m.status not in ('active','awaiting') then raise exception 'Field state changed during refresh'; end if;
 select * into z from public.talazo_zones where id=m.zone_id for update;
 expected:=jsonb_build_object('boundary',z.boundary,'crop',z.crop_code,'sowing',z.sowing_date);
 if p_setup is distinct from expected then raise exception 'Field setup changed during refresh; retry with the current field'; end if;
 if not exists(select 1 from public.talazo_farms f join public.talazo_accounts a on a.user_id=f.owner_id where f.id=z.farm_id and a.status in ('approved','active')) then raise exception 'Farmer approval changed during refresh'; end if;
 insert into public.talazo_observations(monitoring_id,data,fetched_at) values(m.id,p_data,now()) on conflict(monitoring_id) do update set data=excluded.data,fetched_at=excluded.fetched_at;
 update public.talazo_monitoring set status=p_status,last_sync=now(),error=p_error where id=m.id;
end $$;
revoke all on function public.talazo_commit_observations(uuid,jsonb,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.talazo_commit_observations(uuid,jsonb,jsonb,text,text) to service_role;
notify pgrst,'reload schema';
commit;
