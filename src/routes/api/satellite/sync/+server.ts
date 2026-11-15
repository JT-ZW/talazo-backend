import {env} from '$env/dynamic/private';
import {json} from '@sveltejs/kit';
import {createHash,timingSafeEqual} from 'node:crypto';
import {provider,service,syncMonitoring,month} from '$lib/server/pilot';
import {reconcileProviderAccount} from '$lib/server/provider-account';
const hash=(v:string)=>createHash('sha256').update(v).digest();
export async function POST({request}:import('@sveltejs/kit').RequestEvent){
 if(!env.SATELLITE_JOB_SECRET||!timingSafeEqual(hash(request.headers.get('authorization')||''),hash('Bearer '+env.SATELLITE_JOB_SECRET)))return json({error:'Unauthorized'},{status:401});
 const db=service();const p=provider();
 let account;
 try{account=await reconcileProviderAccount();}catch{account={failed:true};}
 const {data,error}=await db.from('talazo_monitoring').select('id,last_sync,zone_id,talazo_zones(talazo_farms(owner_id))').eq('environment',p.environment).in('status',['awaiting','active']).order('last_sync',{ascending:true,nullsFirst:true}).limit(20);
 if(error)return json({error:'Synchronization queue unavailable'},{status:503});
 const allocations=await db.from('talazo_allocations').select('user_id,sqm').eq('period',month());
 let updated=0,failed=0,skipped=0;
 for(const row of data||[]){
  const owner=(row.talazo_zones as any)?.talazo_farms?.owner_id;
  if(!allocations.data?.some(a=>a.user_id===owner&&a.sqm>0)||row.last_sync&&Date.now()-Date.parse(row.last_sync)<6*3600000){skipped++;continue;}
  try{await syncMonitoring(row.id);updated++;}catch{failed++;}
 }
 return json({updated,failed,skipped,account});
}
