// Requires a separate sample-mode local server. Disposable identities/fields only.
import {createClient} from '@supabase/supabase-js';import pg from 'pg';import {parse} from 'devalue';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const origin=new URL(process.env.ORIGIN||'http://127.0.0.1:4175').origin;
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname)||process.env.FARMONAUT_TEST_MODE!=='true')throw Error('Use a local sample-mode server only.');
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});const auth=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
let user;const farm=randomUUID(),zone=randomUUID(),monitoring=randomUUID(),jar=new Map();
const headers=()=>({Origin:origin,Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),Accept:'application/json'});
async function action(path,values){const f=new FormData();for(const [k,v] of Object.entries(values))f.set(k,String(v));const r=await fetch(origin+path,{method:'POST',body:f,headers:headers(),signal:AbortSignal.timeout(30000)});const result=await r.json();return {...result,data:result.data?parse(result.data):{}};}
try{
 await db.connect();const email=`talazo-release-qa-${randomUUID()}@example.invalid`;const generated=await auth.auth.admin.generateLink({type:'invite',email});assert(!generated.error);user=generated.data.user.id;
 const approver=(await db.query('select user_id from platform_admins limit 1')).rows[0].user_id;await db.query("insert into talazo_accounts(user_id,email,name,approved_by) values($1,$2,'Release QA',$3)",[user,email,approver]);
 const f=new FormData();f.set('token',generated.data.properties.hashed_token);f.set('type','invite');const login=await fetch(origin+'/auth/confirm',{method:'POST',body:f,headers:{Origin:origin,Accept:'text/html'},redirect:'manual'});assert.equal(login.status,303);for(const item of login.headers.getSetCookie()){const pair=item.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}
 await db.query("insert into talazo_farms(id,owner_id,name) values($1,$2,'Release QA')",[farm,user]);
 const boundary={type:'Polygon',coordinates:[[[31,-17],[31.0002,-17],[31.0002,-17.0002],[31,-17.0002],[31,-17]]]};
 await db.query("insert into talazo_zones(id,farm_id,name,boundary,area_sqm,crop_code,crop_name,sowing_date) values($1,$2,'QA area',$3,500,'16','Potato','2026-10-01')",[zone,farm,JSON.stringify(boundary)]);
 await db.query("insert into talazo_monitoring(id,zone_id,environment,status,provider_id) values($1,$2,'test','active','qa-sample')",[monitoring,zone]);
 const period=(await db.query("select date_trunc('month',now() at time zone 'Africa/Harare')::date p")).rows[0].p;
 await db.query('insert into talazo_allocations(period,user_id,sqm) values($1,$2,1000)',[period,user]);
 const data={products:{getSensedDays:{value:{20261113:'yes',20261108:'yes'}},getAllIndexValues:{value:{ndvi:{20261113:'20',20261108:'60'}},fetchedAt:new Date().toISOString()}}};
 await db.query('insert into talazo_observations(monitoring_id,data) values($1,$2)',[monitoring,JSON.stringify(data)]);
 assert.equal((await action('/portal/account?/alertPreferences',{enabled:true,threshold:.15})).type,'success');
 const csv=await fetch(origin+'/api/satellite/export?monitoring='+monitoring,{headers:headers()});assert.equal(csv.status,200);assert((await csv.text()).includes('Farmonaut'));
 const request=await action('/portal/farms?/requestChange',{monitoring,crop:'Soya beans',sowing:'2026-10-10'});assert.equal(request.type,'success',request.data.message);
 const change=(await db.query('select id from talazo_field_changes where monitoring_id=$1',[monitoring])).rows[0].id;
 assert.notEqual((await action('/portal/farms?/approveChange',{change})).type,'success');
 await db.query('insert into platform_admins(user_id) values($1)',[user]);
 const approved=await action('/admin/operations?/approveChange',{change});assert.equal(approved.type,'success',approved.data.message);
 assert.equal((await db.query('select crop_code from talazo_zones where id=$1',[zone])).rows[0].crop_code,'11');
 assert.equal((await db.query('select state from talazo_field_changes where id=$1',[change])).rows[0].state,'completed');
 assert((await db.query('select previous_observation from talazo_field_changes where id=$1',[change])).rows[0].previous_observation);
 assert.equal((await db.query('select * from talazo_observations where monitoring_id=$1',[monitoring])).rows.length,0);
 const denied=await fetch(origin+'/api/satellite/sync');assert.equal(denied.status,401);
 console.log(JSON.stringify({passed:true,sampleMode:true,ownerChangeRequest:true,farmerApprovalDenied:true,adminChangeVerified:true,priorSeasonArchived:true,staleProductsCleared:true,alertOptIn:true,scopedCSV:true,unauthorizedSchedulerDenied:true,noProviderWrites:true}));
}finally{
 if(user){await db.query('delete from talazo_field_changes where monitoring_id=$1',[monitoring]);await db.query('delete from talazo_products where monitoring_id=$1',[monitoring]);await db.query('delete from talazo_observations where monitoring_id=$1',[monitoring]);await db.query('delete from talazo_monitoring where id=$1',[monitoring]);await db.query('delete from talazo_zones where id=$1',[zone]);await db.query('delete from talazo_farms where id=$1',[farm]);await db.query('delete from talazo_allocations where user_id=$1',[user]);await db.query('delete from talazo_events where actor=$1',[user]);await db.query('delete from platform_admins where user_id=$1',[user]);await db.query('delete from talazo_accounts where user_id=$1',[user]);assert(!(await auth.auth.admin.deleteUser(user)).error,'Disposable identity cleanup failed');}
 await db.end();
}
