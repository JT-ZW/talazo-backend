// Recovery for interrupted test-account-isolation runs; never matches real users.
import pg from 'pg';import {createClient} from '@supabase/supabase-js';
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});
const service=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
try{
 await db.connect();const rows=(await db.query("select id,email from auth.users where email like 'talazo-isolation-%@example.invalid'")).rows;
 for(const u of rows){
  if(!/^talazo-isolation-[0-9a-f-]{36}@example\.invalid$/.test(u.email))throw Error('Unexpected QA identity');
  await db.query('begin');
  await db.query('delete from talazo_observations where monitoring_id in (select m.id from talazo_monitoring m join talazo_zones z on z.id=m.zone_id join talazo_farms f on f.id=z.farm_id where f.owner_id=$1)',[u.id]);
  await db.query('delete from talazo_monitoring where zone_id in (select z.id from talazo_zones z join talazo_farms f on f.id=z.farm_id where f.owner_id=$1)',[u.id]);
  await db.query('delete from talazo_zones where farm_id in (select id from talazo_farms where owner_id=$1)',[u.id]);
  await db.query('delete from talazo_farms where owner_id=$1',[u.id]);
  await db.query('delete from talazo_events where actor=$1',[u.id]);
  await db.query('delete from talazo_accounts where user_id=$1',[u.id]);await db.query('commit');
  if((await service.auth.admin.deleteUser(u.id)).error)throw Error('QA Auth cleanup failed');
 }
 console.log('Removed interrupted disposable isolation identities:',rows.length);
}finally{await db.query('rollback').catch(()=>{});await db.end();}
