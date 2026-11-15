begin;
create table public.talazo_crop_catalog(code text primary key,name text not null unique,aliases text[] not null default '{}');
insert into public.talazo_crop_catalog(code,name,aliases) values
('6','Maize',ARRAY['corn','maize corn','chibage']::text[]),
('11','Soybean',ARRAY['soybeans','soya','soya bean','soya beans','soy bean','soy beans']::text[]),
('19','Tobacco',ARRAY[]::text[]),
('2','Wheat',ARRAY[]::text[]),
('4','Sorghum',ARRAY['jowar']::text[]),
('5','Pearl millet',ARRAY['bajra','mhunga']::text[]),
('89','Finger millet',ARRAY['ragi','rapoko']::text[]),
('20','Groundnut',ARRAY['groundnuts','peanut','peanuts']::text[]),
('32','Tomato',ARRAY['tomatoes']::text[]),
('16','Potato',ARRAY['potatoes','irish potato','irish potatoes']::text[]),
('13','Sugarcane',ARRAY['sugar cane']::text[]),
('14','Cotton',ARRAY[]::text[]),
('12','Sunflower',ARRAY['sunflowers']::text[]),
('101','Cassava',ARRAY['tapioca']::text[]),
('26','Banana',ARRAY['bananas']::text[]),
('54','Coffee',ARRAY[]::text[]),
('25','Tea',ARRAY[]::text[]),
('56','Cowpea',ARRAY['cowpeas','cow pea','cow peas']::text[]),
('40','French bean',ARRAY['french beans']::text[]),
('62','Kidney bean',ARRAY['kidney beans']::text[]),
('17','Onion',ARRAY['onions']::text[]),
('27','Cauliflower',ARRAY[]::text[]),
('29','Cucumber',ARRAY['cucumbers']::text[]),
('30','Okra',ARRAY[]::text[]),
('23','Chili',ARRAY['chilli','chilies','chillies']::text[]),
('129','Spinach',ARRAY[]::text[]),
('130','Lettuce',ARRAY[]::text[]),
('127','Carrot',ARRAY['carrots']::text[]),
('132','Pumpkin',ARRAY['pumpkins']::text[]),
('139','Watermelon',ARRAY['watermelons']::text[]),
('24','Grape',ARRAY['grapes']::text[]),
('69','Mango',ARRAY['mangoes','mangos']::text[]),
('136','Avocado',ARRAY['avocados']::text[]),
('1','Rice',ARRAY[]::text[]),
('77','Paddy',ARRAY[]::text[]),
('117','Alfalfa',ARRAY['lucerne']::text[]),
('95','Sesame',ARRAY[]::text[]),
('123','Oats',ARRAY[]::text[]);
alter table public.talazo_crop_catalog enable row level security;
create policy crop_catalog_read on public.talazo_crop_catalog for select to authenticated using(talazo_private.admin() or talazo_private.active());
revoke all on public.talazo_crop_catalog from anon,authenticated;
grant select on public.talazo_crop_catalog to authenticated;
grant all on public.talazo_crop_catalog to service_role;
alter table public.talazo_zones add column crop_entered_name text not null default '';
update public.talazo_zones set crop_entered_name=crop_name;
update public.talazo_zones z set crop_name=c.name from public.talazo_crop_catalog c where c.code=z.crop_code;
update public.talazo_zones z set crop_code='999',crop_name='Other' where not exists(select 1 from public.talazo_crop_catalog c where c.code=z.crop_code);
create function talazo_private.standardize_field_crop() returns trigger language plpgsql security definer set search_path='' as $$
declare crop public.talazo_crop_catalog; lookup text;
begin
 new.crop_entered_name:=trim(regexp_replace(new.crop_name,'[[:space:]]+',' ','g'));
 if length(new.crop_entered_name) not between 1 and 120 then raise exception 'Enter a crop name of 1 to 120 characters'; end if;
 lookup:=trim(regexp_replace(lower(new.crop_entered_name),'[^a-z0-9]+',' ','g'));
 select * into crop from public.talazo_crop_catalog c where trim(regexp_replace(lower(c.name),'[^a-z0-9]+',' ','g'))=lookup or lookup=any(c.aliases) order by c.code limit 1;
 new.crop_code:=coalesce(crop.code,'999');new.crop_name:=coalesce(crop.name,'Other');
 return new;
end $$;
revoke all on function talazo_private.standardize_field_crop() from public;
create trigger standardize_field_crop before insert on public.talazo_zones for each row execute function talazo_private.standardize_field_crop();
create function public.talazo_classify_crop(p_zone uuid,p_code text) returns void language plpgsql security definer set search_path='' as $$
declare crop public.talazo_crop_catalog; field public.talazo_zones; lookup text;
begin
 if not talazo_private.admin() then raise exception 'Administrator required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(27112026,5);
 select * into crop from public.talazo_crop_catalog where code=p_code;
 if crop.code is null then raise exception 'Choose a standard crop'; end if;
 select * into field from public.talazo_zones where id=p_zone for update;
 if field.id is null then raise exception 'Field not found'; end if;
 if exists(select 1 from public.talazo_monitoring where zone_id=p_zone and environment='live' and provider_id is not null) and field.crop_code<>p_code then raise exception 'This live field requires provider crop reconciliation before changing its classification'; end if;
 lookup:=trim(regexp_replace(lower(field.crop_entered_name),'[^a-z0-9]+',' ','g'));
 if exists(select 1 from public.talazo_crop_catalog where code<>p_code and (lookup=any(aliases) or trim(regexp_replace(lower(name),'[^a-z0-9]+',' ','g'))=lookup)) then raise exception 'This entered name is already mapped to another crop'; end if;
 update public.talazo_zones set crop_code=crop.code,crop_name=crop.name where id=p_zone;
 if lookup<>'' and not lookup=any(crop.aliases) then update public.talazo_crop_catalog set aliases=array_append(aliases,lookup) where code=p_code; end if;
 update public.talazo_observations set data=jsonb_set(data,'{products}',coalesce(data->'products','{}'::jsonb)-'askJeevnAPI') where monitoring_id in (select id from public.talazo_monitoring where zone_id=p_zone);
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'crop_classified',p_zone::text);
end $$;
revoke all on function public.talazo_classify_crop(uuid,text) from public,anon;
grant execute on function public.talazo_classify_crop(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
