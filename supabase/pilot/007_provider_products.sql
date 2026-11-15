begin;
alter table public.talazo_monitoring add column last_attempt_at timestamptz;
create table public.talazo_products(
 monitoring_id uuid not null references public.talazo_monitoring(id) on delete cascade,
 product text not null check(product in ('advisory','image:ndvi','image:ndre','image:ndmi','image:ndwi','image:tci','image:evi','image:savi','image:rvi','image:rsm')),
 observed_on text not null check(observed_on ~ '^[0-9]{8}$'),
 state text not null check(state in ('pending','ready','error')),
 data jsonb,
 error text,
 lease_id uuid,
 lease_until timestamptz,
 refreshed_at timestamptz,
 retry_after timestamptz,
 primary key(monitoring_id,product,observed_on)
);
alter table public.talazo_products enable row level security;
create policy product_read on public.talazo_products for select to authenticated using(exists(select 1 from public.talazo_monitoring m where m.id=monitoring_id and talazo_private.zone_access(m.zone_id)));
revoke all on public.talazo_products from anon,authenticated;
grant select on public.talazo_products to authenticated;
grant all on public.talazo_products to service_role;
create function public.talazo_claim_product(p_monitoring uuid,p_product text,p_date text) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.talazo_monitoring; item public.talazo_products; visits jsonb; token uuid;
begin
 select * into m from public.talazo_monitoring where id=p_monitoring;
 if m.id is null or not talazo_private.zone_access(m.zone_id) or m.status<>'active' or m.provider_id is null then raise exception 'Active field access required'; end if;
 if p_product not in ('advisory','image:ndvi','image:ndre','image:ndmi','image:ndwi','image:tci','image:evi','image:savi','image:rvi','image:rsm') or p_date !~ '^[0-9]{8}$' then raise exception 'Unsupported observation product'; end if;
 select data->'products'->(case when p_product in ('image:rvi','image:rsm') then 'getSARDays' else 'getSensedDays' end)->'value' into visits from public.talazo_observations where monitoring_id=p_monitoring;
 visits:=coalesce(visits->'SensedDays',visits->'SARDays',visits,'{}'::jsonb);
 if not (visits ? p_date) then raise exception 'Choose an available observation date'; end if;
 insert into public.talazo_products(monitoring_id,product,observed_on,state) values(p_monitoring,p_product,p_date,'pending') on conflict do nothing;
 select * into item from public.talazo_products where monitoring_id=p_monitoring and product=p_product and observed_on=p_date for update;
 if item.state='ready' and item.refreshed_at>now()-interval '6 hours' then return jsonb_build_object('cached',true,'item',to_jsonb(item)); end if;
 if item.state='error' and item.retry_after>now() then return jsonb_build_object('cached',true,'item',to_jsonb(item)); end if;
 if item.lease_until>now() then return jsonb_build_object('pending',true); end if;
 token:=gen_random_uuid();
 update public.talazo_products set state='pending',lease_id=token,lease_until=now()+interval '90 seconds' where monitoring_id=p_monitoring and product=p_product and observed_on=p_date;
 return jsonb_build_object('lease',token);
end $$;
revoke all on function public.talazo_claim_product(uuid,text,text) from public,anon;
grant execute on function public.talazo_claim_product(uuid,text,text) to authenticated;
create function public.talazo_claim_refresh(p_monitoring uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare m public.talazo_monitoring;
begin
 select * into m from public.talazo_monitoring where id=p_monitoring for update;
 if m.id is null or not talazo_private.zone_access(m.zone_id) or m.status not in ('active','awaiting') or m.provider_id is null then raise exception 'Monitored field access required'; end if;
 if m.last_attempt_at>now()-interval '2 minutes' or m.last_sync>now()-interval '10 minutes' then return false; end if;
 update public.talazo_monitoring set last_attempt_at=now() where id=p_monitoring;
 return true;
end $$;
revoke all on function public.talazo_claim_refresh(uuid) from public,anon;
grant execute on function public.talazo_claim_refresh(uuid) to authenticated;
create function talazo_private.invalidate_crop_products() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.talazo_products where product='advisory' and monitoring_id in (select id from public.talazo_monitoring where zone_id=new.id);
 return new;
end $$;
revoke all on function talazo_private.invalidate_crop_products() from public;
create trigger invalidate_crop_products after update of crop_code on public.talazo_zones for each row when(old.crop_code is distinct from new.crop_code) execute function talazo_private.invalidate_crop_products();
notify pgrst,'reload schema';
commit;
