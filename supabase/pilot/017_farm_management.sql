begin;

create function public.talazo_edit_farm(p_farm uuid,p_name text,p_district text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not talazo_private.farm_access(p_farm) then raise exception 'Not permitted'; end if;
 if coalesce(length(trim(p_name)),0) not between 1 and 120 or length(coalesce(p_district,''))>120 then
  raise exception 'Enter a valid farm name and district';
 end if;
 update public.talazo_farms set name=trim(p_name),district=trim(coalesce(p_district,'')) where id=p_farm;
 if not found then raise exception 'Farm not found'; end if;
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'farm_updated',p_farm::text);
end $$;

create function public.talazo_delete_farm(p_farm uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not talazo_private.farm_access(p_farm) then raise exception 'Not permitted'; end if;
 perform 1 from public.talazo_farms where id=p_farm for update;
 if not found then raise exception 'Farm not found'; end if;
 if exists(select 1 from public.talazo_zones where farm_id=p_farm) then raise exception 'Only an empty farm can be deleted'; end if;
 delete from public.talazo_farms where id=p_farm;
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'farm_deleted',p_farm::text);
end $$;

create function public.talazo_edit_zone_notes(p_zone uuid,p_notes text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not talazo_private.zone_access(p_zone) then raise exception 'Not permitted'; end if;
 if length(coalesce(p_notes,''))>2000 then raise exception 'Use up to 2000 characters for field notes'; end if;
 update public.talazo_zones set characteristics=trim(coalesce(p_notes,'')) where id=p_zone;
 if not found then raise exception 'Field not found'; end if;
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'field_notes_updated',p_zone::text);
end $$;

create function public.talazo_delete_zone(p_zone uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not talazo_private.zone_access(p_zone) then raise exception 'Not permitted'; end if;
 perform 1 from public.talazo_zones where id=p_zone for update;
 if not found then raise exception 'Field not found'; end if;
 if exists(select 1 from public.talazo_monitoring where zone_id=p_zone)
 or exists(select 1 from public.talazo_field_activities where zone_id=p_zone) then
  raise exception 'Fields with monitoring or activity history cannot be deleted';
 end if;
 delete from public.talazo_zones where id=p_zone;
 insert into public.talazo_events(actor,action,resource) values(auth.uid(),'field_deleted',p_zone::text);
end $$;

revoke all on function public.talazo_edit_farm(uuid,text,text),public.talazo_delete_farm(uuid),public.talazo_delete_zone(uuid),public.talazo_edit_zone_notes(uuid,text) from public,anon;
grant execute on function public.talazo_edit_farm(uuid,text,text),public.talazo_delete_farm(uuid),public.talazo_delete_zone(uuid),public.talazo_edit_zone_notes(uuid,text) to authenticated;
commit;
