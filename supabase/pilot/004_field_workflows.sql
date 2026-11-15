begin;
create table public.talazo_weather (
 zone_id uuid references public.talazo_zones(id) on delete cascade,
 environment text check(environment in ('test','live')),
 data jsonb not null,
 fetched_at timestamptz not null default now(),
 primary key(zone_id,environment)
);
create table public.talazo_field_activities (
 id uuid primary key default gen_random_uuid(),
 zone_id uuid not null references public.talazo_zones(id) on delete cascade,
 actor uuid not null references auth.users(id),
 activity_date date not null,
 kind text not null check(kind in ('scouting','planting','irrigation','fertilizer','treatment','harvest','delivery')),
 notes text not null check(length(notes) between 1 and 2000),
 batch_reference text not null default '' check(length(batch_reference)<=120),
 created_at timestamptz not null default now()
);
alter table public.talazo_weather enable row level security;
alter table public.talazo_field_activities enable row level security;
create policy weather_read on public.talazo_weather for select to authenticated using(talazo_private.zone_access(zone_id));
create policy activities_read on public.talazo_field_activities for select to authenticated using(talazo_private.zone_access(zone_id));
grant select on public.talazo_weather,public.talazo_field_activities to authenticated;
grant all on public.talazo_weather,public.talazo_field_activities to service_role;
create function public.talazo_log_activity(p_zone uuid,p_date date,p_kind text,p_notes text,p_batch text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not talazo_private.zone_access(p_zone) then raise exception 'Field access required'; end if;
 if p_date is null or p_date>current_date then raise exception 'Choose an actual activity date'; end if;
 insert into public.talazo_field_activities(zone_id,actor,activity_date,kind,notes,batch_reference)
 values(p_zone,auth.uid(),p_date,p_kind,trim(p_notes),trim(coalesce(p_batch,''))) returning id into result;
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'field_activity_recorded',result::text);
 return result;
end $$;
revoke all on function public.talazo_log_activity(uuid,date,text,text,text) from public,anon;
grant execute on function public.talazo_log_activity(uuid,date,text,text,text) to authenticated;
create index on public.talazo_field_activities(zone_id,activity_date desc);
notify pgrst,'reload schema';
commit;
