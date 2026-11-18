import {json} from '@sveltejs/kit';import {identity,provider} from '#lib/server/pilot.ts';import {providerProduct} from '#lib/server/products.ts';import {imageLayers} from '#lib/imagery.mjs';
export async function POST(event:import('@sveltejs/kit').RequestEvent){
 if(event.request.headers.get('origin')!==event.url.origin)return json({error:'Same-origin request required.'},{status:403});
 const a=await identity(event);let body;
 try{body=await event.request.json();}catch{return json({error:'Invalid request'},{status:400});}
 if(!imageLayers.some(([id])=>id===body.layer)||!/^\d{8}$/.test(body.date||''))return json({error:'Choose an available layer/date.'},{status:400});
 const result=await a.client.from('talazo_monitoring').select('*').eq('id',String(body.monitoring||'')).single();
 if(!result.data||result.data.environment!==provider().environment||result.data.status!=='active')return json({error:'Active field access required.'},{status:403});
 try{return json(await providerProduct(a.client,result.data,body.date,'overlay:'+body.layer));}catch{return json({error:'Overlay cannot be loaded for this field/date.'},{status:400});}
}
