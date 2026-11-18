import {provider,service,rpc} from './pilot';
import {synchronizeFieldChange} from './field-change-provider.mjs';
/** Admin claim already reserved capacity. Failed writes require read-only reconciliation. */
export async function applyFieldChange(change:any,reconcile=false){
 const db=service(),p=provider();
 if(change.environment!==p.environment)throw Error('Change belongs to another provider environment.');
 try{
  if(!p.testing){
   const field=await synchronizeFieldChange(p,change,reconcile);
   const saved=await db.from('talazo_provider_fields').upsert({...field,present:true,seen_at:new Date().toISOString(),issue:null});
   if(saved.error)throw Error('Could not retain provider verification.');
  }
  await rpc(db,'talazo_complete_change',{p_id:change.id,p_lease:change.lease});
 }catch{
  await rpc(db,'talazo_uncertain_change',{p_id:change.id,p_lease:change.lease}).catch(()=>{});
  throw Error('Change needs administrator reconciliation. Capacity remains reserved; do not submit a replacement.');
 }
}
