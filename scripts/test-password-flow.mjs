// Changes only a disposable QA identity's password. Never reads or changes the administrator's password/session.
import {createClient} from '@supabase/supabase-js';import pg from 'pg';import {parse} from 'devalue';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
const origin=new URL(process.env.ORIGIN||'http://127.0.0.1:5174').origin;
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Password QA is local-only.');
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});await db.connect();
let id;const jar=new Map();
function remember(response){for(const c of response.headers.getSetCookie()){const pair=c.split(';')[0];const separator=pair.indexOf('=');jar.set(pair.slice(0,separator),pair.slice(separator+1));}}
function cookies(){return [...jar.entries()].map(([k,v])=>k+'='+v).join('; ');}
try{
 const email=`talazo-password-qa-${randomUUID()}@example.invalid`;
 const generated=await client.auth.admin.generateLink({type:'invite',email});if(generated.error)throw new Error('Disposable invitation failed');
 id=generated.data.user.id;
 const admin=(await db.query('select user_id from platform_admins order by created_at limit 1')).rows[0].user_id;
 await db.query("insert into talazo_accounts(user_id,email,name,approved_by) values($1,$2,'Disposable password QA',$3)",[id,email,admin]);
 const confirmation=new FormData();confirmation.set('token',generated.data.properties.hashed_token);confirmation.set('type','invite');
 const activated=await fetch(origin+'/auth/confirm',{method:'POST',body:confirmation,headers:{Origin:origin,Accept:'text/html'},redirect:'manual'});assert.equal(activated.status,303);remember(activated);
 const password=randomUUID()+'Aa!9';
 async function save(p,confirmation){const f=new FormData();f.set('password',p);f.set('confirmation',confirmation);const r=await fetch(origin+'/activate',{method:'POST',body:f,headers:{Origin:origin,Accept:'application/json',Cookie:cookies()}});remember(r);const result=await r.json();return {...result,data:result.data?parse(result.data):{}};}
 const first=await save(password,password);assert.equal(first.type,'success');assert.equal(first.data.redirectTo,'/portal/overview');
 const repeated=await save(password,password);assert.equal(repeated.type,'success');assert.match(repeated.data.message,/already saved/);
 const mismatched=await save(password,password+'x');assert.equal(mismatched.type,'failure');assert.match(mismatched.data.message,/match/);
 const short=await save('short','short');assert.equal(short.type,'failure');
 console.log('PASS: first password save, repeated same-password submission, mismatch rejection and minimum length; no administrator password or session was changed.');
}finally{
 if(id){await db.query('delete from talazo_accounts where user_id=$1',[id]);const removed=await client.auth.admin.deleteUser(id);if(removed.error)throw new Error('Disposable identity cleanup failed');}
 await db.end();
}
