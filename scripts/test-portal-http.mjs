import {createClient} from '@supabase/supabase-js';import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5174';
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const email=process.argv[2];if(!email)throw new Error('Pass the authorized admin email.');
const publicResponse=await fetch(origin+'/admin/overview',{redirect:'manual'});assert.equal(publicResponse.status,303);assert.equal(publicResponse.headers.get('location'),'/login');
const login=await fetch(origin+'/login');assert.equal(login.status,200);assert((await login.text()).includes('Sign in to Talazo'));
const generated=await client.auth.admin.generateLink({type:'magiclink',email});
if(generated.error)throw new Error('Could not prepare authenticated HTTP test');
const f=new FormData();f.set('token',generated.data.properties.hashed_token);f.set('type','magiclink');
const confirmation=await fetch(origin+'/auth/confirm',{method:'POST',body:f,headers:{Origin:origin,Accept:'text/html'},redirect:'manual'});
assert.equal(confirmation.status,303);
const cookie=confirmation.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
assert(cookie.length>0);
for(const path of ['/admin/overview','/admin/users','/admin/quota','/admin/requests','/admin/operations','/portal/overview','/portal/farms','/portal/satellite','/portal/weather','/portal/analysis','/activate']){
 const response=await fetch(origin+path,{headers:{Cookie:cookie},redirect:'manual'});
 assert.equal(response.status,200,`${path} must render`);
 const text=await response.text();assert(!text.includes(process.env.FARMONAUT_API_KEY),'Provider key must never be serialized');
 console.log(`PASS ${path}`);
}
// Sign out this QA session without altering the administrator's password.
await fetch(origin+'/admin/overview?/signout',{method:'POST',headers:{Origin:origin,Cookie:cookie},redirect:'manual'});
console.log('Authenticated HTTP routes passed; no password chosen and no customer invitations sent.');
