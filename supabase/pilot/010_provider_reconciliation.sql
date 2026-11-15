begin;
create table public.talazo_provider_fields(
 provider_id text primary key check(provider_id ~ '^[0-9]+$'),
 name text not null,
 boundary jsonb, crop_code text, sowing_date date,
 remote_state text not null default 'unknown' check(remote_state in ('active','paused','expired','unknown')),
 fingerprint text, applied_hash text, present boolean not null default true,
 seen_at timestamptz not null default now(), issue text
);
create table public.talazo_provider_sync(
 id boolean primary key default true check(id),
 checked_at timestamptz, error text, lease_id uuid, lease_until timestamptz
);
insert into public.talazo_provider_sync(id) values(true);
alter table public.talazo_provider_fields enable row level security;
alter table public.talazo_provider_sync enable row level security;
create policy provider_inventory_admin on public.talazo_provider_fields for select to authenticated using(talazo_private.admin());
create policy provider_sync_admin on public.talazo_provider_sync for select to authenticated using(talazo_private.admin());
revoke all on public.talazo_provider_fields,public.talazo_provider_sync from public,anon,authenticated;
grant select on public.talazo_provider_fields,public.talazo_provider_sync to authenticated;
grant all on public.talazo_provider_fields,public.talazo_provider_sync to service_role;

