import * as env from '$app/env/private';
import {createClient} from '@supabase/supabase-js';
import {error,redirect} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import {createSupabase} from './supabase';
import {farmonaut} from './farmonaut.mjs';
import {sensedMap} from '../satellite.mjs';
import {ndviDrop} from '../alerts.mjs';

export const provider=()=>farmonaut({key:env.FARMONAUT_API_KEY||'',testMode:env.FARMONAUT_TEST_MODE||'true'});
export function service() {
 const url=env.SUPABASE_URL; const key=env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SECRET_KEY;
 if(!url||!key) error(503,'Supabase server credentials are not configured.');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export const month=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Harare',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7)+'-01';
export function hectares(value:FormDataEntryValue|null) {
 const text=String(value??'');
 if(!/^\d+(\.\d{1,4})?$/.test(text)) throw new Error('Enter hectares with up to four decimal places.');
 const sqm=Math.round(Number(text)*10000);
 if(!Number.isSafeInteger(sqm)||sqm>100000000000) throw new Error('Hectare amount is too large.');
 return sqm;
}
export async function identity(event:RequestEvent,admin=false) {
 const client=createSupabase(event.cookies);
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user) redirect(303,'/login');
 const role=await client.rpc('talazo_is_admin');
 if(role.error) error(503,'The satellite database migration has not been installed or is unavailable.');
 const isAdmin=role.data===true;
 const account=await client.from('talazo_accounts').select('*').eq('user_id',user.id).maybeSingle();
 if(admin&&!isAdmin) error(403,'Administrator access required.');
 if(!isAdmin&&(!account.data||account.data.status==='suspended')) error(403,'Your account needs Talazo approval. Please contact your administrator.');
 return {client,user,isAdmin,account:account.data};
}
export async function rpc(client:ReturnType<typeof createSupabase>,name:string,args:Record<string,unknown>) {
 const result=await client.rpc(name,args);
 if(result.error) throw new Error(result.error.message);
 return result.data;
}
export function safeMessage(e:unknown) {return e instanceof Error?e.message:'The operation could not be completed.';}
export function origin() {
 const base=env.ORIGIN||'http://127.0.0.1:5174';
 const url=new URL(base);
 if(!['http:','https:'].includes(url.protocol)) throw new Error('Configure a valid application ORIGIN.');
 return url.origin;
}
/** No implicit credentials or user input are forwarded to provider operations. */
export async function syncMonitoring(id:string) {
 const db=service(); const p=provider();
 let {data:m}=await db.from('talazo_monitoring').select('*,talazo_zones(*,talazo_farms(owner_id))').eq('id',id).single();
 if(!m||m.environment!==p.environment||!m.provider_id||!['active','awaiting'].includes(m.status)) throw new Error('Monitoring is not ready in this environment.');
 const {data:a}=await db.from('talazo_accounts').select('status').eq('user_id',m.talazo_zones.talazo_farms.owner_id).single();
 if(!a||a.status==='suspended') throw new Error('Farmer is suspended.');
 if(!p.testing){
  const {reconcileMappedField}=await import('./provider-account');
  await reconcileMappedField(m.provider_id);
  const current=await db.from('talazo_monitoring').select('*,talazo_zones(*,talazo_farms(owner_id))').eq('id',id).single();
  m=current.data;
  if(!m||!['active','awaiting'].includes(m.status))throw new Error('Provider monitoring or boundary needs administrator review.');
 }
 const bodies={FieldID:m.provider_id};
 const names=['getSensedDays','getSARDays','getAllIndexValues','getPresentWeather','getForecastWeather'] as const;
 const results=await Promise.allSettled(names.map(n=>p.call(n,bodies)));
 if(results.every(r=>r.status==='rejected'))throw new Error('Farmonaut is unavailable. Previous observations have been retained; try again later.');
 const previous=await db.from('talazo_observations').select('data').eq('monitoring_id',id).maybeSingle();
 const data={...(previous.data?.data||{}),sample:p.testing,products:{...(previous.data?.data?.products||{})},errors:{}} as Record<string,any>;
 for(let i=0;i<names.length;i++) {
  const r=results[i];
  if(r.status==='fulfilled') data.products[names[i]]={value:r.value,fetchedAt:new Date().toISOString()};
  else data.errors[names[i]]='Temporarily unavailable';
 }
 const sensed=sensedMap(data.products.getSensedDays?.value);
 const status=Object.keys(sensed).length?'active':'awaiting';
 await rpc(db,'talazo_commit_observations',{p_monitoring:id,p_setup:{boundary:m.talazo_zones.boundary,crop:m.talazo_zones.crop_code,sowing:m.talazo_zones.sowing_date},p_data:data,p_status:status,p_error:results.some(r=>r.status==='rejected')?'Some products are unavailable':null});
 const preference=await db.from('talazo_alert_preferences').select('enabled,ndvi_drop').eq('user_id',m.talazo_zones.talazo_farms.owner_id).maybeSingle();
 if(preference.error)throw Error('Alert preferences could not be checked.');
 if(preference.data?.enabled&&results[0].status==='fulfilled'&&results[2].status==='fulfilled'){
  const alert=ndviDrop(data.products,Number(preference.data.ndvi_drop));
  if(alert){const saved=await db.from('talazo_alerts').upsert({monitoring_id:id,observed_on:alert.date,rule:'ndvi_drop',data:alert},{onConflict:'monitoring_id,observed_on,rule',ignoreDuplicates:true});if(saved.error)throw Error('Field alert could not be retained.');}
 }
 const dates=Object.keys(sensed).filter(d=>/^\d{8}$/.test(d)).map(d=>d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6));
 if(dates.length){const saved=await db.from('talazo_history_requests').update({state:'available'}).eq('monitoring_id',id).in('requested_on',dates).neq('state','available');if(saved.error)throw Error('History status could not be updated.');}
 return {complete:results.every(r=>r.status==='fulfilled')};
}
