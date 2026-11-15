import {provider,rpc,service} from './pilot';
import type {createSupabase} from './supabase';
import {verifyProviderImage} from './provider-image.mjs';
import {indexDistribution,datedAdvisory} from '../advisory-model.mjs';
type Client=ReturnType<typeof createSupabase>;
export async function providerProduct(client:Client,monitoring:any,date:string,product:string){
 const claim=await rpc(client,'talazo_claim_product',{p_monitoring:monitoring.id,p_product:product,p_date:date});
 if(claim.cached){const row=claim.item;return {state:row.state,value:row.data,error:row.error,fetchedAt:row.refreshed_at,retryAfter:row.retry_after};}
 if(claim.pending)return {state:'pending'};
 const db=service(),p=provider();let value:any;
 try{
  if(product==='advisory'){
   const zone=await client.from('talazo_zones').select('crop_name,crop_code,sowing_date').eq('id',monitoring.zone_id).single();
   if(!zone.data||zone.data.crop_code==='999')throw new Error('Talazo must classify this crop before crop-specific advice is available.');
   const previous=await client.from('talazo_observations').select('data').eq('monitoring_id',monitoring.id).single();
   const existing=previous.data?.data?.products?.askJeevnAPI;
   if(datedAdvisory(existing,date)&&Date.now()-Date.parse(existing.fetchedAt)<6*3600000)value=existing;
   else{
    const result=await p.call('askJeevnAPI',{FieldID:monitoring.provider_id,Crop:zone.data.crop_name,Language:'en',LastSensedDay:date,...(zone.data.sowing_date?{SowingDate:zone.data.sowing_date.replaceAll('-','')}:{})});
    if(!result.advisory||typeof result.advisory!=='object')throw new Error('The provider did not return a structured advisory.');
    if(result.SensedDay&&result.SensedDay!==date)throw new Error('The provider advisory belongs to a different observation date.');
    value={value:result,requestedDate:date,fetchedAt:new Date().toISOString()};
   }
  }else if(product.startsWith('breakdown:')){
   const layer=product.slice(10);
   const result=await p.call('getFieldIndexBreakdown',{FieldID:monitoring.provider_id,SensedDay:date,ImageType:layer});
   if(!indexDistribution(result,layer).length)throw new Error('The provider did not return a usable index area breakdown.');
   value={bins:result,layer,date,sample:p.testing};
  }else{
   const layer=product.slice(6);
   const result=await p.call('getFieldImage',{FieldID:monitoring.provider_id,SensedDay:date,ImageType:layer,ColorMap:'1'});
   const url=result?.url;
   if(typeof url!=='string'||new URL(url).protocol!=='https:')throw new Error('The provider did not return a secure image.');
   await verifyProviderImage(url);
   value={url,layer,date,sample:p.testing};
  }
  const fetchedAt=new Date().toISOString();
  const saved=await db.from('talazo_products').update({state:'ready',data:value,error:null,refreshed_at:fetchedAt,lease_id:null,lease_until:null,retry_after:null}).eq('monitoring_id',monitoring.id).eq('product',product).eq('observed_on',date).eq('lease_id',claim.lease).select('monitoring_id');
  if(saved.error||!saved.data?.length)throw new Error('The product cache changed; reload to retrieve the latest result.');
  return {state:'ready',value,fetchedAt};
 }catch(e){
  const message=e instanceof Error?e.message:'Provider data is unavailable.';
  const retryAfter=new Date(Date.now()+5*60000).toISOString();
  await db.from('talazo_products').update({state:'error',error:message,retry_after:retryAfter,lease_id:null,lease_until:null}).eq('monitoring_id',monitoring.id).eq('product',product).eq('observed_on',date).eq('lease_id',claim.lease);
  return {state:'error',error:message,retryAfter};
 }
}
