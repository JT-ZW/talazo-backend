import {json} from '@sveltejs/kit';
import {identity,provider,rpc,syncMonitoring} from '#lib/server/pilot.ts';
export async function POST(event:import('@sveltejs/kit').RequestEvent){
 if(event.request.headers.get('origin')!==event.url.origin)return json({message:'Same-origin request required.'},{status:403});
 const a=await identity(event);
 try{
  const body=await event.request.json();
  const m=await a.client.from('talazo_monitoring').select('id,environment').eq('id',String(body.monitoring||'')).single();
  if(!m.data||m.data.environment!==provider().environment)return json({message:'Field access required.'},{status:403});
  const claimed=await rpc(a.client,'talazo_claim_refresh',{p_monitoring:m.data.id});
  if(claimed)await syncMonitoring(m.data.id);
  return json({refreshed:claimed});
 }catch{return json({message:'Observations could not be refreshed. Please retry later.'},{status:503});}
}
