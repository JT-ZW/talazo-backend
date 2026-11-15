// Disposable identity; no real administrator session changes, emails or paid field writes.
import {createClient} from '@supabase/supabase-js';import pg from 'pg';import {parse} from 'devalue';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
const origin=new URL(process.env.ORIGIN||'http://127.0.0.1:5174').origin;
if(process.env.FARMONAUT_TEST_MODE!=='false')throw Error('Live checks require live mode.');
const auth=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});let identity;const jar=new Map();
const cookies=()=>[...jar].map(([k,v])=>k+'='+v).join('; ');
function remember(r){for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}}
async function view(body){const r=await fetch(origin+'/api/satellite/view',{method:'POST',headers:{Origin:origin,Cookie:cookies(),'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});return {status:r.status,data:await r.json()};}
try{
 if(!process.env.TALAZO_QA_ZONE_ID)throw Error('Set TALAZO_QA_ZONE_ID locally to an approved live field.');
 await db.connect();const mapping=(await db.query("select m.id from talazo_monitoring m where m.zone_id=$1 and m.environment='live' and m.provider_id is not null and m.status in ('active','awaiting')",[process.env.TALAZO_QA_ZONE_ID])).rows[0];assert(mapping,'Expected verified approved live mapping');
 const email='talazo-live-monitoring-qa-'+randomUUID()+'@example.invalid';const invitation=await auth.auth.admin.generateLink({type:'invite',email});if(invitation.error)throw Error('Disposable identity failed');identity=invitation.data.user.id;
 const admin=(await db.query('select user_id from platform_admins limit 1')).rows[0].user_id;
 await db.query("insert into talazo_accounts(user_id,email,name,approved_by) values($1,$2,'Live monitoring QA',$3)",[identity,email,admin]);
 const form=new FormData();form.set('token',invitation.data.properties.hashed_token);form.set('type','invite');let response=await fetch(origin+'/auth/confirm',{method:'POST',body:form,headers:{Origin:origin,Accept:'text/html'},redirect:'manual'});assert.equal(response.status,303);remember(response);
 assert.equal((await view({monitoring:mapping.id,date:'20261113',layer:'ndvi'})).status,403);
 await db.query('insert into platform_admins(user_id) values($1)',[identity]);
 const sync=new FormData();sync.set('monitoring',mapping.id);response=await fetch(origin+'/admin/requests?/sync',{method:'POST',body:sync,headers:{Origin:origin,Cookie:cookies(),Accept:'application/json'},signal:AbortSignal.timeout(120000)});const syncResult=await response.json();assert.equal(syncResult.type,'success',syncResult.data?parse(syncResult.data)?.message:'Sync failed');
 const observation=(await db.query('select data from talazo_observations where monitoring_id=$1',[mapping.id])).rows[0].data;
 const dates=Object.keys(observation.products.getSensedDays?.value?.SensedDays||observation.products.getSensedDays?.value||{}).filter(d=>/^\d{8}$/.test(d)).sort().reverse();assert(dates.length,'No actual observation dates returned yet');const date=dates[0];
 const ndvi=await view({monitoring:mapping.id,date,layer:'ndvi',advisory:true,breakdown:true});assert.equal(ndvi.status,200);assert.equal(ndvi.data.image.state,'ready',ndvi.data.image.error);assert.equal(ndvi.data.breakdown.state,'ready',ndvi.data.breakdown.error);assert.equal(ndvi.data.advisory.state,'ready',ndvi.data.advisory.error);assert.equal(ndvi.data.advisory.value.value.SensedDay,date);
 const layers=await Promise.all(['ndre','ndmi','soc','rsm'].map(async layer=>{const result=await view({monitoring:mapping.id,date,layer,breakdown:true});return {layer,status:result.status,image:result.data.image?.state,error:result.data.image?.error,breakdown:result.data.breakdown?.state};}));
 for(const section of ['satellite','health','pests','weeds','nutrients','irrigation','yield','soil']){const r=await fetch(origin+'/portal/'+section,{headers:{Cookie:cookies()}});assert.equal(r.status,200);const html=await r.text();assert(html.includes('Field monitoring views'));assert(html.includes('Soil insights'));assert(!html.includes('Activate a field to open this page.'));}
 assert.equal((await view({monitoring:mapping.id,date:'19990101',layer:'ndvi'})).status,400);
 const cached=await view({monitoring:mapping.id,date,layer:'ndvi',advisory:true,breakdown:true});assert.equal(Date.parse(cached.data.image.fetchedAt),Date.parse(ndvi.data.image.fetchedAt));
 const reports=[];
 for(const kind of ['pdf','advisory']){const form=new FormData();for(const [key,value] of Object.entries({monitoring:mapping.id,date,kind}))form.set(key,value);const r=await fetch(origin+'/portal/analysis?/report',{method:'POST',body:form,headers:{Origin:origin,Cookie:cookies(),Accept:'application/json'},signal:AbortSignal.timeout(120000)});const action=await r.json();const payload=action.data?parse(action.data):{};reports.push({kind,ready:action.type==='success'&&Boolean(payload.asset),message:payload.message});}
 console.log(JSON.stringify({liveField:true,observation:date,ndviImage:ndvi.data.image.state,areaBreakdown:ndvi.data.breakdown.state,advisoryTopics:Object.keys(ndvi.data.advisory.value.value.advisory),layers,reports,pages:8,cachedRead:true,unrelatedFarmerDenied:true,invalidDateDenied:true}));
 if(layers.some(v=>v.image!=='ready'))process.exitCode=1;
}finally{
 if(identity){await db.query('delete from platform_admins where user_id=$1',[identity]);await db.query('delete from talazo_accounts where user_id=$1',[identity]);const removed=await auth.auth.admin.deleteUser(identity);if(removed.error)throw Error('Disposable identity cleanup failed');}
 await db.end();
}
