-- Additive pilot migration. Does not apply the historical 001_foundation.sql.
begin;
create table public.talazo_accounts (
 user_id uuid primary key references auth.users(id), email text not null unique,
 name text not null, status text not null default 'approved' check(status in ('approved','active','suspended')),
 approved_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.talazo_periods (
 period date primary key check(extract(day from period)=1), quota_sqm bigint not null check(quota_sqm>=0),
 updated_at timestamptz not null default now()
);
create table public.talazo_allocations (
 period date not null references public.talazo_periods(period), user_id uuid not null references public.talazo_accounts(user_id),
 sqm bigint not null check(sqm>=0), primary key(period,user_id)
);
create table public.talazo_farms (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.talazo_accounts(user_id),
 name text not null check(length(name) between 1 and 120), district text not null default '', created_at timestamptz not null default now()
);
create table public.talazo_zones (
 id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.talazo_farms(id),
 name text not null, boundary jsonb not null, area_sqm bigint not null check(area_sqm>=100 and area_sqm<10000000),
 crop_code text not null, crop_name text not null, sowing_date date, characteristics text not null default '',
 created_at timestamptz not null default now()
);
create table public.talazo_monitoring (
 id uuid primary key default gen_random_uuid(), zone_id uuid not null references public.talazo_zones(id),
 environment text not null check(environment in ('test','live')), status text not null default 'requested'
 check(status in ('requested','registering','uncertain','awaiting','active','error')),
 provider_id text, last_sync timestamptz, error text, created_at timestamptz not null default now(),
 unique(zone_id,environment)
);
create table public.talazo_observations (
 monitoring_id uuid primary key references public.talazo_monitoring(id), data jsonb not null,
 fetched_at timestamptz not null default now()
);
create table public.talazo_events (
 id bigint generated always as identity primary key, actor uuid, action text not null,
 resource text, created_at timestamptz not null default now()
);
create index on public.talazo_farms(owner_id);
create index on public.talazo_zones(farm_id);
create index on public.talazo_monitoring(status,last_sync);
create unique index talazo_live_provider_id on public.talazo_monitoring(provider_id) where environment='live';
revoke insert,update,delete on public.platform_admins from anon,authenticated;
create schema if not exists talazo_private;
revoke all on schema talazo_private from public;
grant usage on schema talazo_private to authenticated;
create function talazo_private.admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.platform_admins where user_id=auth.uid())
$$;
create function talazo_private.active() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.talazo_accounts where user_id=auth.uid() and status in ('approved','active'))
$$;
create function talazo_private.farm_access(farm uuid) returns boolean language sql stable security definer set search_path='' as $$
 select talazo_private.admin() or (talazo_private.active() and exists(select 1 from public.talazo_farms where id=farm and owner_id=auth.uid()))
$$;
create function talazo_private.zone_access(zone uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.talazo_zones where id=zone and talazo_private.farm_access(farm_id))
$$;
revoke all on all functions in schema talazo_private from public;
grant execute on all functions in schema talazo_private to authenticated;

alter table public.talazo_accounts enable row level security;
alter table public.talazo_periods enable row level security;
alter table public.talazo_allocations enable row level security;
alter table public.talazo_farms enable row level security;
alter table public.talazo_zones enable row level security;
alter table public.talazo_monitoring enable row level security;
alter table public.talazo_observations enable row level security;
alter table public.talazo_events enable row level security;
create policy account_read on public.talazo_accounts for select to authenticated using(user_id=auth.uid() or talazo_private.admin());
create policy period_read on public.talazo_periods for select to authenticated using(talazo_private.admin() or talazo_private.active());
create policy allocation_read on public.talazo_allocations for select to authenticated using(talazo_private.admin() or (user_id=auth.uid() and talazo_private.active()));
create policy farm_read on public.talazo_farms for select to authenticated using(talazo_private.farm_access(id));
create policy zone_read on public.talazo_zones for select to authenticated using(talazo_private.farm_access(farm_id));
create policy monitoring_read on public.talazo_monitoring for select to authenticated using(talazo_private.zone_access(zone_id));
create policy observation_read on public.talazo_observations for select to authenticated using(exists(select 1 from public.talazo_monitoring m where m.id=monitoring_id and talazo_private.zone_access(m.zone_id)));
create policy event_read on public.talazo_events for select to authenticated using(talazo_private.admin());
grant select on public.talazo_accounts,public.talazo_periods,public.talazo_allocations,public.talazo_farms,public.talazo_zones,public.talazo_monitoring,public.talazo_observations,public.talazo_events to authenticated;
revoke insert,update,delete on public.talazo_accounts,public.talazo_periods,public.talazo_allocations,public.talazo_farms,public.talazo_zones,public.talazo_monitoring,public.talazo_observations,public.talazo_events from anon,authenticated;
grant all on public.talazo_accounts,public.talazo_periods,public.talazo_allocations,public.talazo_farms,public.talazo_zones,public.talazo_monitoring,public.talazo_observations,public.talazo_events to service_role;
grant usage,select on sequence public.talazo_events_id_seq to service_role;

