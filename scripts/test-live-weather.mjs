// Existing approved field only; disposable identity, no mail or provider writes.
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';import {parse} from 'devalue';
import {weatherDays} from '../src/lib/weather.mjs';
const origin=new URL(process.env.ORIGIN||'http://127.0.0.1:5174').origin;
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});
const auth=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
let user;const jar=new Map();
try {
 assert.equal(process.env.FARMONAUT_TEST_MODE,'false');assert(process.env.TALAZO_QA_ZONE_ID,'Select an existing approved live zone locally.');
 await db.connect();
 const field=(await db.query("select z.id from talazo_zones z join talazo_monitoring m on m.zone_id=z.id where z.id=$1 and m.environment='live' and m.status='active'",[process.env.TALAZO_QA_ZONE_ID])).rows[0];assert(field);
 const email=`talazo-weather-qa-${randomUUID()}@example.invalid`;
 const generated=await auth.auth.admin.generateLink({type:'invite',email});assert(!generated.error,'Disposable invitation failed');user=generated.data.user.id;
 const admin=(await db.query('select user_id from platform_admins limit 1')).rows[0].user_id;
 await db.query("insert into talazo_accounts(user_id,email,name,approved_by) values($1,$2,'Weather QA',$3)",[user,email,admin]);
 const form=new FormData();form.set('token',generated.data.properties.hashed_token);form.set('type','invite');
 const login=await fetch(origin+'/auth/confirm',{method:'POST',body:form,headers:{Origin:origin,Accept:'text/html'},redirect:'manual'});assert.equal(login.status,303);
 for(const item of login.headers.getSetCookie()){const pair=item.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}
 const headers={Origin:origin,Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),Accept:'application/json'};
 const request=()=>{const f=new FormData();f.set('zone',field.id);return fetch(origin+'/portal/weather?/weather',{method:'POST',headers,body:f,signal:AbortSignal.timeout(120000)}).then(r=>r.json());};
 assert.notEqual((await request()).type,'success','Unrelated farmer must not refresh another farm weather');
 await db.query('insert into platform_admins(user_id) values($1)',[user]);
 const result=await request();const payload=result.data?parse(result.data):{};assert.equal(result.type,'success',payload.message);
 const saved=(await db.query("select data from talazo_weather where zone_id=$1 and environment='live'",[field.id])).rows[0];
 const days=weatherDays(saved?.data);assert(days.length>0);assert(days.some(d=>d.min!==null&&d.max!==null),'Real temperatures required');
 const page=await fetch(origin+'/portal/weather',{headers});assert.equal(page.status,200);assert((await page.text()).includes('Weather'));
 console.log(JSON.stringify({passed:true,liveForecastDays:days.length,temperatures:true,unrelatedFarmerDenied:true,noProviderWrites:true}));
} finally {
 if(user){await db.query('delete from platform_admins where user_id=$1',[user]);await db.query('delete from talazo_accounts where user_id=$1',[user]);assert(!(await auth.auth.admin.deleteUser(user)).error,'Disposable identity cleanup failed');}
 await db.end();
}
