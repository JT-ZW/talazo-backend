// Uses a disposable farmer only. No administrator login, session change, mail or paid field registration.
import {farmonaut} from '../src/lib/server/farmonaut.mjs';import {sensedMap} from '../src/lib/satellite.mjs';
import {createClient} from '@supabase/supabase-js';import pg from 'pg';import {parse} from 'devalue';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5174';
if(process.env.FARMONAUT_TEST_MODE!=='true')throw new Error('This check requires provider sample mode.');
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});await db.connect();let id;const jar=new Map();
function remember(r){for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}}
const cookies=()=>[...jar].map(([k,v])=>k+'='+v).join('; ');
async function post(path,values){const f=new FormData();for(const [k,v] of Object.entries(values))f.set(k,String(v));const r=await fetch(origin+path,{method:'POST',body:f,headers:{Origin:origin,Accept:'application/json',Cookie:cookies()}});remember(r);const result=await r.json();return {...result,data:result.data?parse(result.data):{}};}
async function page(path,word){const r=await fetch(origin+path,{headers:{Cookie:cookies()}});assert.equal(r.status,200);assert((await r.text()).includes(word));}
try{
 const email=`talazo-field-qa-${randomUUID()}@example.invalid`;const generated=await client.auth.admin.generateLink({type:'invite',email});if(generated.error)throw Error('Disposable invitation failed');id=generated.data.user.id;
 const admin=(await db.query('select user_id from platform_admins order by created_at limit 1')).rows[0].user_id;
 await db.query("insert into talazo_accounts(user_id,email,name,approved_by) values($1,$2,'Disposable field QA',$3)",[id,email,admin]);
 const f=new FormData();f.set('token',generated.data.properties.hashed_token);f.set('type','invite');const r=await fetch(origin+'/auth/confirm',{method:'POST',body:f,headers:{Origin:origin,Accept:'text/html'},redirect:'manual'});assert.equal(r.status,303);remember(r);
 const farmResult=await post('/portal/farms?/farm',{name:'QA multi-field farm',district:'Goromonzi'});assert.equal(farmResult.type,'success');const farm=farmResult.data.savedFarm;assert(farm);
 let zones=[];
 for(const [name,x,cropName] of [['North field',31,'corn'],['South field',31.003,'soya beans']]){
  const boundary={type:'Polygon',coordinates:[[[x,-17],[x+.001,-17],[x+.001,-17.001],[x,-17.001],[x,-17]]]};
  const saved=await post('/portal/farms?/zone',{farm,name,boundary:JSON.stringify(boundary),crop:'19',crop_name:cropName,sowing:'2026-11-01',notes:'QA field'});assert.equal(saved.type,'success');assert.match(saved.data.message,/exceeds this farmer/);
 }
 zones=(await db.query('select id from talazo_zones where farm_id=$1 order by name',[farm])).rows.map(z=>z.id);assert.equal(zones.length,2);
 const standardized=(await db.query('select crop_name,crop_code,crop_entered_name from talazo_zones where farm_id=$1 order by name',[farm])).rows;
 assert.deepEqual(standardized,[{crop_name:'Maize',crop_code:'6',crop_entered_name:'corn'},{crop_name:'Soybean',crop_code:'11',crop_entered_name:'soya beans'}]);
 const unknownName='QA unknown '+randomUUID();
 const unknown=await post('/portal/farms?/zone',{farm,name:'Review field',crop_name:unknownName,boundary:JSON.stringify({type:'Polygon',coordinates:[[[31.006,-17],[31.007,-17],[31.007,-17.001],[31.006,-17.001],[31.006,-17]]]})});assert.equal(unknown.type,'success');assert.match(unknown.data.message,/administrator classification/);
 const review=(await db.query("select id,crop_code,crop_entered_name from talazo_zones where farm_id=$1 and name='Review field'",[farm])).rows[0];assert.equal(review.crop_code,'999');assert.equal(review.crop_entered_name,unknownName);
 await db.query('begin');await db.query('select set_config($1,$2,true)',['request.jwt.claim.sub',admin]);
 await db.query('select talazo_classify_crop($1,$2)',[review.id,'11']);
 const classified=(await db.query('select crop_code,crop_name,crop_entered_name from talazo_zones where id=$1',[review.id])).rows[0];assert.equal(classified.crop_name,'Soybean');assert.equal(classified.crop_entered_name,unknownName);
 await db.query('set local role authenticated');await db.query('select set_config($1,$2,true)',['request.jwt.claim.sub',id]);await db.query('savepoint denied');
 let classificationDenied=false;try{await db.query('select talazo_classify_crop($1,$2)',[review.id,'6']);}catch{classificationDenied=true;}assert(classificationDenied);await db.query('rollback to savepoint denied');await db.query('rollback');

 await page('/portal/farms','North field');await page('/portal/weather','Load field forecast');
 for(const section of ['health','pests','weeds','nutrients','irrigation','yield'])await page('/portal/'+section,'Activate a field to open this page.');
 const lockedNav=await fetch(origin+'/portal/farms',{headers:{Cookie:cookies()}});const lockedHtml=await lockedNav.text();assert(lockedHtml.includes('aria-disabled="true"'));assert(!lockedHtml.includes('href="/portal/pests"'));

 const forecast=await post('/portal/weather?/weather',{zone:zones[0]});assert.equal(forecast.type,'success');
 assert((await db.query("select jsonb_array_length(data->'daily') as count from talazo_weather where zone_id=$1 and environment='test'",[zones[0]])).rows[0].count>=7);
 await page('/portal/weather','Chance of rain');
 const activity=await post('/portal/analysis?/activity',{zone:zones[0],date:'2026-11-01',kind:'scouting',notes:'No pests observed during QA inspection',batch:'QA-001'});assert.equal(activity.type,'success');
 const future=await post('/portal/analysis?/activity',{zone:zones[0],date:'2099-11-01',kind:'scouting',notes:'Invalid future activity'});assert.equal(future.type,'failure');
 await page('/portal/analysis','QA-001');
 const sample=farmonaut({key:process.env.FARMONAUT_API_KEY,testMode:'true'});
 const sensed=await sample.call('getSensedDays',{FieldID:'1'});const date=Object.keys(sensedMap(sensed)).sort().at(-1);assert(date);
 const monitoring=(await db.query("insert into talazo_monitoring(zone_id,environment,status,provider_id) values($1,'test','active','1') returning id",[zones[0]])).rows[0].id;
 await db.query("insert into talazo_observations(monitoring_id,data) values($1,$2)",[monitoring,JSON.stringify({sample:true,products:{getSensedDays:{value:sensed,fetchedAt:new Date().toISOString()}}})]);
 const advisory=await post('/portal/analysis?/report',{monitoring,date,kind:'recommendations'});assert.equal(advisory.type,'success');
 const stored=(await db.query("select data->'products'->'askJeevnAPI' as result from talazo_observations where monitoring_id=$1",[monitoring])).rows[0].result;
 assert.equal(stored.requestedDate,date);assert(stored.value.advisory['Pest and Disease']);assert(stored.value.advisory.Weed);assert(stored.value.advisory.Fertilizer);assert(stored.value.advisory.Irrigation);assert(stored.value.advisory['Growth and Yield Estimation']);
 await page('/portal/analysis','Yield outlook');
 async function visual(values,customOrigin=origin){const response=await fetch(origin+'/api/satellite/view',{method:'POST',headers:{Origin:customOrigin,'Content-Type':'application/json',Cookie:cookies()},body:JSON.stringify(values)});return {status:response.status,data:await response.json()};}
 for(const layer of ['ndvi','ndre','ndmi']){const view=await visual({monitoring,date,layer,advisoryDate:date,advisory:true});assert.equal(view.status,200);if(view.data.image.state==='ready')assert.match(view.data.image.value.url,/^https:\/\//);else{assert.equal(view.data.image.state,'error');assert.match(view.data.image.error,/image link.*HTTP 400/);}assert.equal(view.data.advisory.state,'ready');assert.equal(view.data.environment,'test');}
 const cacheCount=(await db.query("select count(*)::int as count from talazo_products where monitoring_id=$1",[monitoring])).rows[0].count;assert.equal(cacheCount,4);
 const wrongField=await visual({monitoring:randomUUID(),date,layer:'ndvi'});assert.equal(wrongField.status,403);
 const wrongDate=await visual({monitoring,date:'20990101',layer:'ndvi'});assert.equal(wrongDate.status,400);
 const wrongOrigin=await visual({monitoring,date,layer:'ndvi'},'https://unrelated.example');assert.equal(wrongOrigin.status,403);
 const refreshResponse=await fetch(origin+'/api/satellite/refresh',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookies()},body:JSON.stringify({monitoring})});assert.equal(refreshResponse.status,200);
 const again=await fetch(origin+'/api/satellite/refresh',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookies()},body:JSON.stringify({monitoring})});assert.equal((await again.json()).refreshed,false);

 const pages={health:'Understand your crop',pests:'Know where to inspect.',weeds:'Follow potential weed pressure.',nutrients:'Review your nutrient guidance.',irrigation:'Plan water around your crop.',yield:'See the season'};
 for(const [section,headline] of Object.entries(pages)){
  const response=await fetch(origin+'/portal/'+section,{headers:{Cookie:cookies()}});assert.equal(response.status,200);const html=await response.text();assert(html.includes(headline));assert(html.includes('href="/portal/pests"'));assert(!html.includes('aria-label="Advisory topics"'));assert(html.includes('Farmonaut dated field imagery'));
 }
 await db.query("update talazo_monitoring set status='paused' where id=$1",[monitoring]);
 await page('/portal/pests','Activate a field to open this page.');
 const pausedAdvisory=await post('/portal/pests?/report',{monitoring,date,kind:'recommendations'});assert.equal(pausedAdvisory.type,'failure');assert.match(pausedAdvisory.data.message,/Active field monitoring/);
 await db.query("update talazo_monitoring set status='active' where id=$1",[monitoring]);

 const deniedReport=await post('/portal/analysis?/report',{monitoring:randomUUID(),date,kind:'recommendations'});assert.equal(deniedReport.type,'failure');

 const inaccessible=await post('/portal/weather?/weather',{zone:randomUUID()});assert.equal(inaccessible.type,'failure');
 await db.query('begin');await db.query('set local role authenticated');await db.query('select set_config($1,$2,true)',['request.jwt.claim.sub',randomUUID()]);
 assert.equal((await db.query('select * from talazo_weather where zone_id=$1',[zones[0]])).rows.length,0);
 assert.equal((await db.query('select * from talazo_field_activities where zone_id=$1',[zones[0]])).rows.length,0);
 await db.query('rollback');
 await db.query("insert into public.profiles(id,display_name) values($1,'Disposable field QA') on conflict do nothing",[id]);
 await db.query('insert into platform_admins(user_id) values($1)',[id]);
 try{await page('/admin/crops','CROP REGISTER');}finally{await db.query('delete from platform_admins where user_id=$1',[id]);}
 console.log('PASS: authenticated farm creation, free-text crop alias normalization, retained original wording, over-allocation warning, administrator crop classification and authorization, admin crop summary rendering, six dedicated crop pages, inactive and paused navigation gating, active advisory routing, NDVI/NDRE/NDMI API loading and provider asset-failure reporting, cached automatic advice, origin/date/field isolation, refresh throttling, multiple independent fields, rendered farm/weather/analysis pages, sample coordinate forecast, structured advisory retrieval and persistence, traceability activity, future-date rejection and weather/activity tenant isolation.');
}finally{
 await db.query('rollback').catch(()=>{});
 if(id){
  await db.query('delete from platform_admins where user_id=$1',[id]);
  await db.query('delete from talazo_observations where monitoring_id in (select m.id from talazo_monitoring m join talazo_zones z on z.id=m.zone_id join talazo_farms f on f.id=z.farm_id where f.owner_id=$1)',[id]);
  await db.query('delete from talazo_monitoring where zone_id in (select z.id from talazo_zones z join talazo_farms f on f.id=z.farm_id where f.owner_id=$1)',[id]);
  await db.query('delete from talazo_zones where farm_id in (select id from talazo_farms where owner_id=$1)',[id]);
  await db.query('delete from talazo_farms where owner_id=$1',[id]);await db.query('delete from talazo_accounts where user_id=$1',[id]);
  const removed=await client.auth.admin.deleteUser(id);if(removed.error)throw Error('Disposable identity cleanup failed');
 }
 await db.end();
}
