// Read-only provider calls. --connect saves only an existing, verified boundary mapping.
// Never submits, deletes, pauses or resumes a paid field; never touches Auth sessions.
import pg from 'pg';
import {farmonaut,matchesRegisteredBoundary} from '../src/lib/server/farmonaut.mjs';
import {checkLiveConnection,liveFieldEntries} from '../src/lib/server/live-connection.mjs';
const provider=farmonaut({key:process.env.FARMONAUT_API_KEY||'',testMode:'false'});
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});
const connect=process.argv.includes('--connect');
const supplied=process.argv.find(v=>v.startsWith('--field-id='))?.slice(11);
if(supplied&&!/^\d+$/.test(supplied))throw Error('Use the numeric FieldID from Farmonaut; never supply an API key here.');
try{
 await db.connect();
 const checks=await checkLiveConnection(provider);
 console.log(JSON.stringify({checkedAt:new Date().toISOString(),environment:'live',checks}));
 const pending=(await db.query("select m.id,m.zone_id,z.boundary from talazo_monitoring m join talazo_zones z on z.id=m.zone_id where m.environment='live' and m.status='uncertain'")).rows;
 if(supplied&&pending.length!==1)throw Error('Manual FieldID requires exactly one pending live registration.');
 const fields=supplied?[]:checks.find(c=>c.endpoint==='getAllFieldIDs')?.ok?liveFieldEntries(await provider.call('getAllFieldIDs')):null;
 for(const row of pending){
  if(!supplied&&!fields){console.log(JSON.stringify({monitoring:row.id,connected:false,reason:'Field list unavailable; no registration or mapping changes made.'}));continue;}
  const marker=`Talazo ${row.zone_id}`;
  const candidates=supplied?[[supplied,'manual']]:fields.filter(([,name])=>name===marker||name.endsWith(`[${marker}]`));
  if(candidates.length!==1){console.log(JSON.stringify({monitoring:row.id,connected:false,candidates:candidates.length,reason:'Reconciliation still required. No replacement submitted.'}));continue;}
  const id=candidates[0][0];const metadata=await provider.call('getFarmerData',{FieldID:id});
  if(!matchesRegisteredBoundary(metadata,id,row.boundary.coordinates[0].slice(0,-1)))throw Error('Provider boundary did not match. No mapping changed.');
  if(connect){
   const saved=await db.query("update talazo_monitoring set provider_id=$2,status='awaiting',error=null where id=$1 and status='uncertain' returning id",[row.id,id]);
   if(saved.rowCount!==1)throw Error('Mapping changed concurrently; reload before continuing.');
  }
  console.log(JSON.stringify({monitoring:row.id,verified:true,connected:connect,reason:connect?'Existing field connected; observations can now synchronize.':'Verified existing field; rerun with --connect to save mapping.'}));
 }
 if(checks.some(c=>!c.ok))process.exitCode=1;
}catch(e){console.error(JSON.stringify({error:e.message}));process.exitCode=1;}finally{await db.end();}
