// Database-only fixtures are rolled back. No provider calls, emails or real identities.
import pg from 'pg';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});
const [admin,farmer,other]=[randomUUID(),randomUUID(),randomUUID()];
const square=(x,size=.001)=>({type:'Polygon',coordinates:[[[x,-17],[x+size,-17],[x+size,-17.001],[x,-17.001],[x,-17]]]});
try{
 await db.connect();await db.query('begin');
 const source=fs.readFileSync('supabase/pilot/010_provider_reconciliation.sql','utf8');
 const start=source.indexOf('create function public.talazo_apply_provider_field('),end=source.indexOf('\nrevoke all on function public.talazo_apply_provider_field',start);
 if(start<0||end<0)throw Error('Candidate reconciliation function missing');
 // Candidate function replacement and every fixture remain inside this
 // transaction and are always rolled back; live behavior is unchanged.
 await db.query(source.slice(start,end).replace('create function','create or replace function'));
 const commitSource=fs.readFileSync('supabase/pilot/011_observation_reconciliation.sql','utf8');
 await db.query(commitSource.slice(commitSource.indexOf('create function'),commitSource.lastIndexOf('commit;')).replace('create function','create or replace function'));
 for(const id of [admin,farmer,other])await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,'{}')",[id,`${id}@provider-qa.invalid`]);
 await db.query('insert into platform_admins(user_id) values($1)',[admin]);await db.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
 for(const id of [farmer,other])await db.query('select talazo_approve($1,$2,$3)',[id,`${id}@provider-qa.invalid`,'Provider QA farmer']);
 const month=(await db.query("select date_trunc('month',now() at time zone 'Africa/Harare')::date::text period")).rows[0].period;
 await db.query('select talazo_set_quota($1,1000000)',[month]);await db.query('select talazo_allocate($1,$2,20000)',[month,farmer]);
 const farm=(await db.query("select talazo_add_farm($1,'Provider QA farm','QA') id",[farmer])).rows[0].id;
 const polygon=square(32);
 await db.query("insert into talazo_provider_fields(provider_id,name,boundary,crop_code,sowing_date,remote_state,fingerprint) values('99001','Existing remote field',$1,'16','2026-10-01','active','first')",[JSON.stringify(polygon)]);
 async function denied(sql,args=[]){await db.query('savepoint deny');let rejected=false;try{await db.query(sql,args);}catch{rejected=true;}await db.query('rollback to savepoint deny');assert(rejected,sql);}
 await denied("select talazo_apply_provider_field('99001')");
 const result=(await db.query("select talazo_apply_provider_field('99001',$1,false,'Talazo label') value",[farm])).rows[0].value;
 const mapping=result.monitoring;assert.equal(result.action,'imported');
 const zone=(await db.query('select zone_id,status from talazo_monitoring where id=$1',[mapping])).rows[0];assert.equal(zone.status,'awaiting');
 const setup=(await db.query("select jsonb_build_object('boundary',boundary,'crop',crop_code,'sowing',sowing_date) value from talazo_zones where id=$1",[zone.zone_id])).rows[0].value;
 await denied("select talazo_commit_observations($1,'{}','{}','active',null)",[mapping]);
 await db.query("select talazo_commit_observations($1,$2,'{}','awaiting',null)",[mapping,JSON.stringify(setup)]);
 assert.equal((await db.query("select talazo_apply_provider_field('99001') value")).rows[0].value.monitoring,mapping);
 assert.equal((await db.query('select name from talazo_zones where id=$1',[zone.zone_id])).rows[0].name,'Talazo label','Unchanged remote metadata preserves the chosen local label');
 assert.equal((await db.query("select count(*) from talazo_monitoring where provider_id='99001'")).rows[0].count,'1');
 await db.query("update talazo_monitoring set status='active' where id=$1",[mapping]);
 await db.query("insert into talazo_observations(monitoring_id,data) values($1,'{}') on conflict(monitoring_id) do nothing",[mapping]);
 await db.query("insert into talazo_products(monitoring_id,product,observed_on,state,data) values($1,'advisory','20261113','ready','{}')",[mapping]);
 await db.query("update talazo_provider_fields set name='Remote renamed field',crop_code='6',fingerprint='second' where provider_id='99001'");
 await db.query("select talazo_apply_provider_field('99001')");
 const renamed=(await db.query('select name,crop_code from talazo_zones where id=$1',[zone.zone_id])).rows[0];assert.equal(renamed.name,'Remote renamed field');assert.equal(renamed.crop_code,'6');
 await denied("select talazo_commit_observations($1,$2,'{}','active',null)",[mapping,JSON.stringify(setup)]);
 assert.equal((await db.query('select * from talazo_products where monitoring_id=$1',[mapping])).rows.length,0,'Crop changes clear stale advice');
 const moved=square(32.01);
 await db.query("update talazo_provider_fields set boundary=$1,fingerprint='third' where provider_id='99001'",[JSON.stringify(moved)]);
 assert.equal((await db.query("select talazo_apply_provider_field('99001') value")).rows[0].value.action,'review');
 assert.deepEqual((await db.query('select boundary from talazo_zones where id=$1',[zone.zone_id])).rows[0].boundary,polygon);
 assert.equal((await db.query('select status from talazo_monitoring where id=$1',[mapping])).rows[0].status,'uncertain');
 await db.query("select talazo_apply_provider_field('99001',null,true)");
 assert.deepEqual((await db.query('select boundary from talazo_zones where id=$1',[zone.zone_id])).rows[0].boundary,moved);
 await db.query("update talazo_provider_fields set boundary=$1,fingerprint='too-big' where provider_id='99001'",[JSON.stringify(square(32.1,.01))]);
 await denied("select talazo_apply_provider_field('99001',null,true)");
 await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);
 assert.equal((await db.query('select * from talazo_provider_fields')).rows.length,0,'Inventory is admin-only');
 await denied("select talazo_apply_provider_field('99001',$1)",[farm]);
 await denied("update talazo_provider_fields set name='Forged' where provider_id='99001'");
 await denied('select talazo_claim_provider_sync(true)');
 await denied("select talazo_commit_observations($1,'{}','{}','active',null)",[mapping]);
 await db.query('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
 await db.query("update talazo_provider_fields set boundary=$1,fingerprint='paused',remote_state='paused',issue=null where provider_id='99001'",[JSON.stringify(moved)]);
 await db.query("select talazo_apply_provider_field('99001')");assert.equal((await db.query('select status from talazo_monitoring where id=$1',[mapping])).rows[0].status,'paused');
 console.log('PASS: verified existing-field import, explicit ownership, idempotency, remote name/crop changes, cache invalidation, boundary review, area/quota enforcement, explicit pause, admin-only inventory/RPCs and denied snapshot tampering. Transaction rolled back.');
}catch(e){console.error('Provider reconciliation failed:',e.message);process.exitCode=1;}finally{await db.query('rollback').catch(()=>{});await db.end();}
