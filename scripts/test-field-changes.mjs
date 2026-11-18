// Database fixtures and candidate migration always roll back. No provider writes.
import pg from 'pg';import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});
try{
 await db.connect();await db.query('begin');
 const exists=(await db.query("select to_regclass('public.talazo_field_changes') is not null present")).rows[0].present;
 if(!exists){const sql=fs.readFileSync('supabase/pilot/013_field_changes.sql','utf8');await db.query(sql.replace(/^begin;/,'').replace(/commit;\s*$/,''));}
 const candidate=fs.readFileSync('supabase/pilot/016_field_change_guards.sql','utf8');await db.query(candidate.slice(candidate.indexOf('create or replace function'),candidate.indexOf("notify pgrst")));
 const [admin,farmer,other,farm,zone,monitoring]=Array.from({length:6},randomUUID);
 for(const id of [admin,farmer,other]){await db.query('insert into auth.users(id,email) values($1,$2)',[id,id+'@changes.invalid']);await db.query("insert into talazo_accounts(user_id,email,name,approved_by) values($1,$2,'QA',$1)",[id,id+'@changes.invalid']);}
 await db.query('insert into platform_admins(user_id) values($1)',[admin]);
 await db.query('insert into talazo_farms(id,owner_id,name) values($1,$2,$3)',[farm,farmer,'QA']);
 const boundary={type:'Polygon',coordinates:[[[32,-17],[32.001,-17],[32.001,-17.001],[32,-17.001],[32,-17]]]};
 await db.query("insert into talazo_zones(id,farm_id,name,boundary,area_sqm,crop_code,crop_name,sowing_date) values($1,$2,'QA',$3,12000,'16','Potatoes','2026-10-01')",[zone,farm,JSON.stringify(boundary)]);
 await db.query("insert into talazo_monitoring(id,zone_id,environment,status,provider_id) values($1,$2,'test','active','change-fixture')",[monitoring,zone]);
 const period=(await db.query("select date_trunc('month',now() at time zone 'Africa/Harare')::date p")).rows[0].p;
 await db.query('insert into talazo_periods(period,quota_sqm) values($1,100000000) on conflict(period) do update set quota_sqm=100000000',[period]);
 await db.query('insert into talazo_allocations(period,user_id,sqm) values($1,$2,20000)',[period,farmer]);
 async function denied(sql,args=[]){await db.query('savepoint deny');let failed=false;try{await db.query(sql,args);}catch{failed=true;}await db.query('rollback to savepoint deny');assert(failed,sql);}
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);
 await denied("select talazo_request_change($1,'6','Soya','2026-10-10')",[monitoring]);
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[farmer]);
 await denied("select talazo_request_change($1,'999','Mystery','2026-10-10')",[monitoring]);
 const change=(await db.query("select talazo_request_change($1,'6','Soya','2026-10-10') id",[monitoring])).rows[0].id;
 await denied("select talazo_request_change($1,'6','Soya','2026-10-10')",[monitoring]);
 await denied('select talazo_claim_change($1)',[change]);
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
 const claim=(await db.query('select talazo_claim_change($1) item',[change])).rows[0].item;assert(claim.lease);
 assert.equal((await db.query('select status from talazo_monitoring where id=$1',[monitoring])).rows[0].status,'registering');
 await db.query('select talazo_uncertain_change($1,$2)',[change,claim.lease]);
 assert.equal((await db.query('select state from talazo_field_changes where id=$1',[change])).rows[0].state,'uncertain');
 await denied('select talazo_claim_change($1)',[change]);
 await denied('select talazo_complete_change($1,$2)',[change,randomUUID()]);
 await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);
 assert.equal((await db.query('select * from talazo_field_changes where id=$1',[change])).rows.length,0);
 await denied('select talazo_complete_change($1,$2)',[change,claim.lease]);
 await db.query('reset role');await db.query('select talazo_complete_change($1,$2)',[change,claim.lease]);
 const saved=(await db.query('select crop_code,sowing_date::text from talazo_zones where id=$1',[zone])).rows[0];assert.equal(saved.crop_code,'6');assert.equal(saved.sowing_date,'2026-10-10');
 assert.equal((await db.query('select status from talazo_monitoring where id=$1',[monitoring])).rows[0].status,'awaiting');
 console.log('PASS: owner requests, standard crops, duplicate prevention, admin approval, capacity reservation, uncertain write/read-back lifecycle, stale token denial and cross-owner isolation. Rolled back.');
}finally{await db.query('rollback').catch(()=>{});await db.end();}
