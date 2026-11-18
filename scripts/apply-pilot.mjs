import pg from 'pg';
import fs from 'node:fs/promises';
const connectionString=process.env.SUPABASE_DB_URL;
if(!connectionString)throw new Error('Add SUPABASE_DB_URL to your local .env; its value is never printed.');
const db=new pg.Client({connectionString});
const file=process.argv[2]||'002_satellite.sql';
if(!/^0(0[2-9]|1[0-6])_[a-z_]+\.sql$/.test(file))throw new Error('Unknown pilot migration');
try{
 await db.connect();
 const existing=await db.query("select to_regclass('public.talazo_accounts') as present");
 if(file==='002_satellite.sql'&&existing.rows[0].present)throw new Error('Pilot tables already exist. Review migration state before applying again.');
 await db.query(await fs.readFile('supabase/pilot/'+file,'utf8'));
 console.log('Satellite pilot migration applied.');
}catch(e){console.error('Migration failed:',e.code||'connection or validation error');process.exitCode=1;}finally{await db.end();}
