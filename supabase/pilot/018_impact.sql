begin;
create table public.talazo_impact_entries (
 id uuid primary key default gen_random_uuid(),
 metric text not null check(metric in ('lossTonnes','lossReduction','evaluatedArea','onboarded','retention','monitoredArea','interventions','waterSaved','training','payingCustomers','revenue','costs','consentedStories')),
 period date not null check(extract(day from period)=1),
 value numeric not null check(value>=0 and value<=100000000000),
 evidence text not null check(length(trim(evidence)) between 1 and 2000),
 recorded_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 check(metric not in ('lossReduction','retention') or value<=100),
 check(metric in ('waterSaved','revenue','costs') or value<=1000000),
 check(metric not in ('revenue','costs') or value<=1000000000),
 check(metric not in ('onboarded','interventions','training','payingCustomers','consentedStories') or value=trunc(value))
);
create index talazo_impact_entries_period_idx on public.talazo_impact_entries(period,created_at);
alter table public.talazo_impact_entries enable row level security;
revoke all on public.talazo_impact_entries from public,anon,authenticated;
grant select,insert on public.talazo_impact_entries to authenticated;
create policy impact_admin_read on public.talazo_impact_entries for select to authenticated using ((select talazo_private.admin()));
create policy impact_admin_record on public.talazo_impact_entries for insert to authenticated with check (
 (select talazo_private.admin()) and recorded_by=(select auth.uid()) and period<=date_trunc('month',now() at time zone 'Africa/Harare')::date
);
commit;
