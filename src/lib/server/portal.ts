import {fail,redirect,error} from '@sveltejs/kit';
import type {RequestEvent} from '@sveltejs/kit';
import {env} from '$env/dynamic/private';
import {env as publicEnv} from '$env/dynamic/public';
import {identity,rpc,hectares,month,service,origin,provider,syncMonitoring,safeMessage} from './pilot';
import {sensedMap} from '../satellite.mjs';
import {weatherPoint,weatherDays} from '../weather.mjs';
import {standardCrop} from '../crops.mjs';
import {insightPages,activeInsightZoneIds} from '../insight-pages.mjs';
import {matchesRegisteredBoundary,farmonaut} from './farmonaut.mjs';
import {checkLiveConnection,findRegisteredField,fieldDetails} from './live-connection.mjs';
import {imageDates,imageLayers} from '../imagery.mjs';
import {providerProduct} from './products';
import {createSupabase} from './supabase';
import {monitoringConfirmed} from './monitoring-confirmation.mjs';

// Fetch successive RLS-scoped pages in stable primary-key order. A silent
// 500-row limit made portfolio totals and admin queues incomplete at scale.
async function rows(client:ReturnType<typeof createSupabase>,table:string,keys=['id']){
 const all:any[]=[];
 for(let offset=0;offset<50000;offset+=500){
  let query=client.from(table).select('*');for(const key of keys)query=query.order(key);
  const result=await query.range(offset,offset+499);
  if(result.error)error(503,'Farm data could not be loaded. Please retry or contact Talazo.');
  all.push(...(result.data||[]));if((result.data||[]).length<500)return all;
 }
 error(503,'This workspace needs a paginated portfolio view. Please contact Talazo.');
}

