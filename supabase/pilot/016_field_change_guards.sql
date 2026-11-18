-- Canonical crop reporting and concurrent geometry protection.
begin;
create or replace function public.talazo_request_change(p_monitoring uuid,p_crop text,p_name text,p_sowing date,p_boundary jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare m public.talazo_monitoring;z public.talazo_zones;shape extensions.geometry;area bigint;target jsonb;prior jsonb;result uuid;
begin
 select * into m from public.talazo_monitoring where id=p_monitoring for update;
 if m.id is null or not talazo_private.zone_access(m.zone_id) then raise exception 'Field access required';end if;
 if m.status not in ('active','awaiting','paused') then raise exception 'Reconcile current monitoring first';end if;
 select * into z from public.talazo_zones where id=m.zone_id for update;
 if not exists(select 1 from public.talazo_crop_catalog where code=p_crop) or p_crop='999' then raise exception 'Choose a classified crop before changing season';end if;
 if length(trim(p_name)) not between 1 and 120 then raise exception 'Crop name is required';end if;
 if p_sowing>current_date or p_sowing<date '1900-01-01' then raise exception 'Invalid planting date';end if;
 if p_sowing is null and z.sowing_date is not null then raise exception 'A saved planting date cannot be cleared at the provider';end if;
 if jsonb_array_length(coalesce(p_boundary,z.boundary)->'coordinates'->0)>501 then raise exception 'Use at most 500 field corners';end if;
 shape:=extensions.st_setsrid(extensions.st_geomfromgeojson(coalesce(p_boundary,z.boundary)::text),4326);
 if extensions.st_geometrytype(shape)<>'ST_Polygon' or not extensions.st_isvalid(shape) or extensions.st_numinteriorrings(shape)>0 then raise exception 'Invalid field polygon';end if;
 if extensions.st_xmin(shape::extensions.box3d)<-180 or extensions.st_xmax(shape::extensions.box3d)>180 or extensions.st_ymin(shape::extensions.box3d)<-90 or extensions.st_ymax(shape::extensions.box3d)>90 then raise exception 'Invalid coordinates';end if;
 area:=ceil(extensions.st_area(shape::extensions.geography));
 if area<100 or area>=10000000 then raise exception 'Field must be between 0.01 and 1000 hectares';end if;
 if exists(select 1 from public.talazo_zones other where other.farm_id=z.farm_id and other.id<>z.id and extensions.st_area(extensions.st_intersection(shape,extensions.st_setsrid(extensions.st_geomfromgeojson(other.boundary::text),4326))::extensions.geography)>1) then raise exception 'Field overlaps another growing area';end if;
 prior:=jsonb_build_object('boundary',z.boundary,'area_sqm',z.area_sqm,'crop_code',z.crop_code,'crop_name',z.crop_name,'crop_entered_name',z.crop_entered_name,'sowing_date',z.sowing_date);
 target:=jsonb_build_object('boundary',coalesce(p_boundary,z.boundary),'area_sqm',area,'crop_code',p_crop,'crop_name',(select name from public.talazo_crop_catalog where code=p_crop),'crop_entered_name',trim(p_name),'sowing_date',p_sowing);
 if prior=target then raise exception 'No field changes were entered';end if;
 insert into public.talazo_field_changes(monitoring_id,requested_by,previous,desired,previous_status) values(m.id,auth.uid(),prior,target,m.status) returning id into result;
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'field_change_requested',result::text);
 return result;
