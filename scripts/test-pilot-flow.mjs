// Real HTTP flow with a disposable generated identity; never sends email or registers live fields.
import {createClient} from '@supabase/supabase-js';import pg from 'pg';import {parse} from 'devalue';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
if((process.env.FARMONAUT_TEST_MODE||'true')!=='true')throw new Error('This test requires FARMONAUT_TEST_MODE=true');
const origin='http://127.0.0.1:5174';
const admin=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});await db.connect();
const email=`talazo-qa-${randomUUID()}@example.invalid`;let farmerId,farmerCookie,adminCookie,farmId,zoneId,monitoringId,period,createdPeriod=false;
async function session(token,type){const f=new FormData();f.set('token',token);f.set('type',type);const r=await fetch(origin+'/auth/confirm',{method:'POST',body:f,headers:{Origin:origin,Accept:'text/html'},redirect:'manual'});assert.equal(r.status,303);return r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');}
async function action(path,name,values,cookie){const f=new FormData();for(const [k,v] of Object.entries(values))f.set(k,String(v));const r=await fetch(origin+path+'?/'+name,{method:'POST',headers:{Origin:origin,Accept:'application/json',Cookie:cookie},body:f});const result=await r.json();const data=result.data?parse(result.data):{};assert.equal(result.type,'success',data.message||name+' failed');return data;}
try{
 const generated=await admin.auth.admin.generateLink({type:'magiclink',email:process.argv[2]});if(generated.error)throw generated.error;
 adminCookie=await session(generated.data.properties.hashed_token,'magiclink');
 const invitation=await action('/admin/users','invite',{email,name:'Disposable QA farmer',delivery:'link'},adminCookie);
 const link=new URL(invitation.invitation);farmerCookie=await session(link.searchParams.get('token_hash'),link.searchParams.get('type'));
 farmerId=(await db.query('select user_id from talazo_accounts where email=$1',[email])).rows[0].user_id;
 period=(await db.query("select date_trunc('month',now() at time zone 'Africa/Harare')::date::text as period")).rows[0].period;
 const existing=await db.query('select * from talazo_periods where period=$1',[period]);
 if(existing.rows.length)throw new Error('Current quota exists; this disposable flow refuses to modify it.');
 await action('/admin/quota','quota',{period:period.slice(0,7),hectares:'2'},adminCookie);createdPeriod=true;
 await action('/admin/quota','allocation',{period:period.slice(0,7),user:farmerId,hectares:'1.5'},adminCookie);
 await action('/portal/farms','farm',{name:'Disposable QA farm',district:'Goromonzi'},farmerCookie);
 farmId=(await db.query('select id from talazo_farms where owner_id=$1',[farmerId])).rows[0].id;
 const boundary={type:'Polygon',coordinates:[[[31,-17],[31.001,-17],[31.001,-17.001],[31,-17.001],[31,-17]]]};
 await action('/portal/farms','zone',{farm:farmId,name:'Disposable QA field',boundary:JSON.stringify(boundary),crop:'6',crop_name:'Maize',sowing:'2026-11-01',notes:'Disposable verification only'},farmerCookie);
 zoneId=(await db.query('select id from talazo_zones where farm_id=$1',[farmId])).rows[0].id;
 await action('/portal/farms','request',{zone:zoneId},farmerCookie);
 monitoringId=(await db.query('select id from talazo_monitoring where zone_id=$1',[zoneId])).rows[0].id;
 const registration=await action('/admin/requests','register',{monitoring:monitoringId},adminCookie);assert(registration.message.includes('Sample preview'));
 const observed=await db.query('select data from talazo_observations where monitoring_id=$1',[monitoringId]);assert.equal(observed.rows[0].data.sample,true);
 for(const path of ['/portal/overview','/portal/farms','/portal/satellite','/portal/weather','/portal/analysis']){const r=await fetch(origin+path,{headers:{Cookie:farmerCookie}});assert.equal(r.status,200,path);console.log('PASS populated '+path);}
 await action('/admin/requests','pause',{monitoring:monitoringId},adminCookie);
 assert.equal((await db.query('select status from talazo_monitoring where id=$1',[monitoringId])).rows[0].status,'paused');
 await action('/admin/quota','allocation',{period:period.slice(0,7),user:farmerId,hectares:'0'},adminCookie);
 await action('/admin/users','status',{user:farmerId,status:'suspended'},adminCookie);
 const suspended=await fetch(origin+'/portal/overview',{headers:{Cookie:farmerCookie},redirect:'manual'});assert.equal(suspended.status,403);
 console.log('PASS invitation → approval → quota → farm → polygon → monitoring request → sample synchronization → dashboard → suspension.');
}finally{
 if(monitoringId){await db.query('delete from talazo_observations where monitoring_id=$1',[monitoringId]);await db.query('delete from talazo_monitoring where id=$1',[monitoringId]);}
 if(farmId){await db.query('delete from talazo_zones where farm_id=$1',[farmId]);await db.query('delete from talazo_farms where id=$1',[farmId]);}
 if(farmerId){await db.query('delete from talazo_allocations where user_id=$1',[farmerId]);await db.query('delete from talazo_accounts where user_id=$1',[farmerId]);await admin.auth.admin.deleteUser(farmerId);}
 if(createdPeriod)await db.query('delete from talazo_periods where period=$1 and quota_sqm=20000 and not exists(select 1 from talazo_allocations where period=$1)',[period]);
 if(adminCookie)await fetch(origin+'/admin/overview?/signout',{method:'POST',headers:{Origin:origin,Cookie:adminCookie},redirect:'manual'});
 await db.end();console.log('Disposable flow records removed; no live fields or customer emails were created.');
}