export async function loadPortal(event:RequestEvent,admin=false) {
 const auth=await identity(event,admin);
 const allowed=admin?['overview','users','quota','requests','operations','crops']:['overview','farms','satellite','weather','analysis','account',...insightPages.map(([id])=>id)];
 if(!allowed.includes(event.params.section||'')) error(404,'Page not found');
 const queries=['talazo_farms','talazo_zones','talazo_monitoring','talazo_observations','talazo_periods','talazo_allocations','talazo_weather','talazo_field_activities','talazo_crop_catalog'];
 const keys:Record<string,string[]>={talazo_observations:['monitoring_id'],talazo_periods:['period'],talazo_allocations:['period','user_id'],talazo_weather:['zone_id','environment'],talazo_crop_catalog:['code']};
 const results=await Promise.all(queries.map(t=>rows(auth.client,t,keys[t]||['id'])));
 const tables=Object.fromEntries(queries.map((t,i)=>[t,results[i]]));
 const users=auth.isAdmin?await rows(auth.client,'talazo_accounts',['user_id']):[];
 const events=admin?await auth.client.from('talazo_events').select('*').order('created_at',{ascending:false}).limit(30):null;
 const insightZoneIds=activeInsightZoneIds(tables.talazo_farms,tables.talazo_zones,tables.talazo_monitoring,provider().environment);
 return {admin,isAdmin:auth.isAdmin,section:event.params.section,name:auth.account?.name||'Talazo administrator',userId:auth.user.id,insightZoneIds,
  tables,users,events:events?.data||[],period:month(),environment:provider().environment,initialZone:event.url.searchParams.get('field')||'',
  liveRegistrationIssue:tables.talazo_monitoring.some((m:any)=>m.environment==='live'&&m.status==='uncertain'),
  emailReady:Boolean(env.RESEND_API_KEY&&env.INVITATION_FROM),providerConfigured:Boolean(env.FARMONAUT_API_KEY),mapsConfigured:Boolean(publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY)};
}
async function sendInvitation(email:string,link:string,name:string) {
 if(!env.RESEND_API_KEY||!env.INVITATION_FROM) throw new Error('Email delivery is not configured. Use the generated access link.');
 const response=await fetch('https://api.resend.com/emails',{
  method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},
  body:JSON.stringify({from:env.INVITATION_FROM,to:[email],subject:'Your Talazo farm dashboard is ready',text:`Hello ${name},\n\nYour Talazo account has been approved. Activate your account and set your password:\n${link}\n\nYou can then set up your farm and request satellite monitoring. If the link expires, contact Talazo for a new one.`}),signal:AbortSignal.timeout(20000)
 });
 if(!response.ok) throw new Error('Email delivery failed. The account remains approved; generate a new link to retry.');
}
/** Form actions remain server-side, use SvelteKit same-origin checks, and never trust a submitted provider ID. */
export const portalActions={
 connection:async(event:RequestEvent)=>{
  await identity(event,true);
  const checks=await checkLiveConnection(farmonaut({key:env.FARMONAUT_API_KEY||'',testMode:'false'}));
  const result={message:checks.every(c=>c.ok)?'Production account and field-list requests succeeded. Field imagery still requires a verified mapping and observation date.':'Production connection has an issue. Review the endpoint results below.',connectionChecks:checks,connectionCheckedAt:new Date().toISOString()};
  return checks.every(c=>c.ok)?result:fail(503,result);
 },
 discover:async(event:RequestEvent)=>{
  const a=await identity(event,true);const f=await event.request.formData();
  try{
   const id=String(f.get('monitoring')||'');
   const record=await a.client.from('talazo_monitoring').select('*,talazo_zones(id,boundary)').eq('id',id).single();
   if(!record.data||record.data.environment!=='live'||record.data.status!=='uncertain')throw new Error('Only uncertain live registrations can be reconciled here.');
   const providerId=await findRegisteredField(farmonaut({key:env.FARMONAUT_API_KEY||'',testMode:'false'}),record.data.talazo_zones as any);
   const saved=await service().from('talazo_monitoring').update({provider_id:providerId,status:'awaiting',error:null}).eq('id',id).eq('status','uncertain').select('id');
   if(saved.error||!saved.data?.length)throw new Error('The mapping changed. Reload before reconciling.');
   await service().from('talazo_events').insert({actor:a.user.id,action:'live_field_reconciled',resource:id});
   if(provider().environment==='live')await syncMonitoring(id);
   return {message:'Existing Farmonaut field verified and connected. No duplicate registration was submitted.'};
  }catch(e){return fail(400,{message:safeMessage(e)});}
 },
 details:async(event:RequestEvent)=>{
  const a=await identity(event,true);const f=await event.request.formData();
  try{
   const id=String(f.get('monitoring')||'');const p=provider();
   const record=await a.client.from('talazo_monitoring').select('*,talazo_zones(id,name,boundary,talazo_farms(name,district))').eq('id',id).single();
   const m=record.data;const z=m?.talazo_zones as any;
   if(!m?.provider_id||m.environment!==p.environment||!['active','awaiting'].includes(m.status))throw new Error('A connected field is required.');
   if(p.testing)throw new Error('Sample fields cannot change Farmonaut account details.');
   const metadata=await p.call('getFarmerData',{FieldID:m.provider_id});
   if(!matchesRegisteredBoundary(metadata,m.provider_id,z.boundary.coordinates[0].slice(0,-1)))throw new Error('The provider boundary could not be verified. No details were changed.');
   const result=await p.call('change_field_data',{FieldID:m.provider_id,...fieldDetails(z,z.talazo_farms)});
   if(result?.data!=='changed successfully')throw new Error('Farmonaut did not confirm the details update. Check your account before retrying.');
   await service().from('talazo_events').insert({actor:a.user.id,action:'provider_details_updated',resource:id});
   return {message:'Farm and field name and district synchronized to Farmonaut.'};
  }catch(e){return fail(400,{message:safeMessage(e)});}
 },
 signout:async(event:RequestEvent)=>{await createSupabase(event.cookies).auth.signOut();redirect(303,'/login');},
 quota:async(event:RequestEvent)=>{
  const a=await identity(event,true);const f=await event.request.formData();
  try{await rpc(a.client,'talazo_set_quota',{p_period:String(f.get('period'))+'-01',p_sqm:hectares(f.get('hectares'))});return {message:'Monthly quota saved.'};}catch(e){return fail(400,{message:safeMessage(e)});}
 },
 allocation:async(event:RequestEvent)=>{
  const a=await identity(event,true);const f=await event.request.formData();
  try{await rpc(a.client,'talazo_allocate',{p_period:String(f.get('period'))+'-01',p_user:f.get('user'),p_sqm:hectares(f.get('hectares'))});return {message:'Farmer allocation saved.'};}catch(e){return fail(400,{message:safeMessage(e)});}
 },
 invite:async(event:RequestEvent)=>{
  const a=await identity(event,true);const f=await event.request.formData();
  const email=String(f.get('email')||'').trim().toLowerCase();const name=String(f.get('name')||'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name||name.length>120)return fail(400,{message:'Enter a valid email and farmer name.'});
  try{
   const db=service();
   const existing=await a.client.from('talazo_accounts').select('user_id,status').eq('email',email).maybeSingle();
   if(existing.error) throw new Error('Could not check existing approvals.');
   if(existing.data?.status==='suspended')throw new Error('Reactivate this farmer before creating a new access link.');
   if(f.get('delivery')==='supabase'){
    if(existing.data){
     const sent=await db.auth.resetPasswordForEmail(email,{redirectTo:origin()+'/auth/landing'});
     if(sent.error)throw new Error('Supabase could not send the access email. Check email delivery settings and rate limits.');
    }else{
     const sent=await db.auth.admin.inviteUserByEmail(email,{redirectTo:origin()+'/auth/landing',data:{display_name:name}});
     if(sent.error||!sent.data.user)throw new Error('Invitation could not be sent. Check Supabase email delivery or generate a private access link instead.');
     await rpc(a.client,'talazo_approve',{p_user:sent.data.user.id,p_email:email,p_name:name});
    }
    return {message:'Access email requested through Supabase. Delivery depends on your configured email service; the farmer must activate their account.'};
   }
   const type=existing.data?'magiclink':'invite';
   const generated=await db.auth.admin.generateLink({type,email,options:{redirectTo:origin()+'/activate'}});
   if(generated.error||!generated.data?.user||!generated.data.properties?.hashed_token)throw new Error('Could not generate the invitation. Check the identity in Supabase and retry.');
   await rpc(a.client,'talazo_approve',{p_user:generated.data.user.id,p_email:email,p_name:name});
   const link=origin()+'/auth/confirm?token_hash='+encodeURIComponent(generated.data.properties.hashed_token)+'&type='+type;
   if(f.get('delivery')==='email')await sendInvitation(email,link,name);
   return {message:f.get('delivery')==='email'?'Farmer approved and invitation sent.':'Farmer approved. Share this private, single-use access link with the farmer.',invitation:f.get('delivery')==='email'?null:link};
  }catch(e){return fail(400,{message:safeMessage(e)});}
 },
 status:async(event:RequestEvent)=>{
  const a=await identity(event,true);const f=await event.request.formData();
  try{await rpc(a.client,'talazo_account_status',{p_user:f.get('user'),p_status:f.get('status')});return {message:'Account status updated.'};}catch(e){return fail(400,{message:safeMessage(e)});}
 },
 farm:async(event:RequestEvent)=>{
  const a=await identity(event);const f=await event.request.formData();
  try{
   const owner=a.isAdmin?String(f.get('owner')||a.user.id):a.user.id;
   if(a.isAdmin&&owner===a.user.id&&!a.account)await rpc(a.client,'talazo_approve',{p_user:a.user.id,p_email:a.user.email,p_name:'Talazo administrator'});
   const farmId=await rpc(a.client,'talazo_add_farm',{p_owner:owner,p_name:String(f.get('name')||''),p_district:String(f.get('district')||'')});return {message:'Farm saved. Add its first field below.',savedFarm:farmId};
  }catch(e){return fail(400,{message:safeMessage(e)});}
 },
 zone:async(event:RequestEvent)=>{
  const a=await identity(event);const f=await event.request.formData();
  try{
   const boundary=JSON.parse(String(f.get('boundary')||''));
   if(JSON.stringify(boundary).length>50000)throw new Error('Boundary is too complex.');
   const crop=standardCrop(f.get('crop_name'));
   const id=await rpc(a.client,'talazo_add_zone',{p_farm:f.get('farm'),p_name:String(f.get('name')||''),p_boundary:boundary,p_crop:crop.code,p_crop_name:crop.entered,p_sowing:f.get('sowing')||null,p_notes:String(f.get('notes')||'')});
   const field=await a.client.from('talazo_zones').select('area_sqm,crop_code,talazo_farms(owner_id)').eq('id',id).single();
   const owner=(field.data?.talazo_farms as any)?.owner_id;
   const allowance=await a.client.from('talazo_allocations').select('sqm').eq('user_id',owner).eq('period',month()).maybeSingle();
   const farms=await a.client.from('talazo_farms').select('id').eq('owner_id',owner);
   const areas=await a.client.from('talazo_zones').select('area_sqm').in('farm_id',(farms.data||[]).map(f=>f.id));
   const total=(areas.data||[]).reduce((sum,z)=>sum+Number(z.area_sqm),0);
   const warning=total>Number(allowance.data?.sqm||0)?' Your total mapped land exceeds this farmer’s monitoring allocation. Additional hectares need Talazo approval before all fields can be monitored.':'';
   return {message:`Field saved: ${(Number(field.data?.area_sqm)/10000).toFixed(4)} ha.${warning}${field.data?.crop_code==='999'?' The crop name was saved for administrator classification.':''}`};
  }catch(e){return fail(400,{message:e instanceof SyntaxError?'Draw a boundary or enter valid GeoJSON.':safeMessage(e)});}
 },
 classify:async(event:RequestEvent)=>{
  const a=await identity(event,true);const f=await event.request.formData();
  try{await rpc(a.client,'talazo_classify_crop',{p_zone:f.get('zone'),p_code:f.get('code')});return {message:'Crop standardized. The farmer’s original wording is preserved.'};}
  catch(e){return fail(400,{message:safeMessage(e)});}
 },
 reconcile:async(event:RequestEvent)=>{
  const a=await identity(event,true);const f=await event.request.formData();
  try{
   const id=String(f.get('monitoring')||''),providerId=String(f.get('provider_id')||'').trim();
   if(!/^[A-Za-z0-9_-]{1,120}$/.test(providerId))throw new Error('Enter the field ID from your Farmonaut account.');
   const record=await a.client.from('talazo_monitoring').select('*,talazo_zones(boundary)').eq('id',id).single();
   if(!record.data||record.data.environment!=='live'||record.data.status!=='uncertain')throw new Error('Only uncertain live registrations can be reconciled here.');
   const p=farmonaut({key:env.FARMONAUT_API_KEY||'',testMode:'false'});
   const metadata=await p.call('getFarmerData',{FieldID:providerId});
   if(!matchesRegisteredBoundary(metadata,providerId,(record.data.talazo_zones as any).boundary.coordinates[0].slice(0,-1)))throw new Error('Farmonaut did not confirm that this ID matches the saved boundary. No mapping was changed.');
   const saved=await service().from('talazo_monitoring').update({provider_id:providerId,status:'awaiting',error:null}).eq('id',id).eq('status','uncertain').select('id');
   if(saved.error||!saved.data?.length)throw new Error('The mapping could not be saved. It may already be assigned or its status changed.');
   if(provider().environment==='live')await syncMonitoring(id);
   return {message:provider().environment==='live'?'Live field verified and synchronization started.':'Live field verified. Set FARMONAUT_TEST_MODE=false in the server configuration to use live monitoring.'};
  }catch(e){return fail(400,{message:safeMessage(e)});}
 },
 request:async(event:RequestEvent)=>{
  const a=await identity(event);const f=await event.request.formData();
  try{await rpc(a.client,'talazo_request',{p_zone:f.get('zone'),p_environment:provider().environment});return {message:'Monitoring requested. Talazo will review your allocation.'};}catch(e){return fail(400,{message:safeMessage(e)});}
 },
 weather:async(event:RequestEvent)=>{
  const a=await identity(event);const f=await event.request.formData();
  try{
   const zone=await a.client.from('talazo_zones').select('id,boundary').eq('id',String(f.get('zone'))).single();
   if(!zone.data)throw new Error('Field access required.');
   const p=provider();
   const cached=await a.client.from('talazo_weather').select('fetched_at').eq('zone_id',zone.data.id).eq('environment',p.environment).maybeSingle();
   if(cached.data&&Date.now()-Date.parse(cached.data.fetched_at)<15*60*1000)return {message:'Using the forecast retrieved in the last 15 minutes.'};
   const value=await p.call('getForecastWeatherFromLatLong',{...weatherPoint(zone.data.boundary),DataFormat:'normal'});
   if(!weatherDays(value).length)throw new Error('The provider did not return a usable daily forecast.');
   const saved=await service().from('talazo_weather').upsert({zone_id:zone.data.id,environment:p.environment,data:value,fetched_at:new Date().toISOString()});
   if(saved.error)throw new Error('Could not save the forecast.');
   return {message:p.testing?'Sample forecast loaded. It is not the weather at your field.':'Field forecast updated.'};
  }catch(e){return fail(400,{message:safeMessage(e)});}
 },
 activity:async(event:RequestEvent)=>{
  const a=await identity(event);const f=await event.request.formData();
  try{await rpc(a.client,'talazo_log_activity',{p_zone:f.get('zone'),p_date:f.get('date'),p_kind:f.get('kind'),p_notes:String(f.get('notes')||''),p_batch:String(f.get('batch')||'')});return {message:'Field activity recorded in your traceability register.'};}
  catch(e){return fail(400,{message:safeMessage(e)});}
 },
 register:async(event:RequestEvent)=>{
  const a=await identity(event,true);const f=await event.request.formData();const id=String(f.get('monitoring'));
  try{
   const p=provider();
   if(!env.FARMONAUT_API_KEY)throw new Error('Configure the Farmonaut key first.');
   const db=service();
   const current=await a.client.from('talazo_monitoring').select('environment').eq('id',id).single();
   if(!current.data||current.data.environment!==p.environment)throw new Error('Request does not match the configured environment.');
   const claimed=await rpc(a.client,'talazo_claim',{p_id:id,p_period:month()});
   const z=claimed.zone;
   let value;let candidateId:string|undefined;
   try{
    const ring=z.boundary.coordinates[0];
    // Farmonaut test creation returns placeholder text, not a FieldID. Test reads
    // accept a sample ID; it is never a real mapping and cannot enter live mode.
    if(p.testing)value={FieldID:'1'};
    else if(claimed.monitoring.status==='paused'&&claimed.monitoring.provider_id){
     const resumed=await p.call('resumeFieldMonitoring',{FieldID:claimed.monitoring.provider_id});
     if(!monitoringConfirmed(resumed,'resumed'))throw new Error('Resume confirmation requires reconciliation.');
     value={FieldID:claimed.monitoring.provider_id};
    }else{
     const farm=await a.client.from('talazo_farms').select('name,district').eq('id',z.farm_id).single();
     if(farm.error||!farm.data)throw new Error('Farm details could not be loaded.');
     value=await p.call('submitField',{CropCode:z.crop_code,FieldName:fieldDetails(z,farm.data).FieldDescription,Points:ring.slice(0,-1),...(z.sowing_date?{SowingDate:String(Math.floor(Date.parse(z.sowing_date+'T00:00:00Z')/1000))}:{})});
    }
    if(!value?.FieldID)throw new Error('Registration response needs reconciliation.');
    candidateId=String(value.FieldID);
    if(!p.testing){
     const verified=await p.call('getFarmerData',{FieldID:candidateId});
     if(!matchesRegisteredBoundary(verified,candidateId,ring.slice(0,-1)))throw new Error('Provider did not confirm the registered boundary.');
    }
    const saved=await db.from('talazo_monitoring').update({provider_id:String(value.FieldID),status:'awaiting'}).eq('id',id);
    if(saved.error)throw new Error('Registration storage needs reconciliation.');
   }catch{
    await db.from('talazo_monitoring').update({status:'uncertain',...(candidateId?{provider_id:candidateId}:{}),error:'Registration needs administrator reconciliation. The provider must confirm the field identifier and boundary. Do not resubmit blindly.'}).eq('id',id);
    throw new Error('Registration is uncertain. Capacity stays reserved until reconciled.');
   }
   await syncMonitoring(id);
   return {message:p.testing?'Sample preview enabled. No field was registered with Farmonaut. All observations are samples.':'Field registered and synchronization started.'};
  }catch(e){return fail(400,{message:safeMessage(e)});}
 },
 sync:async(event:RequestEvent)=>{
  const a=await identity(event,true);const f=await event.request.formData();const id=String(f.get('monitoring'));
  try{
   const row=await a.client.from('talazo_monitoring').select('last_sync').eq('id',id).single();
   if(row.data?.last_sync&&Date.now()-Date.parse(row.data.last_sync)<60000)throw new Error('Wait one minute before refreshing again.');
   await syncMonitoring(id);return {message:'Observations refreshed.'};
  }catch(e){return fail(400,{message:safeMessage(e)});}
 },
 pause:async(event:RequestEvent)=>{
  const a=await identity(event,true);const f=await event.request.formData();const id=String(f.get('monitoring'));
  try{
   const p=provider();const db=service();
   const row=await a.client.from('talazo_monitoring').select('*').eq('id',id).single();
   if(!row.data||row.data.environment!==p.environment||!['active','awaiting'].includes(row.data.status))throw new Error('This monitoring record cannot be paused.');
   if(!p.testing){
    const result=await p.call('pauseFieldMonitoring',{FieldID:row.data.provider_id});
    if(!monitoringConfirmed(result,'paused'))throw new Error('Pause confirmation needs reconciliation; capacity has not been released.');
   }
   const saved=await db.from('talazo_monitoring').update({status:'paused'}).eq('id',id).in('status',['active','awaiting']).select('id');
   if(saved.error||!saved.data?.length)throw new Error('Pause state changed. Please review before changing allocations.');
   await db.from('talazo_events').insert({actor:a.user.id,action:'monitoring_paused',resource:id});
   return {message:'Monitoring paused. You may now reduce the farmer allocation if no other committed fields require it.'};
  }catch(e){return fail(400,{message:safeMessage(e)});}
 },
 report:async(event:RequestEvent)=>{
  const a=await identity(event);const f=await event.request.formData();
  try{
   const p=provider();const id=String(f.get('monitoring'));const date=String(f.get('date'));const kind=String(f.get('kind'));
   const record=await a.client.from('talazo_monitoring').select('*').eq('id',id).single();
   if(!record.data?.provider_id||record.data.environment!==p.environment||record.data.status!=='active')throw new Error('Active monitoring is required for reports.');
   const obs=await a.client.from('talazo_observations').select('data').eq('monitoring_id',id).single();
   const endpoint=kind==='pdf'?'getFieldReport':kind==='image'?'getFieldImage':kind==='geotiff'?'generate_geotif_file':kind==='advisory'?'getAdvisoryReport':kind==='recommendations'?'askJeevnAPI':null;
   if(!endpoint)throw new Error('Unsupported report.');
   const layer=String(f.get('layer')||'ndvi');if(!imageLayers.some(([id])=>id===layer))throw new Error('Unsupported layer.');
   const radar=['image','geotiff'].includes(kind)&&['rvi','rsm'].includes(layer);
   const days=imageDates(obs.data?.data?.products?.[radar?'getSARDays':'getSensedDays']?.value,radar);
   if(!/^\d{8}$/.test(date)||!days.includes(date))throw new Error('Choose an available observation date for this sensor.');
   if(kind==='image'||kind==='recommendations'){
    const output=await providerProduct(a.client,record.data,date,kind==='image'?'image:'+layer:'advisory');
    if(output.state!=='ready')throw new Error(output.error||'This product is processing. Please retry shortly.');
    return {message:'Provider output retrieved for the selected observation.',assetMonitoring:id,assetDate:date,...(kind==='image'?{asset:output.value.url,assetKind:kind}:{recommendations:output.value.value.advisory})};
   }
   const value=await p.call(endpoint,kind==='advisory'?{Fields:{[record.data.provider_id]:[date]}}:{FieldID:record.data.provider_id,SensedDay:date,Language:'en',ImageType:layer});
   const link=value?.url||value?.URL||value?.jeevnAiReporturl;
   if(typeof link!=='string'||new URL(link).protocol!=='https:')throw new Error('Provider did not return a secure asset link.');
   return {message:p.testing?'Sample output generated.':'Your report is ready.',asset:link,assetKind:kind,assetMonitoring:id,assetDate:date};
  }catch(e){return fail(400,{message:safeMessage(e)});}
 }
};
