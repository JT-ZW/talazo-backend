// Discover provider fields using a disposable admin; never assign/import a real
// unassigned field or mutate Farmonaut. Provider metadata reads may refresh local caches.
import {createClient} from '@supabase/supabase-js';import pg from 'pg';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
const base=new URL(process.env.ORIGIN||'http://127.0.0.1:5174').origin;
const service=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});let user;const jar=new Map();
const cookie=()=>[...jar].map(([k,v])=>k+'='+v).join('; ');
async function refresh(origin=base){const r=await fetch(base+'/api/satellite/account',{method:'POST',headers:{Origin:origin,Cookie:cookie(),'Content-Type':'application/json'},body:JSON.stringify({force:true}),signal:AbortSignal.timeout(120000)});return {status:r.status,value:await r.json()};}
try{
 await db.connect();const email=`talazo-provider-qa-${randomUUID()}@example.invalid`;
 const generated=await service.auth.admin.generateLink({type:'invite',email});if(generated.error)throw Error('Disposable provider identity failed');user=generated.data.user.id;
 const approver=(await db.query('select user_id from platform_admins limit 1')).rows[0].user_id;
 await db.query("insert into talazo_accounts(user_id,email,name,approved_by) values($1,$2,'Provider account QA',$3)",[user,email,approver]);
 const f=new FormData();f.set('token',generated.data.properties.hashed_token);f.set('type','invite');const auth=await fetch(base+'/auth/confirm',{method:'POST',body:f,headers:{Origin:base,Accept:'text/html'},redirect:'manual'});assert.equal(auth.status,303);for(const c of auth.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}
 assert.equal((await refresh()).status,403,'Farmers cannot discover the provider account');
 await db.query('insert into platform_admins(user_id) values($1)',[user]);
 assert.equal((await refresh('https://untrusted.invalid')).status,403);
 const result=await refresh();assert.equal(result.status,200,JSON.stringify(result.value));
 const fields=(await db.query('select provider_id,boundary,present,issue from talazo_provider_fields')).rows;
 assert(fields.length>0,'Expected real provider inventory');assert(fields.some(f=>f.boundary),'Expected verified boundary metadata');
 const unassigned=(await db.query("select count(*)::int n from talazo_provider_fields f where present and not exists(select 1 from talazo_monitoring m where m.environment='live' and m.provider_id=f.provider_id)")).rows[0].n;
 const html=await(await fetch(base+'/admin/operations',{headers:{Cookie:cookie()}})).text();assert(html.includes('Your Farmonaut account fields'));assert(html.includes('Unassigned'));
 await db.query('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);assert.equal((await db.query('select count(*)::int n from talazo_provider_fields')).rows[0].n,fields.length);await db.query('reset role');
 await db.query('delete from platform_admins where user_id=$1',[user]);await db.query('set role authenticated');assert.equal((await db.query('select count(*)::int n from talazo_provider_fields')).rows[0].n,0,'Provider inventory hidden from farmers');await db.query('reset role');
 console.log(JSON.stringify({passed:true,refresh:result.value,inventoryFields:fields.length,unassignedFields:unassigned,metadataIssues:fields.filter(f=>f.issue).length,adminOnly:true,wrongOriginDenied:true,noProviderWrites:true}));
}finally{
 await db.query('reset role').catch(()=>{});
 if(user){await db.query('delete from platform_admins where user_id=$1',[user]);await db.query('delete from talazo_accounts where user_id=$1',[user]);if((await service.auth.admin.deleteUser(user)).error)throw Error('Provider QA cleanup failed');}await db.end();
}