end $$;
create or replace function public.talazo_cancel_change(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.talazo_field_changes c set state='cancelled',finished_at=now() where c.id=p_id and c.state='pending' and exists(select 1 from public.talazo_monitoring m where m.id=c.monitoring_id and talazo_private.zone_access(m.zone_id));
 if not found then raise exception 'Only pending accessible changes can be cancelled';end if;
end $$;
create or replace function public.talazo_claim_change(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.talazo_field_changes;m public.talazo_monitoring;z public.talazo_zones;owner uuid;used bigint;allowance bigint;global_used bigint;cap bigint;reserve bigint;token uuid:=gen_random_uuid();paid_month date:=date_trunc('month',now() at time zone 'Africa/Harare')::date;
begin
 if not talazo_private.admin() then raise exception 'Administrator required';end if;
 select quota_sqm into cap from public.talazo_periods p where p.period=paid_month for update;
 select * into c from public.talazo_field_changes where id=p_id for update;
 if c.id is null or c.state<>'pending' then raise exception 'Change is no longer pending; use reconciliation';end if;
 select * into m from public.talazo_monitoring where id=c.monitoring_id for update;
 select * into z from public.talazo_zones where id=m.zone_id for update;
 if m.status<>c.previous_status or c.previous<>jsonb_build_object('boundary',z.boundary,'area_sqm',z.area_sqm,'crop_code',z.crop_code,'crop_name',z.crop_name,'crop_entered_name',z.crop_entered_name,'sowing_date',z.sowing_date) then raise exception 'Field changed since request; cancel and submit again';end if;
 select owner_id into owner from public.talazo_farms where id=z.farm_id for update;
 if exists(select 1 from public.talazo_zones other where other.farm_id=z.farm_id and other.id<>z.id and extensions.st_area(extensions.st_intersection(extensions.st_setsrid(extensions.st_geomfromgeojson(c.desired->>'boundary'),4326),extensions.st_setsrid(extensions.st_geomfromgeojson(other.boundary::text),4326))::extensions.geography)>1) then raise exception 'Another field now overlaps the requested boundary';end if;
 if not exists(select 1 from public.talazo_accounts where user_id=owner and status in ('approved','active')) then raise exception 'Approved farmer required';end if;
 if exists(select 1 from public.talazo_field_changes other join public.talazo_monitoring om on om.id=other.monitoring_id join public.talazo_zones oz on oz.id=om.zone_id where other.id<>c.id and oz.farm_id=z.farm_id and other.state in ('applying','uncertain')) then raise exception 'Reconcile the other pending change on this farm first';end if;
 reserve:=greatest(z.area_sqm,(c.desired->>'area_sqm')::bigint);
 select sqm into allowance from public.talazo_allocations al where al.user_id=owner and al.period=paid_month;
 select coalesce(sum(q.area_sqm),0) into used from public.talazo_zones q join public.talazo_farms f on f.id=q.farm_id where f.owner_id=owner and q.id<>z.id and exists(select 1 from public.talazo_monitoring t where t.zone_id=q.id and t.status in ('registering','uncertain','awaiting','active'));
 select coalesce(sum(q.area_sqm),0) into global_used from public.talazo_zones q where q.id<>z.id and exists(select 1 from public.talazo_monitoring t where t.zone_id=q.id and t.status in ('registering','uncertain','awaiting','active'));
 if allowance is null or used+reserve>allowance or cap is null or global_used+reserve>cap then raise exception 'Change exceeds farmer allocation or paid quota';end if;
 -- Reserve maximum old/new capacity while provider outcome is unknown.
 update public.talazo_zones set area_sqm=reserve where id=z.id;
 update public.talazo_monitoring set status='registering',error='Approved field change in progress' where id=m.id;
 update public.talazo_field_changes set state='applying',lease_id=token,previous_observation=(select data from public.talazo_observations where monitoring_id=m.id) where id=c.id;
 return jsonb_build_object('id',c.id,'lease',token,'monitoring',m.id,'provider_id',m.provider_id,'environment',m.environment,'previous',c.previous,'desired',c.desired);
end $$;
create or replace function public.talazo_uncertain_change(p_id uuid,p_lease uuid) returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 update public.talazo_field_changes set state='uncertain',error='Provider outcome needs read-back verification; do not resubmit.' where id=p_id and lease_id=p_lease and state in ('applying','uncertain') returning monitoring_id into target;
 if target is not null then update public.talazo_monitoring set status='registering',error='Field change requires administrator reconciliation' where id=target;end if;
end $$;
create or replace function public.talazo_complete_change(p_id uuid,p_lease uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.talazo_field_changes;m public.talazo_monitoring;z public.talazo_zones;
begin
 select * into c from public.talazo_field_changes where id=p_id for update;
 if c.id is null or c.lease_id is distinct from p_lease or c.state not in ('applying','uncertain') then raise exception 'Change lease no longer valid';end if;
 select * into m from public.talazo_monitoring where id=c.monitoring_id for update;
 select * into z from public.talazo_zones where id=m.zone_id for update;
 perform 1 from public.talazo_farms where id=z.farm_id for update;
 if exists(select 1 from public.talazo_zones other where other.farm_id=z.farm_id and other.id<>z.id and extensions.st_area(extensions.st_intersection(extensions.st_setsrid(extensions.st_geomfromgeojson(c.desired->>'boundary'),4326),extensions.st_setsrid(extensions.st_geomfromgeojson(other.boundary::text),4326))::extensions.geography)>1) then raise exception 'Another field overlaps the provider result; reconciliation required';end if;
 if not exists(select 1 from public.talazo_farms f join public.talazo_accounts a on a.user_id=f.owner_id where f.id=z.farm_id and a.status in ('approved','active')) then raise exception 'Approved owner required';end if;
 update public.talazo_zones set boundary=c.desired->'boundary',area_sqm=(c.desired->>'area_sqm')::bigint,crop_code=c.desired->>'crop_code',crop_name=c.desired->>'crop_name',crop_entered_name=c.desired->>'crop_entered_name',sowing_date=(c.desired->>'sowing_date')::date where id=z.id;
 delete from public.talazo_products where monitoring_id=m.id;
 delete from public.talazo_observations where monitoring_id=m.id;
 delete from public.talazo_weather where zone_id=z.id;
 update public.talazo_monitoring set status=case when c.previous_status='paused' then 'paused' else 'awaiting' end,last_sync=null,error=null where id=m.id;
 update public.talazo_field_changes set state='completed',finished_at=now(),error=null where id=c.id;
 insert into public.talazo_events(actor,action,resource) values(c.requested_by,'field_change_completed',c.id::text);
end $$;
notify pgrst,'reload schema';
commit;
