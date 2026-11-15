import {json} from '@sveltejs/kit';
import {identity,provider} from '$lib/server/pilot';
import {providerProduct} from '$lib/server/products';
import {imageLayers,imageDates} from '$lib/imagery.mjs';
export async function POST(event:import('@sveltejs/kit').RequestEvent){
 if(event.request.headers.get('origin')!==event.url.origin)return json({message:'Same-origin request required.'},{status:403});
 const a=await identity(event);let body;
 try{body=await event.request.json();}catch{return json({message:'Invalid request.'},{status:400});}
 if(!imageLayers.some(([id])=>id===body.layer)||!/^\d{8}$/.test(body.date||''))return json({message:'Choose a supported layer and observation.'},{status:400});
 const m=await a.client.from('talazo_monitoring').select('*').eq('id',String(body.monitoring||'')).single();
 if(!m.data||m.data.status!=='active'||!m.data.provider_id||m.data.environment!==provider().environment)return json({message:'Active field access required.'},{status:403});
 const observation=await a.client.from('talazo_observations').select('data').eq('monitoring_id',m.data.id).single();
 const products=observation.data?.data?.products||{};
 const radar=['rvi','rsm'].includes(body.layer);
 if(!imageDates(products[radar?'getSARDays':'getSensedDays']?.value,radar).includes(body.date))return json({message:'Image date is not available for this field and sensor.'},{status:400});
 const advisoryDate=String(body.advisoryDate||body.date);
 const wantsAdvisory=Boolean(body.advisory)&&imageDates(products.getSensedDays?.value).includes(advisoryDate);
 const results=await Promise.allSettled([providerProduct(a.client,m.data,body.date,'image:'+body.layer),wantsAdvisory?providerProduct(a.client,m.data,advisoryDate,'advisory'):Promise.resolve(null),body.breakdown&&body.layer!=='tci'?providerProduct(a.client,m.data,body.date,'breakdown:'+body.layer):Promise.resolve(null)]);
 const result=(i:number)=>results[i].status==='fulfilled'?(results[i] as PromiseFulfilledResult<any>).value:{state:'error',error:'The provider product could not be loaded.'};
 return json({image:result(0),advisory:result(1),breakdown:result(2),environment:provider().environment,monitoring:m.data.id,date:body.date,layer:body.layer},{headers:{'Cache-Control':'private, no-store'}});
}
