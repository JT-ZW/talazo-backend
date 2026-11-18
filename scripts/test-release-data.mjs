// Candidate raster/alert/history schemas and fixtures always roll back.
import pg from 'pg';import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});
try{
 await db.connect();await db.query('begin');
 const sql=fs.readFileSync('supabase/pilot/014_georeferenced_products.sql','utf8');await db.query(sql.replace(/^begin;/,'').replace(/commit;\s*$/,''));
 if(!(await db.query("select to_regclass('public.talazo_alerts') is not null p")).rows[0].p){const s=fs.readFileSync('supabase/pilot/015_alerts_history.sql','utf8');await db.query(s.replace(/^begin;/,'').replace(/commit;\s*$/,''));}
 const [admin,farmer,other,farm,zone,m]=Array.from({length:6},randomUUID);
 for(const id of [admin,farmer,other]){await db.query('insert into auth.users(id,email) values($1,$2)',[id,id+'@release.invalid']);await db.query("insert into talazo_accounts(user_id,email,name,approved_by) values($1,$2,'QA',$1)",[id,id+'@release.invalid']);}
 await db.query('insert into platform_admins(user_id) values($1)',[admin]);await db.query("insert into talazo_farms(id,owner_id,name) values($1,$2,'QA')",[farm,farmer]);
 await db.query("insert into talazo_zones(id,farm_id,name,boundary,area_sqm,crop_code,crop_name) values($1,$2,'QA',$3,1000,'16','Potato')",[zone,farm,JSON.stringify({type:'Polygon',coordinates:[[[31,-17],[31.001,-17],[31.001,-17.001],[31,-17.001],[31,-17]]]})]);
 await db.query("insert into talazo_monitoring(id,zone_id,environment,status,provider_id) values($1,$2,'test','active','release-fixture')",[m,zone]);
 await db.query('insert into talazo_observations(monitoring_id,data) values($1,$2)',[m,JSON.stringify({products:{getSensedDays:{value:{20261113:'yes'}},getSARDays:{value:{20261112:'yes'}}}})]);
 async function denied(s,args=[]){await db.query('savepoint deny');let bad=false;try{await db.query(s,args);}catch{bad=true;}await db.query('rollback to savepoint deny');assert(bad,s);}
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[farmer]);
 assert((await db.query("select talazo_claim_product($1,'overlay:ndvi','20261113') value",[m])).rows[0].value.lease);
 await denied("select talazo_claim_product($1,'overlay:rsm','20261113')",[m]);
 await denied("select talazo_claim_history($1,'2026-10-01')",[m]);
 await db.query('select talazo_set_alert_preferences(true,.15)');await denied('select talazo_set_alert_preferences(true,0)');
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
 const history=(await db.query("select talazo_claim_history($1,'2026-10-01') id",[m])).rows[0].id;assert(history);
 await denied("select talazo_claim_history($1,'2026-10-01')",[m]);
 const alert=(await db.query("insert into talazo_alerts(monitoring_id,observed_on,rule,data) values($1,'20261113','ndvi_drop','{}') returning id",[m])).rows[0].id;
 await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);
 assert.equal((await db.query('select * from talazo_alerts')).rows.length,0);assert.equal((await db.query('select * from talazo_history_requests')).rows.length,0);assert.equal((await db.query('select * from talazo_alert_preferences')).rows.length,0);
 await denied('select talazo_acknowledge_alert($1)',[alert]);await denied("select talazo_claim_product($1,'overlay:ndvi','20261113')",[m]);
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[farmer]);await db.query('select talazo_acknowledge_alert($1)',[alert]);assert((await db.query('select acknowledged_at from talazo_alerts where id=$1',[alert])).rows[0].acknowledged_at);
 console.log('PASS: scoped georeferenced product/date leases, admin history approval/deduplication, own alert preferences, cross-user alert/history denial and acknowledgement. Rolled back.');
}finally{await db.query('rollback').catch(()=>{});await db.end();}