create function public.talazo_is_admin() returns boolean language sql stable security definer set search_path='' as $$select talazo_private.admin()$$;
create function public.talazo_approve(p_user uuid,p_email text,p_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not talazo_private.admin() then raise exception 'Administrator required'; end if;
 if not exists(select 1 from auth.users where id=p_user and lower(email)=lower(p_email)) then raise exception 'Identity mismatch'; end if;
 insert into public.talazo_accounts(user_id,email,name,approved_by) values(p_user,lower(p_email),p_name,auth.uid())
 on conflict(user_id) do update set name=excluded.name;
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'farmer_approved',p_user::text);
end $$;
create function public.talazo_account_status(p_user uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not talazo_private.admin() or p_status not in ('active','suspended') then raise exception 'Not permitted'; end if;
 update public.talazo_accounts set status=p_status where user_id=p_user;
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'account_'||p_status,p_user::text);
end $$;
create function public.talazo_set_quota(p_period date,p_sqm bigint) returns void language plpgsql security definer set search_path='' as $$
declare allocated bigint;
begin
 if not talazo_private.admin() then raise exception 'Administrator required'; end if;
 insert into public.talazo_periods(period,quota_sqm) values(p_period,p_sqm) on conflict(period) do nothing;
 perform 1 from public.talazo_periods where period=p_period for update;
 select coalesce(sum(sqm),0) into allocated from public.talazo_allocations where period=p_period;
 if p_sqm<allocated then raise exception 'Quota cannot be below existing allocations'; end if;
 update public.talazo_periods set quota_sqm=p_sqm,updated_at=now() where period=p_period;
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'quota_updated',p_period::text);
end $$;
create function public.talazo_allocate(p_period date,p_user uuid,p_sqm bigint) returns void language plpgsql security definer set search_path='' as $$
declare cap bigint; others bigint; used bigint;
begin
 if not talazo_private.admin() then raise exception 'Administrator required'; end if;
 select quota_sqm into cap from public.talazo_periods where period=p_period for update;
 if cap is null then raise exception 'Set the monthly quota first'; end if;
 select coalesce(sum(sqm),0) into others from public.talazo_allocations where period=p_period and user_id<>p_user;
 select coalesce(sum(z.area_sqm),0) into used from public.talazo_zones z join public.talazo_farms f on f.id=z.farm_id
 where f.owner_id=p_user and exists(select 1 from public.talazo_monitoring m where m.zone_id=z.id and m.status in ('registering','uncertain','awaiting','active'));
 if p_sqm<used then raise exception 'Allocation cannot be below committed monitored area'; end if;
 if p_sqm<0 or others+p_sqm>cap then raise exception 'Monthly hectare quota exceeded'; end if;
 insert into public.talazo_allocations values(p_period,p_user,p_sqm) on conflict(period,user_id) do update set sqm=excluded.sqm;
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'allocation_updated',p_user::text);
end $$;

create function public.talazo_add_farm(p_owner uuid,p_name text,p_district text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not talazo_private.admin() and not (p_owner=auth.uid() and talazo_private.active()) then raise exception 'Not permitted'; end if;
 insert into public.talazo_farms(owner_id,name,district) values(p_owner,trim(p_name),p_district) returning id into result;
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'farm_created',result::text);
 return result;
