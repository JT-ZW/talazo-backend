begin;
alter table public.talazo_products drop constraint talazo_products_product_check;
alter table public.talazo_products add constraint talazo_products_product_check check(product='advisory' or product ~ '^(image|breakdown):(ndvi|ndre|ndmi|ndwi|tci|evi|savi|rvi|rsm|soc)$');
create or replace function public.talazo_claim_product(p_monitoring uuid,p_product text,p_date text) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.talazo_monitoring; item public.talazo_products; visits jsonb; token uuid;
begin
 select * into m from public.talazo_monitoring where id=p_monitoring;
 if m.id is null or not talazo_private.zone_access(m.zone_id) or m.status<>'active' or m.provider_id is null then raise exception 'Active field access required'; end if;
 if (p_product<>'advisory' and p_product !~ '^(image|breakdown):(ndvi|ndre|ndmi|ndwi|tci|evi|savi|rvi|rsm|soc)$') or p_date !~ '^[0-9]{8}$' then raise exception 'Unsupported observation product'; end if;
 select data->'products'->(case when p_product in ('image:rvi','image:rsm','breakdown:rvi','breakdown:rsm') then 'getSARDays' else 'getSensedDays' end)->'value' into visits from public.talazo_observations where monitoring_id=p_monitoring;
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

notify pgrst,'reload schema';
commit;
