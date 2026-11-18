begin;
create table public.talazo_jobs(name text primary key,lease_id uuid,lease_until timestamptz,started_at timestamptz,finished_at timestamptz,succeeded_at timestamptz,outcome text,failures integer not null default 0);
create table public.talazo_sync_attempts(monitoring_id uuid primary key references public.talazo_monitoring(id) on delete cascade,lease_id uuid,lease_until timestamptz,next_attempt timestamptz not null default now(),failures integer not null default 0,attempted_at timestamptz,succeeded_at timestamptz);
alter table public.talazo_jobs enable row level security;
alter table public.talazo_sync_attempts enable row level security;
create policy job_admin on public.talazo_jobs for select to authenticated using(talazo_private.admin());
create policy attempts_admin on public.talazo_sync_attempts for select to authenticated using(talazo_private.admin());
revoke all on public.talazo_jobs,public.talazo_sync_attempts from public,anon,authenticated;
grant select on public.talazo_jobs,public.talazo_sync_attempts to authenticated;
grant all on public.talazo_jobs,public.talazo_sync_attempts to service_role;
create function public.talazo_claim_job(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare token uuid:=gen_random_uuid(); item public.talazo_jobs;
begin
 if p_name not in ('fields:live','fields:test','inventory:live','inventory:test') then raise exception 'Unsupported job'; end if;
 insert into public.talazo_jobs(name) values(p_name) on conflict do nothing;
 select * into item from public.talazo_jobs where name=p_name for update;
 if item.lease_until>now() or item.started_at>now()-interval '30 seconds' then return null; end if;
 update public.talazo_jobs set lease_id=token,lease_until=now()+interval '5 minutes',started_at=now(),outcome='running' where name=p_name;
 return token;
end $$;
create function public.talazo_finish_job(p_name text,p_lease uuid,p_success boolean,p_outcome text) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.talazo_jobs set lease_id=null,lease_until=null,finished_at=now(),outcome=left(p_outcome,120),succeeded_at=case when p_success then now() else succeeded_at end,failures=case when p_success then 0 else failures+1 end where name=p_name and lease_id=p_lease;
 if not found then raise exception 'Job lease changed'; end if;
end $$;
create function public.talazo_claim_sync(p_environment text) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid; token uuid:=gen_random_uuid();
begin
 perform pg_catalog.pg_advisory_xact_lock(73492);
 select m.id into target from public.talazo_monitoring m
 join public.talazo_zones z on z.id=m.zone_id join public.talazo_farms f on f.id=z.farm_id
 join public.talazo_accounts a on a.user_id=f.owner_id and a.status in ('approved','active')
 join public.talazo_allocations al on al.user_id=a.user_id and al.period=date_trunc('month',now() at time zone 'Africa/Harare')::date and al.sqm>0
 left join public.talazo_sync_attempts s on s.monitoring_id=m.id
 where m.environment=p_environment and m.status in ('awaiting','active') and m.provider_id is not null
 and (m.last_sync is null or m.last_sync<now()-interval '6 hours' or s.failures>0)
 and (s.lease_until is null or s.lease_until<now()) and (s.next_attempt is null or s.next_attempt<=now())
 order by m.last_sync nulls first,s.next_attempt nulls first,m.id limit 1;
 if target is null then return null; end if;
 insert into public.talazo_sync_attempts(monitoring_id,lease_id,lease_until,attempted_at) values(target,token,now()+interval '5 minutes',now()) on conflict(monitoring_id) do update set lease_id=token,lease_until=excluded.lease_until,attempted_at=now();
 return jsonb_build_object('monitoring',target,'lease',token);
end $$;
create function public.talazo_finish_sync(p_monitoring uuid,p_lease uuid,p_success boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.talazo_sync_attempts set lease_id=null,lease_until=null,next_attempt=now()+case when p_success then interval '6 hours' else interval '5 minutes'*power(2,least(failures,6)) end,succeeded_at=case when p_success then now() else succeeded_at end,failures=case when p_success then 0 else failures+1 end where monitoring_id=p_monitoring and lease_id=p_lease;
 if not found then raise exception 'Field lease changed'; end if;
end $$;
revoke all on function public.talazo_claim_job(text),public.talazo_finish_job(text,uuid,boolean,text),public.talazo_claim_sync(text),public.talazo_finish_sync(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.talazo_claim_job(text),public.talazo_finish_job(text,uuid,boolean,text),public.talazo_claim_sync(text),public.talazo_finish_sync(uuid,uuid,boolean) to service_role;
notify pgrst,'reload schema';
commit;
