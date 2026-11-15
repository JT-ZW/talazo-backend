import {env} from '$env/dynamic/private';
import {createClient} from '@supabase/supabase-js';
import {error,redirect} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import {createSupabase} from './supabase';
import {farmonaut} from './farmonaut.mjs';
import {sensedMap} from '../satellite.mjs';

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
 const {data:m}=await db.from('talazo_monitoring').select('*,talazo_zones(*,talazo_farms(owner_id))').eq('id',id).single();
 if(!m||m.environment!==p.environment||!m.provider_id||!['active','awaiting'].includes(m.status)) throw new Error('Monitoring is not ready in this environment.');
 const {data:a}=await db.from('talazo_accounts').select('status').eq('user_id',m.talazo_zones.talazo_farms.owner_id).single();
 if(!a||a.status==='suspended') throw new Error('Farmer is suspended.');
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
 const stored=await db.from('talazo_observations').upsert({monitoring_id:id,data,fetched_at:new Date().toISOString()});
 if(stored.error) throw new Error('Could not save synchronized observations.');
 const sensed=sensedMap(data.products.getSensedDays?.value);
 const status=Object.keys(sensed).length?'active':'awaiting';
 const updated=await db.from('talazo_monitoring').update({status,last_sync:new Date().toISOString(),error:results.some(r=>r.status==='rejected')?'Some products are unavailable':null}).eq('id',id).in('status',['active','awaiting']);
 if(updated.error) throw new Error('Could not update synchronization status.');
}
