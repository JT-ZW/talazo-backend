import {createHash} from 'node:crypto';
/** Keep field metadata only: provider contact/account details are never copied.
 * @param {any} response @param {string} id @param {string} [fallback] */
export function providerField(response,id,fallback=''){
 const row=response?.[id]||response;
 if(!/^\d+$/.test(id)||!row||String(row.FieldID)!==id)throw Error('Provider field identity is invalid.');
 if(/\{(?:SatelliteVisitDate|RadarVisitDate|FieldID|ImageType)\}/.test(JSON.stringify(row)))throw Error('Provider returned documentation placeholders instead of live field data.');
 const source=row.Coordinates;
 if(!source||typeof source!=='object'||Array.isArray(source))throw Error('Provider boundary is missing.');
 let ring=Object.values(source).map((/** @type {any} */ p)=>{
  if(!p||[p.Longitude,p.Latitude].some(v=>!['number','string'].includes(typeof v)||String(v).trim()===''))throw Error('Provider corner is incomplete.');
  const point=[Number(p.Longitude),Number(p.Latitude)];
  if(!point.every(Number.isFinite)||Math.abs(point[0])>180||Math.abs(point[1])>90)throw Error('Provider corner is outside coordinate limits.');
  return point;
 });
 if(ring.length>1&&ring[0].every((v,i)=>v===ring.at(-1)?.[i]))ring.pop();
 if(ring.length<3||ring.length>500||new Set(ring.map(p=>p.join(','))).size!==ring.length)throw Error('Provider boundary needs 3–500 distinct corners.');
 ring=[...ring,[...ring[0]]];
 const name=String(row.FieldDescription||fallback).trim();
 if(!name||name.length>240||/\{(?:Field|Satellite)/.test(name))throw Error('Provider field name is invalid.');
 const crop=String(row.CropCode||'');if(!/^\d{1,3}$/.test(crop))throw Error('Provider crop code is invalid.');
 let sowing=null;
 if(row.SowingDate!==undefined&&row.SowingDate!==null&&row.SowingDate!==''){
  const raw=String(row.SowingDate);let date;
  if(/^\d{8}$/.test(raw))date=new Date(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6)}T00:00:00Z`);
  else if(/^\d{4}-\d{2}-\d{2}$/.test(raw))date=new Date(raw+'T00:00:00Z');
  else if(/^\d{9,10}$/.test(raw))date=new Date(Number(raw)*1000);
  if(!date||!Number.isFinite(date.getTime())||date.getTime()>Date.now()||date.getUTCFullYear()<1900)throw Error('Provider planting date is invalid.');
  sowing=date.toISOString().slice(0,10);
  if(/^\d{8}$/.test(raw)&&sowing.replaceAll('-','')!==raw||/^\d{4}-\d{2}-\d{2}$/.test(raw)&&sowing!==raw)throw Error('Provider planting date is invalid.');
 }
 const flag=(/** @type {unknown} */ v)=>v===true||v==='yes'||v==='Yes';
 const state=flag(row.Expired)?'expired':flag(row.Paused)?'paused':row.Paused===false||row.Paused==='no'?'active':'unknown';
 const field={provider_id:id,name,boundary:{type:'Polygon',coordinates:[ring]},crop_code:crop,sowing_date:sowing,remote_state:state};
 return {...field,fingerprint:createHash('sha256').update(JSON.stringify(field)).digest('hex')};
}
