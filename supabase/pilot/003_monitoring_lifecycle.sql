begin;
alter table public.talazo_monitoring drop constraint talazo_monitoring_status_check;
alter table public.talazo_monitoring add constraint talazo_monitoring_status_check check(status in ('requested','registering','uncertain','awaiting','active','error','paused'));
create or replace function public.talazo_set_quota(p_period date,p_sqm bigint) returns void language plpgsql security definer set search_path='' as $$
declare allocated bigint; committed bigint;
begin
 if not talazo_private.admin() then raise exception 'Administrator required'; end if;
 insert into public.talazo_periods(period,quota_sqm) values(p_period,p_sqm) on conflict(period) do nothing;
 perform 1 from public.talazo_periods where period=p_period for update;
 select coalesce(sum(sqm),0) into allocated from public.talazo_allocations where period=p_period;
 select coalesce(sum(z.area_sqm),0) into committed from public.talazo_zones z
 where exists(select 1 from public.talazo_monitoring m where m.zone_id=z.id and m.status in ('registering','uncertain','awaiting','active'));
 if p_sqm<greatest(allocated,committed) then raise exception 'Quota cannot be below allocated or committed monitored area. Pause monitoring and reduce allocations first.'; end if;
 update public.talazo_periods set quota_sqm=p_sqm,updated_at=now() where period=p_period;
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'quota_updated',p_period::text);
end $$;
create or replace function public.talazo_claim(p_id uuid,p_period date) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.talazo_monitoring; owner uuid; allowance bigint; used bigint; area bigint; result jsonb;
begin
 if not talazo_private.admin() then raise exception 'Administrator required'; end if;
 if p_period<>date_trunc('month',now() at time zone 'Africa/Harare')::date then raise exception 'Use the current paid month'; end if;
 perform 1 from public.talazo_periods where period=p_period for update;
 select * into m from public.talazo_monitoring where id=p_id for update;
 if m.id is null or m.status not in ('requested','paused') then raise exception 'Request is already processing or requires reconciliation'; end if;
 select f.owner_id,z.area_sqm into owner,area from public.talazo_zones z join public.talazo_farms f on f.id=z.farm_id where z.id=m.zone_id;
 if not exists(select 1 from public.talazo_accounts where user_id=owner and status in ('approved','active')) then raise exception 'Farmer is suspended'; end if;
 select sqm into allowance from public.talazo_allocations where period=p_period and user_id=owner;
 select coalesce(sum(z.area_sqm),0) into used from public.talazo_zones z join public.talazo_farms f on f.id=z.farm_id
 where f.owner_id=owner and exists(select 1 from public.talazo_monitoring t where t.zone_id=z.id and t.status in ('registering','uncertain','awaiting','active'));
 if exists(select 1 from public.talazo_monitoring t where t.zone_id=m.zone_id and t.status in ('registering','uncertain','awaiting','active')) then area:=0; end if;
 if allowance is null or used+area>allowance then raise exception 'Farmer allocation is insufficient'; end if;
 update public.talazo_monitoring set status='registering',error=null where id=p_id;
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'monitoring_claimed',p_id::text);
 select jsonb_build_object('monitoring',to_jsonb(m),'zone',to_jsonb(z)) into result from public.talazo_zones z where z.id=m.zone_id;
 return result;
end $$;
notify pgrst,'reload schema';
commit;
