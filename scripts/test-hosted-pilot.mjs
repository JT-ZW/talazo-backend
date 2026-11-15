// Hosted checks run in one transaction that is always rolled back. No provider requests or mail.
import pg from 'pg';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,connectionTimeoutMillis:15000});
const [admin,a,b]=[randomUUID(),randomUUID(),randomUUID()];
try{
 await db.connect();await db.query('begin');
 for(const id of [admin,a,b])await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,'{}')",[id,`${id}@talazo-test.invalid`]);
 await db.query("insert into public.profiles(id,display_name) values($1,'Disposable test administrator') on conflict do nothing",[admin]);
 await db.query('insert into public.platform_admins values($1,now())',[admin]);
 await db.query('select set_config($1,$2,true)',['request.jwt.claim.sub',admin]);
 for(const id of [a,b])await db.query('select talazo_approve($1,$2,$3)',[id,`${id}@talazo-test.invalid`,'Disposable test farmer']);
 const period=(await db.query("select date_trunc('month',now() at time zone 'Africa/Harare')::date::text as period")).rows[0].period;
 await db.query('select talazo_set_quota($1,100000)',[period]);
 await db.query('select talazo_allocate($1,$2,70000)',[period,a]);
 async function denied(sql,args=[]){await db.query('savepoint denied');let rejected=false;try{await db.query(sql,args);}catch{rejected=true;}await db.query('rollback to savepoint denied');assert.equal(rejected,true);}
 await denied('select talazo_allocate($1,$2,70000)',[period,b]);
 await denied('select talazo_set_quota($1,60000)',[period]);
 await db.query('select set_config($1,$2,true)',['request.jwt.claim.sub',a]);
 const farm=(await db.query("select talazo_add_farm($1,'Spatial validation test','Goromonzi') as id",[a])).rows[0].id;
 const polygon={type:'Polygon',coordinates:[[[31,-17],[31.001,-17],[31.001,-17.001],[31,-17.001],[31,-17]]]};
 const args=[farm,'Test zone',JSON.stringify(polygon),'6','Maize','2026-11-01','Testing only'];
 const zone=(await db.query('select talazo_add_zone($1,$2,$3,$4,$5,$6,$7) as id',args)).rows[0].id;
 const area=(await db.query('select area_sqm from talazo_zones where id=$1',[zone])).rows[0].area_sqm;
 assert(Number(area)>100&&Number(area)<70000);
 await denied('select talazo_add_zone($1,$2,$3,$4,$5,$6,$7)',args);
 await db.query("select talazo_request($1,'test')",[zone]);
 const monitoring=(await db.query('select id from talazo_monitoring where zone_id=$1',[zone])).rows[0].id;
 await db.query('select set_config($1,$2,true)',['request.jwt.claim.sub',admin]);
 await db.query('select talazo_claim($1,$2)',[monitoring,period]);
 await denied("select talazo_set_quota('2099-01-01',0)");
 await denied('select talazo_claim($1,$2)',[monitoring,period]);
 await denied('select talazo_allocate($1,$2,0)',[period,a]);
 await db.query("update talazo_monitoring set status='paused' where id=$1",[monitoring]);
 await db.query('select talazo_allocate($1,$2,0)',[period,a]);
 await denied('select talazo_claim($1,$2)',[monitoring,period]);
 await db.query('set local role authenticated');
 await db.query('select set_config($1,$2,true)',['request.jwt.claim.sub',b]);
 assert.equal((await db.query('select * from talazo_farms where id=$1',[farm])).rows.length,0);
 await denied("insert into platform_admins(user_id) values($1)",[b]);
 await db.query('reset role');await db.query('select set_config($1,$2,true)',['request.jwt.claim.sub',admin]);
 await db.query("select talazo_account_status($1,'suspended')",[a]);
 await db.query('set local role authenticated');await db.query('select set_config($1,$2,true)',['request.jwt.claim.sub',a]);
 assert.equal((await db.query('select * from talazo_zones where id=$1',[zone])).rows.length,0);
 console.log('PASS: hosted PostGIS area/overlap validation, quota limits, reserved-area protection, duplicate registration claim prevention, RLS isolation, admin escalation denial, suspension. All test records rolled back.');
}catch(e){console.error('Hosted validation failed:',e.code||e.message);process.exitCode=1;}finally{await db.query('rollback').catch(()=>{});await db.end();}
