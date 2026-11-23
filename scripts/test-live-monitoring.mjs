// Disposable identity; no real administrator session changes, emails or paid field writes.
import {georasterOverlay,readProviderRaster} from '../src/lib/server/georaster.mjs';
import {imageDates} from '../src/lib/imagery.mjs';
import {createClient} from '@supabase/supabase-js';import pg from 'pg';import {parse} from 'devalue';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
const origin=new URL(process.env.ORIGIN||'http://127.0.0.1:5174').origin;
if(process.env.FARMONAUT_TEST_MODE!=='false')throw Error('Live checks require live mode.');
const auth=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});let identity;const jar=new Map();
const cookies=()=>[...jar].map(([k,v])=>k+'='+v).join('; ');
async function verifyReports(monitoring,date,boundary){
 const reports=[];
 for(const kind of ['pdf','advisory','geotiff']){
  let stage='generate';
  try{
   const form=new URLSearchParams({monitoring,date,kind,layer:'ndvi'});
   const response=await fetch(origin+'/portal/analysis?/report',{method:'POST',body:form,headers:{Origin:origin,Cookie:cookies(),Accept:'application/json'},signal:AbortSignal.timeout(120000)});
   const action=await response.json(),payload=action.data?parse(action.data):{};
   if(action.type!=='success'||typeof payload.asset!=='string')throw Error(payload.message||'The report action did not return an asset.');
   stage='download';
   if(kind==='geotiff'){
    const bytes=await readProviderRaster(payload.asset);
    stage='alignment';
    const raster=await georasterOverlay(bytes,boundary);
    reports.push({kind,ready:true,bytes:bytes.byteLength,width:raster.width,height:raster.height});
   }else{
    const asset=await fetch(payload.asset,{headers:{Range:'bytes=0-2047'},signal:AbortSignal.timeout(20000)});
    if(!asset.ok||!asset.body)throw Error('Asset HTTP '+asset.status);
    const reader=asset.body.getReader(),decoder=new TextDecoder();
    let prefix='';
    try{
     while(prefix.length<2048){
      const part=await reader.read();
      if(part.done)break;
      prefix+=decoder.decode(part.value.subarray(0,2048-prefix.length),{stream:true});
     }
    }finally{await reader.cancel().catch(()=>{});}
    if(kind==='pdf'?!prefix.startsWith('%PDF-'):!/<(?:!doctype\s+html|html)(?:\s|>)/i.test(prefix))throw Error('The asset does not match the expected format.');
    reports.push({kind,ready:true,contentType:asset.headers.get('content-type')});
   }
  }catch(e){
   reports.push({kind,ready:false,stage,message:e instanceof Error?e.message:'Verification failed.'});
  }
 }
 return reports;
}
function remember(r){for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}}
async function view(body){const r=await fetch(origin+'/api/satellite/view',{method:'POST',headers:{Origin:origin,Cookie:cookies(),'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});return {status:r.status,data:await r.json()};}
try{
 if(!process.env.TALAZO_QA_ZONE_ID)throw Error('Set TALAZO_QA_ZONE_ID locally to an approved live field.');
 await db.connect();const mapping=(await db.query("select m.id,z.boundary from talazo_monitoring m join talazo_zones z on z.id=m.zone_id where m.zone_id=$1 and m.environment='live' and m.provider_id is not null and m.status='active'",[process.env.TALAZO_QA_ZONE_ID])).rows[0];assert(mapping,'Expected verified approved live mapping');
 const email='talazo-live-monitoring-qa-'+randomUUID()+'@example.invalid';const invitation=await auth.auth.admin.generateLink({type:'invite',email});if(invitation.error)throw Error('Disposable identity failed');identity=invitation.data.user.id;
 const admin=(await db.query('select user_id from platform_admins limit 1')).rows[0].user_id;
 await db.query("insert into talazo_accounts(user_id,email,name,approved_by) values($1,$2,'Live monitoring QA',$3)",[identity,email,admin]);
 const form=new FormData();form.set('token',invitation.data.properties.hashed_token);form.set('type','invite');let response=await fetch(origin+'/auth/confirm',{method:'POST',body:form,headers:{Origin:origin,Accept:'text/html'},redirect:'manual'});assert.equal(response.status,303);remember(response);
 assert.equal((await view({monitoring:mapping.id,date:'20261113',layer:'ndvi'})).status,403);
 await db.query('insert into platform_admins(user_id) values($1)',[identity]);
 if(process.argv.includes('--reports-only')){
  const observation=(await db.query('select data from talazo_observations where monitoring_id=$1',[mapping.id])).rows[0]?.data;
  const date=imageDates(observation?.products?.getSensedDays?.value)[0];
  assert(date,'No saved optical observation to verify');
  const reports=await verifyReports(mapping.id,date,mapping.boundary);
  console.log(JSON.stringify({observation:date,reports}));
  if(reports.some(report=>!report.ready))process.exitCode=1;
 }else{
 const sync=new FormData();sync.set('monitoring',mapping.id);response=await fetch(origin+'/admin/requests?/sync',{method:'POST',body:sync,headers:{Origin:origin,Cookie:cookies(),Accept:'application/json'},signal:AbortSignal.timeout(120000)});const syncResult=await response.json();assert.equal(syncResult.type,'success',syncResult.data?parse(syncResult.data)?.message:'Sync failed');
 const observation=(await db.query('select data from talazo_observations where monitoring_id=$1',[mapping.id])).rows[0].data;
 const dates=Object.keys(observation.products.getSensedDays?.value?.SensedDays||observation.products.getSensedDays?.value||{}).filter(d=>/^\d{8}$/.test(d)).sort().reverse();assert(dates.length,'No actual observation dates returned yet');const date=dates[0];
 const ndvi=await view({monitoring:mapping.id,date,layer:'ndvi',advisory:true,breakdown:true});assert.equal(ndvi.status,200);assert.equal(ndvi.data.image.state,'ready',ndvi.data.image.error);assert.equal(ndvi.data.breakdown.state,'ready',ndvi.data.breakdown.error);assert.equal(ndvi.data.advisory.state,'ready',ndvi.data.advisory.error);assert.equal(ndvi.data.advisory.value.value.SensedDay,date);
 const layers=await Promise.all(['ndre','ndmi','soc','rsm'].map(async layer=>{const result=await view({monitoring:mapping.id,date,layer,breakdown:true});return {layer,status:result.status,image:result.data.image?.state,error:result.data.image?.error,breakdown:result.data.breakdown?.state};}));
 const topics={satellite:'Observation history',health:'What the observation shows',pests:'Potential pests and diseases',weeds:'Potential weed pressure',nutrients:'Nutrient guidance',irrigation:'Irrigation outlook',yield:'Yield and harvest outlook',soil:'Soil indicators'};
 for(const [section,heading] of Object.entries(topics)){
  const query=new URLSearchParams({field:process.env.TALAZO_QA_ZONE_ID,date});
  const r=await fetch(origin+'/portal/'+section+'?'+query,{headers:{Cookie:cookies()}});
  assert.equal(r.status,200,'Live page '+section);
  const html=await r.text();
  assert(html.includes(heading),'Expected content for '+section);
  assert(!html.includes('Activate a field to open this page.'));
 }
 assert.equal((await view({monitoring:mapping.id,date:'19990101',layer:'ndvi'})).status,400);
 const cached=await view({monitoring:mapping.id,date,layer:'ndvi',advisory:true,breakdown:true});assert.equal(Date.parse(cached.data.image.fetchedAt),Date.parse(ndvi.data.image.fetchedAt));
 const reports=await verifyReports(mapping.id,date,mapping.boundary);
 console.log(JSON.stringify({liveField:true,observation:date,ndviImage:ndvi.data.image.state,areaBreakdown:ndvi.data.breakdown.state,advisoryTopics:Object.keys(ndvi.data.advisory.value.value.advisory),layers,reports,pages:8,cachedRead:true,unrelatedFarmerDenied:true,invalidDateDenied:true}));
 // A report failure must fail the release check, even when imagery succeeds.
 if(layers.some(v=>v.image!=='ready'||v.breakdown!=='ready')||reports.some(v=>!v.ready))process.exitCode=1;
 }
}finally{
 if(identity){await db.query('delete from platform_admins where user_id=$1',[identity]);await db.query('delete from talazo_accounts where user_id=$1',[identity]);const removed=await auth.auth.admin.deleteUser(identity);if(removed.error)throw Error('Disposable identity cleanup failed');}
 await db.end();
}
