begin;
create table public.talazo_support_requests (
 id uuid primary key default gen_random_uuid(),
 requester uuid not null default auth.uid() references auth.users(id),
 category text not null check(category in ('access','field','monitoring','allowance','report','other')),
 subject text not null check(length(trim(subject)) between 1 and 120),
 message text not null check(length(trim(message)) between 1 and 2000),
 status text not null default 'open' check(status in ('open','in_review','resolved')),
 reply text not null default '' check(length(reply)<=2000),
 created_at timestamptz not null default now()
);
create index talazo_support_requester_idx on public.talazo_support_requests(requester,created_at);
alter table public.talazo_support_requests enable row level security;
revoke all on public.talazo_support_requests from public,anon,authenticated;
grant select,insert(category,subject,message),update(status,reply) on public.talazo_support_requests to authenticated;
create policy support_read on public.talazo_support_requests for select to authenticated using (
 (select talazo_private.admin()) or (requester=(select auth.uid()) and (select talazo_private.active()))
);
create policy support_create on public.talazo_support_requests for insert to authenticated with check (
 requester=(select auth.uid()) and ((select talazo_private.active()) or (select talazo_private.admin()))
);
create policy support_admin_reply on public.talazo_support_requests for update to authenticated
 using ((select talazo_private.admin())) with check ((select talazo_private.admin()));
commit;
