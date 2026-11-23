// Only disposable identities and their own fixtures; no mail or provider writes.
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
import {parse} from 'devalue';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const origin=new URL(process.env.ORIGIN||'http://127.0.0.1:5174').origin;
const service=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});
const users=[];const farms=[];
async function action(user,path,values,source=origin){
 const body=new FormData();for(const [k,v] of Object.entries(values))body.set(k,String(v));
 const r=await fetch(origin+path,{method:'POST',body,headers:{Origin:source,Accept:'application/json',Cookie:user?.cookie()||''},redirect:'manual'});
 if(user)for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');user.jar.set(pair.slice(0,i),pair.slice(i+1));}
 const raw=await r.text();let result;try{result=JSON.parse(raw);}catch{return {status:r.status,type:'http-error',data:{}};}
 return {status:r.status,...result,data:result.data?parse(result.data):{}};
}
try{
 await db.connect();const approver=(await db.query('select user_id from platform_admins limit 1')).rows[0].user_id;
 for(let i=0;i<3;i++){
  const email=`talazo-isolation-${randomUUID()}@example.invalid`,password=randomUUID()+'Aa9!';
  const created=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{role:'super_admin',is_admin:true}});
  assert(!created.error,'Disposable identity creation');
  const user={id:created.data.user.id,email,password,jar:new Map(),cookie(){return [...this.jar].map(([k,v])=>k+'='+v).join('; ');}};users.push(user);
  if(i<2)await db.query("insert into talazo_accounts(user_id,email,name,approved_by) values($1,$2,'Disposable isolation QA',$3)",[user.id,email,approver]);
 }
 const [a,b,unapproved]=users;
 const reportingMonth=new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Harare',year:'numeric',month:'2-digit'}).format(new Date());
 for(const user of [a,b]){const r=await action(user,'/login',{email:user.email,password:user.password});assert.equal(r.type,'redirect');assert.equal(r.location,'/portal/overview');}
 assert.equal((await action(unapproved,'/login',{email:unapproved.email,password:unapproved.password})).type,'failure');
 const anon=await fetch(origin+'/portal/overview',{redirect:'manual'});assert.equal(anon.status,303);
 for(const user of [a,b]){
  const r=await action(user,'/portal/farms?/farm',{name:'Isolated '+user.id,district:'QA only',owner:approver});assert.equal(r.type,'success',r.data.message);farms.push(r.data.savedFarm);
  assert.equal((await db.query('select owner_id from talazo_farms where id=$1',[r.data.savedFarm])).rows[0].owner_id,user.id,'Submitted owner cannot transfer ownership');
 }
 assert.equal((await action(a,'/portal/farms?/editFarm',{farm:farms[0],name:'Updated QA farm',district:'QA'})).type,'success');
 assert.equal((await action(b,'/portal/farms?/editFarm',{farm:farms[0],name:'Unauthorized edit',district:'QA'})).type,'failure');
 assert.equal((await action(a,'/portal/account?/supportRequest',{category:'field',subject:'Disposable boundary question',message:'QA request'})).type,'success');
 const ticket=(await db.query('select id from talazo_support_requests where requester=$1',[a.id])).rows[0].id;
 assert.equal((await action(b,'/admin/support?/supportReply',{request:ticket,status:'resolved',reply:'Unauthorized reply'})).status,403);
 const polygon={type:'Polygon',coordinates:[[[31,-17],[31.001,-17],[31.001,-17.001],[31,-17.001],[31,-17]]]};
 const field={farm:farms[0],name:'Private QA field',boundary:JSON.stringify(polygon),crop_name:'Potatoes',sowing:'2026-10-01',notes:'Disposable isolation test'};
 assert.equal((await action(b,'/portal/farms?/zone',field)).type,'failure');
 assert.equal((await action(a,'/portal/farms?/zone',field)).type,'success');
 const z=(await db.query('select id from talazo_zones where farm_id=$1',[farms[0]])).rows[0].id;
 assert.equal((await action(a,'/portal/farms?/request',{zone:z})).type,'success');
 const m=(await db.query('select id from talazo_monitoring where zone_id=$1',[z])).rows[0].id;
 // These are explicitly QA fixtures. Never register or query this provider ID.
 await db.query("insert into talazo_observations(monitoring_id,data) values($1,'{}')",[m]);
 await db.query("insert into talazo_weather(zone_id,environment,data) values($1,'live','{}')",[z]);
 await db.query("insert into talazo_products(monitoring_id,product,observed_on,state,data) values($1,'advisory','20261113','ready','{}')",[m]);
 assert.equal((await action(a,'/portal/analysis?/activity',{zone:z,date:'2026-11-01',kind:'scouting',notes:'Private observation',batch:''})).type,'success');
 assert.equal((await action(b,'/portal/analysis?/activity',{zone:z,date:'2026-11-01',kind:'scouting',notes:'Unauthorized',batch:''})).type,'failure');
 const publicKey=process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.PUBLIC_SUPABASE_ANON_KEY;
 const api=createClient(process.env.SUPABASE_URL,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
 assert(!(await api.auth.signInWithPassword({email:a.email,password:a.password})).error);
 assert.equal((await api.from('talazo_support_requests').select('id').eq('id',ticket)).data.length,1);
 assert.equal((await api.from('talazo_support_requests').update({status:'resolved'}).eq('id',ticket).select('id')).data.length,0);
 const tables=[['talazo_farms','id',farms[0]],['talazo_zones','id',z],['talazo_monitoring','id',m],['talazo_observations','monitoring_id',m],['talazo_weather','zone_id',z],['talazo_field_activities','zone_id',z],['talazo_products','monitoring_id',m]];
 for(const [table,column,id] of tables){const r=await api.from(table).select('*').eq(column,id);assert(!r.error,table);assert.equal(r.data.length,1,'Owner reads '+table);}
 await api.auth.signInWithPassword({email:b.email,password:b.password});
 assert.equal((await api.from('talazo_support_requests').select('id').eq('id',ticket)).data.length,0);
 assert((await api.from('talazo_impact_entries').insert({metric:'training',period:reportingMonth+'-01',value:1,evidence:'Unauthorized QA entry'})).error);
 for(const [table,column,id] of tables){const r=await api.from(table).select('*').eq(column,id);assert(!r.error,table);assert.equal(r.data.length,0,'Unrelated farmer cannot read '+table);}
 assert.equal((await api.rpc('talazo_is_admin')).data,false,'Editable metadata grants no admin rights');
 assert((await api.from('talazo_farms').insert({name:'Bypass',owner_id:b.id})).error);
 assert((await api.rpc('talazo_set_quota',{p_period:'2026-11-01',p_sqm:999999})).error);
 assert.equal((await fetch(origin+'/admin/overview',{headers:{Cookie:b.cookie()}})).status,403);
 const forbidden=await fetch(origin+'/api/satellite/view',{method:'POST',headers:{Origin:origin,Cookie:b.cookie(),'Content-Type':'application/json'},body:JSON.stringify({monitoring:m,date:'20261113',layer:'ndvi'})});assert.equal(forbidden.status,403);
 assert.equal((await action(a,'/portal/farms?/farm',{name:'CSRF'},'https://untrusted.invalid')).status,403);
 await db.query("update talazo_accounts set status='suspended' where user_id=$1",[a.id]);
 assert.equal((await fetch(origin+'/portal/overview',{headers:{Cookie:a.cookie()}})).status,403);
 await api.auth.signInWithPassword({email:a.email,password:a.password});
 for(const [table,column,id] of tables)assert.equal((await api.from(table).select('*').eq(column,id)).data.length,0,'Suspended access denied '+table);
 assert.equal((await action(a,'/login',{email:a.email,password:a.password})).type,'failure');
 await db.query('insert into platform_admins(user_id) values($1)',[b.id]);
 for(const section of ['overview','users','quota','requests','operations','crops','impact','support'])assert.equal((await fetch(origin+'/admin/'+section,{headers:{Cookie:b.cookie()}})).status,200,'Admin page '+section);
 assert.equal((await action(b,'/admin/support?/supportReply',{request:ticket,status:'resolved',reply:'QA resolved'})).type,'success');
 assert.equal((await db.query('select reply from talazo_support_requests where id=$1',[ticket])).rows[0].reply,'QA resolved');
 assert.equal((await action(b,'/admin/impact?/impactEntry',{metric:'training',period:reportingMonth,value:1,evidence:'Disposable QA entry'})).type,'success');
 await db.query('delete from platform_admins where user_id=$1',[b.id]);
 assert.equal((await action(b,'/portal/account?/signout',{})).type,'redirect');
 assert.equal((await fetch(origin+'/portal/overview',{headers:{Cookie:b.cookie()},redirect:'manual'})).status,303);
 const unsafe=(await db.query("select table_name,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name like 'talazo\_%' and grantee in ('anon','authenticated') and privilege_type<>'SELECT' and not (table_name='talazo_impact_entries' and grantee='authenticated' and privilege_type='INSERT')")).rows;
 assert.equal(unsafe.length,0,'No unexpected table-wide mutation grants');
 console.log('PASS: password login/logout, unapproved and suspended rejection, owner assignment, field setup/request/activity, seven-table owner/cross-user/suspended isolation, forged admin metadata, direct writes and quota escalation denied, admin route and imagery API denied, cross-origin form rejected, farm editing, support privacy and replies, impact admin writes and least-privilege grants.');
}catch(e){console.error('Isolation assertion:',e.message);process.exitCode=1;}finally{
 const owned=(await db.query('select id from talazo_farms where owner_id=any($1::uuid[])',[users.map(u=>u.id)])).rows;
 for(const {id} of owned){
  await db.query('delete from talazo_observations where monitoring_id in (select id from talazo_monitoring where zone_id in (select id from talazo_zones where farm_id=$1))',[id]);
  await db.query('delete from talazo_monitoring where zone_id in (select id from talazo_zones where farm_id=$1)',[id]);
  await db.query('delete from talazo_zones where farm_id=$1',[id]);
  await db.query('delete from talazo_farms where id=$1',[id]);
 }
 for(const u of users){
  await db.query('delete from talazo_support_requests where requester=$1',[u.id]);
  await db.query('delete from talazo_impact_entries where recorded_by=$1',[u.id]);
  await db.query('delete from platform_admins where user_id=$1',[u.id]);await db.query('delete from talazo_events where actor=$1',[u.id]);await db.query('delete from talazo_accounts where user_id=$1',[u.id]);const r=await service.auth.admin.deleteUser(u.id);if(r.error)throw Error('Disposable QA identity cleanup failed');
 }
 await db.end();
}