end $$;
create function public.talazo_add_zone(p_farm uuid,p_name text,p_boundary jsonb,p_crop text,p_crop_name text,p_sowing date,p_notes text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; shape extensions.geometry; metres bigint;
begin
 if not talazo_private.farm_access(p_farm) then raise exception 'Not permitted'; end if;
 shape:=extensions.st_setsrid(extensions.st_geomfromgeojson(p_boundary::text),4326);
 if extensions.st_geometrytype(shape)<>'ST_Polygon' or not extensions.st_isvalid(shape) or extensions.st_numinteriorrings(shape)>0 then raise exception 'Draw one valid polygon without holes'; end if;
 if extensions.st_xmin(shape::extensions.box3d)<-180 or extensions.st_xmax(shape::extensions.box3d)>180 or extensions.st_ymin(shape::extensions.box3d)<-90 or extensions.st_ymax(shape::extensions.box3d)>90 then raise exception 'Coordinates out of range'; end if;
 metres:=ceil(extensions.st_area(shape::extensions.geography));
 if metres<100 or metres>=10000000 then raise exception 'Monitored area must be at least 0.01 and below 1000 hectares'; end if;
 if p_sowing>current_date then raise exception 'Use the actual planting date, not a future date'; end if;
 if length(trim(p_name)) not between 1 and 120 or p_crop !~ '^[0-9]{1,3}$' then raise exception 'Invalid zone or crop'; end if;
 perform 1 from public.talazo_farms where id=p_farm for update;
 if exists(select 1 from public.talazo_zones z where z.farm_id=p_farm and extensions.st_area(extensions.st_intersection(shape,extensions.st_setsrid(extensions.st_geomfromgeojson(z.boundary::text),4326))::extensions.geography)>1) then raise exception 'Zone overlaps an existing growing area'; end if;
 insert into public.talazo_zones(farm_id,name,boundary,area_sqm,crop_code,crop_name,sowing_date,characteristics)
 values(p_farm,trim(p_name),p_boundary,metres,p_crop,p_crop_name,p_sowing,left(p_notes,2000)) returning id into result;
 return result;
end $$;
create function public.talazo_request(p_zone uuid,p_environment text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not talazo_private.zone_access(p_zone) then raise exception 'Not permitted'; end if;
 insert into public.talazo_monitoring(zone_id,environment) values(p_zone,p_environment) on conflict(zone_id,environment) do nothing;
end $$;
create function public.talazo_claim(p_id uuid,p_period date) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.talazo_monitoring; owner uuid; allowance bigint; used bigint; area bigint; result jsonb;
begin
 if not talazo_private.admin() then raise exception 'Administrator required'; end if;
 if p_period<>date_trunc('month',now() at time zone 'Africa/Harare')::date then raise exception 'Use the current paid month'; end if;
 perform 1 from public.talazo_periods where period=p_period for update;
 select * into m from public.talazo_monitoring where id=p_id for update;
 if m.id is null or m.status<>'requested' then raise exception 'Request is already processing or requires reconciliation'; end if;
 select f.owner_id,z.area_sqm into owner,area from public.talazo_zones z join public.talazo_farms f on f.id=z.farm_id where z.id=m.zone_id;
 if not exists(select 1 from public.talazo_accounts where user_id=owner and status in ('approved','active')) then raise exception 'Farmer is suspended'; end if;
 select sqm into allowance from public.talazo_allocations where period=p_period and user_id=owner;
 select coalesce(sum(z.area_sqm),0) into used from public.talazo_zones z join public.talazo_farms f on f.id=z.farm_id
 where f.owner_id=owner and exists(select 1 from public.talazo_monitoring t where t.zone_id=z.id and t.status in ('registering','uncertain','awaiting','active'));
 -- Count a zone once even if both test and live records exist.
 if exists(select 1 from public.talazo_monitoring t where t.zone_id=m.zone_id and t.status in ('registering','uncertain','awaiting','active')) then area:=0; end if;
 if allowance is null or used+area>allowance then raise exception 'Farmer allocation is insufficient'; end if;
 update public.talazo_monitoring set status='registering',error=null where id=p_id;
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'monitoring_claimed',p_id::text);
 select jsonb_build_object('monitoring',to_jsonb(m),'zone',to_jsonb(z)) into result from public.talazo_zones z where z.id=m.zone_id;
 return result;
end $$;
-- All mutations go through checked RPCs. PostgreSQL grants EXECUTE to PUBLIC by default.
revoke all on function public.talazo_is_admin(),public.talazo_approve(uuid,text,text),public.talazo_account_status(uuid,text),public.talazo_set_quota(date,bigint),public.talazo_allocate(date,uuid,bigint),public.talazo_add_farm(uuid,text,text),public.talazo_add_zone(uuid,text,jsonb,text,text,date,text),public.talazo_request(uuid,text),public.talazo_claim(uuid,date) from public,anon;
grant execute on function public.talazo_is_admin(),public.talazo_approve(uuid,text,text),public.talazo_account_status(uuid,text),public.talazo_set_quota(date,bigint),public.talazo_allocate(date,uuid,bigint),public.talazo_add_farm(uuid,text,text),public.talazo_add_zone(uuid,text,jsonb,text,text,date,text),public.talazo_request(uuid,text),public.talazo_claim(uuid,date) to authenticated;
commit;
