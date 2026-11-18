import {error} from '@sveltejs/kit';import {identity,provider} from '#lib/server/pilot.ts';import {csv} from '#lib/csv.mjs';import {imageDates} from '#lib/imagery.mjs';import {normalizeIndex} from '#lib/server/farmonaut.mjs';
export async function GET(event:import('@sveltejs/kit').RequestEvent){
 const a=await identity(event);const id=event.url.searchParams.get('monitoring')||'';
 const result=await a.client.from('talazo_monitoring').select('id,environment,zone_id').eq('id',id).single();const m=result.data;
 if(!m||m.environment!==provider().environment)error(403,'Field access required.');
 const zone=await a.client.from('talazo_zones').select('name,crop_name').eq('id',m.zone_id).single();
 const observation=await a.client.from('talazo_observations').select('data').eq('monitoring_id',m.id).single();
 if(!zone.data||!observation.data)error(404,'No saved observations to export.');
 const p=observation.data.data.products||{},rows:unknown[][]=[['field','crop','observation_date','index','clipped_index_0_to_1','source','retrieved_at','environment']];
 for(const [index,values] of Object.entries(p.getAllIndexValues?.value||{})){
  const dates=imageDates(p[['rvi','rsm'].includes(index)?'getSARDays':'getSensedDays']?.value,['rvi','rsm'].includes(index));
  if(!values||typeof values!=='object')continue;
  for(const [date,value] of Object.entries(values)){const normalized=normalizeIndex(value);if(!dates.includes(date)||normalized===null)continue;rows.push([zone.data.name,zone.data.crop_name,date,index,normalized,'Farmonaut',p.getAllIndexValues.fetchedAt,m.environment]);}
 }
 return new Response('\uFEFF'+csv(rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="talazo-field-observations.csv"','Cache-Control':'private, no-store'}});
}
