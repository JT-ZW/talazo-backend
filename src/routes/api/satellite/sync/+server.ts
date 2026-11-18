import * as env from '$app/env/private';
import {json} from '@sveltejs/kit';
import {createHash,timingSafeEqual} from 'node:crypto';
import {provider,service,syncMonitoring,rpc} from '#lib/server/pilot.ts';
import {reconcileProviderAccount} from '#lib/server/provider-account.ts';
const hash=(v:string)=>createHash('sha256').update(v).digest();
async function run({request,url}:import('@sveltejs/kit').RequestEvent){
 const supplied=request.headers.get('authorization')||'';
 const secrets=[env.SATELLITE_JOB_SECRET,env.CRON_SECRET].filter(Boolean) as string[];
 if(!secrets.some(secret=>timingSafeEqual(hash(supplied),hash('Bearer '+secret))))return json({error:'Unauthorized'},{status:401});
 const kind=url.searchParams.get('kind')||'fields';
 if(!['fields','inventory'].includes(kind))return json({error:'Unsupported job'},{status:400});
 const db=service(),name=kind+':'+provider().environment;
 const lease=await rpc(db,'talazo_claim_job',{p_name:name});
 if(!lease)return json({skipped:true,reason:'A recent or running job already owns this task.'});
 try{
  let summary;
  if(kind==='inventory'){
   const result=await reconcileProviderAccount();
   if(result.failed)throw Error('Inventory refresh incomplete');
   summary={discovered:result.discovered,review:result.review,skipped:result.skipped};
  }else{
   const claim=await rpc(db,'talazo_claim_sync',{p_environment:provider().environment});
   if(claim){
    let success=false;
    try{success=(await syncMonitoring(claim.monitoring)).complete;if(!success)throw Error('Partial provider refresh');}
    finally{await rpc(db,'talazo_finish_sync',{p_monitoring:claim.monitoring,p_lease:claim.lease,p_success:success});}
    summary={updated:1};
   }else summary={updated:0};
  }
  await rpc(db,'talazo_finish_job',{p_name:name,p_lease:lease,p_success:true,p_outcome:'completed'});
  return json({ok:true,...summary});
 }catch{
  await rpc(db,'talazo_finish_job',{p_name:name,p_lease:lease,p_success:false,p_outcome:'Refresh failed; retained saved data. See job health.'}).catch(()=>{});
  return json({error:'Synchronization incomplete; saved data retained. Retry uses field backoff.'},{status:503});
 }
}
export const POST=run;
// Vercel Cron invokes GET with Authorization: Bearer CRON_SECRET.
export const GET=run;
