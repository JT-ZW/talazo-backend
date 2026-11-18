begin;
create table public.talazo_alert_preferences(user_id uuid primary key references auth.users(id) on delete cascade,enabled boolean not null default false,ndvi_drop numeric not null default .15 check(ndvi_drop>0 and ndvi_drop<=1));
create table public.talazo_alerts(id uuid primary key default gen_random_uuid(),monitoring_id uuid not null references public.talazo_monitoring(id) on delete cascade,observed_on text not null,rule text not null,data jsonb not null,created_at timestamptz not null default now(),acknowledged_at timestamptz,unique(monitoring_id,observed_on,rule));
create table public.talazo_history_requests(id uuid primary key default gen_random_uuid(),monitoring_id uuid not null references public.talazo_monitoring(id) on delete cascade,requested_on date not null,requested_by uuid not null references auth.users(id),state text not null default 'submitting' check(state in ('submitting','processing','available','uncertain')),created_at timestamptz not null default now(),unique(monitoring_id,requested_on));
alter table public.talazo_alert_preferences enable row level security;
alter table public.talazo_alerts enable row level security;
alter table public.talazo_history_requests enable row level security;
create policy preferences_owner on public.talazo_alert_preferences for select to authenticated using(user_id=auth.uid());
create policy alerts_owner on public.talazo_alerts for select to authenticated using(exists(select 1 from public.talazo_monitoring m where m.id=monitoring_id and talazo_private.zone_access(m.zone_id)));
create policy history_owner on public.talazo_history_requests for select to authenticated using(exists(select 1 from public.talazo_monitoring m where m.id=monitoring_id and talazo_private.zone_access(m.zone_id)));
revoke all on public.talazo_alert_preferences,public.talazo_alerts,public.talazo_history_requests from public,anon,authenticated;
grant select on public.talazo_alert_preferences,public.talazo_alerts,public.talazo_history_requests to authenticated;
grant all on public.talazo_alert_preferences,public.talazo_alerts,public.talazo_history_requests to service_role;
create function public.talazo_set_alert_preferences(p_enabled boolean,p_threshold numeric) returns void language plpgsql security definer set search_path='' as $$
begin
 if not talazo_private.active() and not talazo_private.admin() then raise exception 'Approved account required';end if;
 if p_threshold is null or p_threshold<=0 or p_threshold>1 then raise exception 'NDVI drop must be greater than 0 and at most 1';end if;
 insert into public.talazo_alert_preferences(user_id,enabled,ndvi_drop) values(auth.uid(),p_enabled,p_threshold) on conflict(user_id) do update set enabled=p_enabled,ndvi_drop=p_threshold;
end $$;
create function public.talazo_acknowledge_alert(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.talazo_alerts a set acknowledged_at=now() where a.id=p_id and exists(select 1 from public.talazo_monitoring m where m.id=a.monitoring_id and talazo_private.zone_access(m.zone_id));
 if not found then raise exception 'Alert access required';end if;
end $$;
create function public.talazo_claim_history(p_monitoring uuid,p_date date) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;m public.talazo_monitoring;
begin
 if not talazo_private.admin() then raise exception 'Administrator required';end if;
 select * into m from public.talazo_monitoring where id=p_monitoring for update;
 if m.id is null or m.status<>'active' then raise exception 'Active field required';end if;
 if p_date is null or p_date<date '2017-01-01' or p_date>=current_date then raise exception 'Select a past date from 2017 onward';end if;
 insert into public.talazo_history_requests(monitoring_id,requested_on,requested_by) values(m.id,p_date,auth.uid()) returning id into result;
 return result;
end $$;
revoke all on function public.talazo_set_alert_preferences(boolean,numeric),public.talazo_acknowledge_alert(uuid),public.talazo_claim_history(uuid,date) from public,anon;
grant execute on function public.talazo_set_alert_preferences(boolean,numeric),public.talazo_acknowledge_alert(uuid),public.talazo_claim_history(uuid,date) to authenticated;
notify pgrst,'reload schema';
commit;
