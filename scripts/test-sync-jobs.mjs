// Candidate schema and all fixtures are always rolled back; no provider calls.
import pg from 'pg';import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});
try{
 await db.connect();await db.query('begin');
 const exists=(await db.query("select to_regclass('public.talazo_jobs') is not null present")).rows[0].present;
 if(!exists){const sql=fs.readFileSync('supabase/pilot/012_sync_jobs.sql','utf8');await db.query(sql.replace(/^begin;/,'').replace(/commit;\s*$/,''));}
 await db.query('delete from talazo_jobs');
 const token=(await db.query("select talazo_claim_job('fields:test') token")).rows[0].token;assert(token);
 assert.equal((await db.query("select talazo_claim_job('fields:test') token")).rows[0].token,null);
 async function denied(sql,args=[]){await db.query('savepoint denied');let failed=false;try{await db.query(sql,args);}catch{failed=true;}await db.query('rollback to savepoint denied');assert(failed,sql);}
 await denied("select talazo_finish_job('fields:test',$1,true,'completed')",[randomUUID()]);
 await db.query("select talazo_finish_job('fields:test',$1,false,'retry')",[token]);
 assert.equal((await db.query("select failures from talazo_jobs where name='fields:test'")).rows[0].failures,1);
 await db.query("update talazo_jobs set started_at=now()-interval '6 minutes',lease_until=now()-interval '1 minute' where name='fields:test'");
 assert((await db.query("select talazo_claim_job('fields:test') token")).rows[0].token);
 await db.query('set local role authenticated');
 assert.equal((await db.query('select * from talazo_jobs')).rows.length,0);
 await denied("select talazo_claim_job('fields:test')");await denied("select talazo_claim_sync('test')");
 await db.query('reset role');
 const id=randomUUID(),farm=randomUUID(),zone=randomUUID(),monitoring=randomUUID();
 await db.query("insert into auth.users(id,email) values($1,$2)",[id,id+'@jobs.invalid']);
 await db.query("insert into talazo_accounts(user_id,email,name,approved_by) values($1,$2,'QA',$1)",[id,id+'@jobs.invalid']);
 await db.query("insert into talazo_farms(id,owner_id,name) values($1,$2,'QA')",[farm,id]);
 await db.query("insert into talazo_zones(id,farm_id,name,boundary,area_sqm,crop_code,crop_name) values($1,$2,'QA',$3,1000,'16','Potato')",[zone,farm,JSON.stringify({type:'Polygon',coordinates:[[[31,-17],[31.001,-17],[31.001,-17.001],[31,-17.001],[31,-17]]]})]);
 const period=(await db.query("select date_trunc('month',now() at time zone 'Africa/Harare')::date p")).rows[0].p;
 await db.query('insert into talazo_periods(period,quota_sqm) values($1,100000) on conflict do nothing',[period]);
 await db.query('insert into talazo_allocations(period,user_id,sqm) values($1,$2,1000)',[period,id]);
 await db.query("update talazo_monitoring set last_sync=now() where environment='test'");
 await db.query("insert into talazo_monitoring(id,zone_id,environment,status,provider_id) values($1,$2,'test','active','job-fixture')",[monitoring,zone]);
 const claim=(await db.query("select talazo_claim_sync('test') item")).rows[0].item;assert.equal(claim.monitoring,monitoring);
 assert.equal((await db.query("select talazo_claim_sync('test') item")).rows[0].item,null);
 await db.query('select talazo_finish_sync($1,$2,false)',[monitoring,claim.lease]);
 assert.equal((await db.query("select talazo_claim_sync('test') item")).rows[0].item,null,'Failure backoff prevents immediate retry');
 assert((await db.query('select next_attempt>now() future from talazo_sync_attempts where monitoring_id=$1',[monitoring])).rows[0].future);
 console.log('PASS: exclusive job/field leases, expired-run recovery, retry backoff, stale-token denial and admin-only health. All changes rolled back.');
}finally{await db.query('rollback').catch(()=>{});await db.end();}