create function public.talazo_claim_provider_sync(p_force boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare item public.talazo_provider_sync; token uuid;
begin
 select * into item from public.talazo_provider_sync where id for update;
 if item.lease_until>now() or item.checked_at>now()-(case when p_force then interval '30 seconds' else interval '5 minutes' end) then return null; end if;
 token:=gen_random_uuid();
 update public.talazo_provider_sync set lease_id=token,lease_until=now()+interval '10 minutes' where id;
 return token;
end $$;
revoke all on function public.talazo_claim_provider_sync(boolean) from public,anon,authenticated;
grant execute on function public.talazo_claim_provider_sync(boolean) to service_role;

-- Field ownership and quotas are Talazo decisions. The provider snapshot is
-- server-written; a browser never supplies a trusted boundary or crop here.
create function public.talazo_apply_provider_field(p_provider_id text,p_farm uuid default null,p_accept_boundary boolean default false,p_name text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare remote public.talazo_provider_fields; m public.talazo_monitoring; z public.talazo_zones;
 owner uuid; target_farm uuid; area bigint; used bigint; allowance bigint; field_id uuid; record_id uuid;
 shape extensions.geometry; changed_boundary boolean; changed_crop boolean; caption text; crop text;
 paid_month date:=date_trunc('month',now() at time zone 'Africa/Harare')::date;
 result_state text; new_status text;
begin
 if not talazo_private.admin() and coalesce(auth.role(),'')<>'service_role' then raise exception 'Administrator required'; end if;
 perform 1 from public.talazo_periods where talazo_periods.period=paid_month for update;
 select * into remote from public.talazo_provider_fields where provider_id=p_provider_id for update;
 if remote.provider_id is null or not remote.present or remote.boundary is null or remote.fingerprint is null then raise exception 'A verified provider snapshot is required'; end if;
 if remote.issue is not null and remote.issue not in ('Boundary change requires administrator review','Provider monitoring expired') then raise exception 'Refresh and verify the provider field before applying its data'; end if;
 if remote.seen_at<now()-interval '15 minutes' then raise exception 'Refresh the Farmonaut account before applying changes'; end if;
 select * into m from public.talazo_monitoring where environment='live' and provider_id=p_provider_id for update;
 if m.id is null and (p_farm is null or not talazo_private.admin()) then raise exception 'Choose a farm and its approved owner before importing'; end if;
 if m.id is not null then
  select * into z from public.talazo_zones where id=m.zone_id for update;
  if p_farm is not null and p_farm<>z.farm_id then raise exception 'A connected field cannot be reassigned by synchronization'; end if;
  if m.status='registering' then raise exception 'Registration is in progress; reconcile it first'; end if;
  if remote.applied_hash=remote.fingerprint and remote.issue is null and not p_accept_boundary and p_farm is null and p_name is null and m.status in ('active','awaiting','paused') then
   return jsonb_build_object('action','unchanged','monitoring',m.id);
  end if;
 end if;
 target_farm:=coalesce(z.farm_id,p_farm);
 select owner_id into owner from public.talazo_farms where id=target_farm for update;
 if owner is null or not exists(select 1 from public.talazo_accounts where user_id=owner and status in ('approved','active')) then raise exception 'An approved farmer is required'; end if;
 shape:=extensions.st_setsrid(extensions.st_geomfromgeojson(remote.boundary::text),4326);
 if extensions.st_geometrytype(shape)<>'ST_Polygon' or not extensions.st_isvalid(shape) or extensions.st_numinteriorrings(shape)>0 then raise exception 'Provider boundary is not a valid polygon'; end if;
 if extensions.st_xmin(shape::extensions.box3d)<-180 or extensions.st_xmax(shape::extensions.box3d)>180 or extensions.st_ymin(shape::extensions.box3d)<-90 or extensions.st_ymax(shape::extensions.box3d)>90 then raise exception 'Provider coordinates are out of range'; end if;
 area:=ceil(extensions.st_area(shape::extensions.geography));
 if area<100 or area>=10000000 then raise exception 'Provider area must be at least 0.01 and below 1000 hectares'; end if;
 changed_boundary:=z.id is not null and not extensions.st_equals(shape,extensions.st_setsrid(extensions.st_geomfromgeojson(z.boundary::text),4326));
 if changed_boundary and not p_accept_boundary then
  update public.talazo_monitoring set status='uncertain',error='Farmonaut boundary changed. Talazo must review its area and allocation before updating this field.' where id=m.id;
  update public.talazo_provider_fields set issue='Boundary change requires administrator review' where provider_id=p_provider_id;
  return jsonb_build_object('action','review','monitoring',m.id);
 end if;
 if exists(select 1 from public.talazo_zones other where other.farm_id=target_farm and other.id<>coalesce(z.id,'00000000-0000-0000-0000-000000000000'::uuid) and extensions.st_area(extensions.st_intersection(shape,extensions.st_setsrid(extensions.st_geomfromgeojson(other.boundary::text),4326))::extensions.geography)>1) then raise exception 'Provider field overlaps another growing area in this farm'; end if;
 if remote.sowing_date>current_date then raise exception 'Provider planting date cannot be in the future'; end if;
 select name into crop from public.talazo_crop_catalog where code=remote.crop_code;
 if crop is null then raise exception 'Provider crop needs a supported crop classification'; end if;
 caption:=coalesce(nullif(trim(p_name),''),remote.name);
 if z.id is not null then
  caption:=regexp_replace(caption,' \[Talazo '||z.id::text||'\]$','');
  select case when caption like name||' / %' then substring(caption from length(name)+4) else caption end into caption from public.talazo_farms where id=target_farm;
 end if;
 if length(caption) not between 1 and 120 then raise exception 'Use a field name of 1 to 120 characters'; end if;
 new_status:=case when remote.remote_state='paused' then 'paused' when remote.remote_state='expired' then 'uncertain' when m.status='paused' and remote.remote_state='unknown' then 'paused' when m.status='active' and not changed_boundary then 'active' else 'awaiting' end;
 if new_status<>'paused' then
  select sqm into allowance from public.talazo_allocations where talazo_allocations.period=paid_month and user_id=owner;
  select coalesce(sum(v.area_sqm),0) into used from public.talazo_zones v join public.talazo_farms f on f.id=v.farm_id where f.owner_id=owner and v.id<>coalesce(z.id,'00000000-0000-0000-0000-000000000000'::uuid) and exists(select 1 from public.talazo_monitoring t where t.zone_id=v.id and t.status in ('registering','uncertain','awaiting','active'));
  if allowance is null or used+area>allowance then raise exception 'The farmer allocation is insufficient for this provider field'; end if;
  if not exists(select 1 from public.talazo_periods where talazo_periods.period=paid_month and quota_sqm>=(select coalesce(sum(sqm),0) from public.talazo_allocations where talazo_allocations.period=paid_month)) then raise exception 'Set a valid current monthly quota before importing'; end if;
 end if;
 changed_crop:=z.id is not null and (z.crop_code<>remote.crop_code or z.sowing_date is distinct from remote.sowing_date);
 if z.id is null then
  field_id:=public.talazo_add_zone(target_farm,caption,remote.boundary,remote.crop_code,crop,remote.sowing_date,'Imported from Farmonaut; ownership assigned by Talazo.');
  insert into public.talazo_monitoring(zone_id,environment,status,provider_id) values(field_id,'live',new_status,p_provider_id) returning id into record_id;
  result_state:='imported';
 else
  record_id:=m.id;
  update public.talazo_zones set name=caption,boundary=remote.boundary,area_sqm=area,crop_code=remote.crop_code,crop_name=crop,crop_entered_name=case when crop_code<>remote.crop_code then crop else crop_entered_name end,sowing_date=remote.sowing_date where id=z.id;
  if changed_boundary or changed_crop then
   delete from public.talazo_products where monitoring_id=m.id;
   delete from public.talazo_observations where monitoring_id=m.id;
   new_status:=case when new_status='active' then 'awaiting' else new_status end;
  end if;
  update public.talazo_monitoring set status=new_status,error=case when remote.remote_state='expired' then 'Farmonaut reports expired monitoring; administrator review required.' else null end,last_sync=case when changed_boundary or changed_crop then null else last_sync end where id=m.id;
  result_state:=case when remote.applied_hash=remote.fingerprint and not changed_boundary and not changed_crop then 'unchanged' else 'updated' end;
 end if;
 update public.talazo_provider_fields set applied_hash=fingerprint,issue=case when remote.remote_state='expired' then 'Provider monitoring expired' else null end where provider_id=p_provider_id;
 if result_state<>'unchanged' then insert into public.talazo_events(actor,action,resource) values(auth.uid(),'provider_field_'||result_state,record_id::text); end if;
 return jsonb_build_object('action',result_state,'monitoring',record_id);
end $$;
revoke all on function public.talazo_apply_provider_field(text,uuid,boolean,text) from public,anon;
grant execute on function public.talazo_apply_provider_field(text,uuid,boolean,text) to authenticated,service_role;
notify pgrst,'reload schema';
commit;
