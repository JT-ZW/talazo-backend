import {provider,rpc,service} from './pilot';
import {liveFieldEntries} from './live-connection.mjs';
import {providerField} from './provider-metadata.mjs';

/** Provider-only reads, followed by scoped local reconciliation. Discovery never
 * assigns ownership, submits a field, or increases a paid subscription. */
export async function reconcileProviderAccount(force=false){
 const p=provider();if(p.testing)return {skipped:true,discovered:0,updated:0,review:0,failed:0};
 const db=service();const lease=await rpc(db,'talazo_claim_provider_sync',{p_force:force});
 if(!lease)return {skipped:true,discovered:0,updated:0,review:0,failed:0};
 let discovered=0,updated=0,review=0,failed=0;
 try{
  const entries=liveFieldEntries(await p.call('getAllFieldIDs'));
  if(entries.length>500)throw Error('Account has more than 500 fields; use a paginated reconciliation worker before synchronizing.');
  const stamp=new Date().toISOString();
  const known=await db.from('talazo_provider_fields').select('provider_id,seen_at,boundary');
  if(known.error)throw Error('Provider inventory could not be read.');
  const byId=new Map((known.data||[]).map(item=>[item.provider_id,item]));
  if(entries.length){const saved=await db.from('talazo_provider_fields').upsert(entries.map(([id,name])=>({provider_id:id,name,present:true})),{onConflict:'provider_id',defaultToNull:false});if(saved.error)throw Error('Provider field list could not be saved.');}
  discovered=entries.length;
  const queue=[...entries].sort(([a],[b])=>Number(Boolean(byId.get(a)?.boundary))-Number(Boolean(byId.get(b)?.boundary))||Date.parse(byId.get(a)?.seen_at||'1970-01-01')-Date.parse(byId.get(b)?.seen_at||'1970-01-01')).slice(0,6);
  // Bound concurrency and time. Failed detail reads preserve the last good
  // geometry, but are flagged and cannot be silently applied.
  for(let i=0;i<queue.length;i+=3){
   await Promise.all(queue.slice(i,i+3).map(async([id,name])=>{
    try{
     const field=providerField(await p.call('getFarmerData',{FieldID:id}),id,name);
     const saved=await db.from('talazo_provider_fields').upsert({...field,present:true,seen_at:stamp,issue:null});
     if(saved.error)throw Error('Could not save the verified provider inventory.');
     const mapped=await db.from('talazo_monitoring').select('id').eq('environment','live').eq('provider_id',id).maybeSingle();
     if(mapped.error)throw Error('Could not inspect the local field mapping.');
     if(mapped.data){
      const applied=await rpc(db,'talazo_apply_provider_field',{p_provider_id:id});
      if(applied.action==='review')review++;else if(applied.action!=='unchanged')updated++;
     }
    }catch(e){
     failed++;const message=e instanceof Error?e.message:'Provider field unavailable';
     // Update only diagnostic fields on failure, never replace valid geometry.
     const previous=await db.from('talazo_provider_fields').select('provider_id').eq('provider_id',id).maybeSingle();
     if(previous.data)await db.from('talazo_provider_fields').update({present:true,seen_at:stamp,issue:message}).eq('provider_id',id);
     else await db.from('talazo_provider_fields').insert({provider_id:id,name,present:true,seen_at:stamp,issue:message});
    }
   }));
  }
  // Only a successful complete list can establish absence. A failed list never
  // clears existing data or releases reserved hectares.
  const mappings=await db.from('talazo_monitoring').select('provider_id').eq('environment','live').not('provider_id','is',null).limit(501);
  if(mappings.error||(mappings.data||[]).length>500)throw Error('Connected-field inventory requires a paginated worker.');
  for(const item of mappings.data||[]){if(entries.some(([id])=>id===item.provider_id))continue;
   if(!byId.has(item.provider_id))await db.from('talazo_provider_fields').insert({provider_id:item.provider_id,name:'Previously connected provider field',present:false});
  }
  const inventory=await db.from('talazo_provider_fields').select('provider_id');
  if(inventory.error)throw Error('Provider inventory could not be read.');
  const ids=new Set(entries.map(([id])=>id));
  for(const item of inventory.data||[]){if(ids.has(item.provider_id))continue;
   await db.from('talazo_provider_fields').update({present:false,issue:'Not returned by the latest complete Farmonaut field list.'}).eq('provider_id',item.provider_id);
   await db.from('talazo_monitoring').update({status:'uncertain',error:'Field is absent from the Farmonaut account. Administrator review is required; reserved hectares have been retained.'}).eq('environment','live').eq('provider_id',item.provider_id).neq('status','registering');
  }
  const finish=await db.from('talazo_provider_sync').update({checked_at:stamp,error:failed?`${failed} field(s) need review`:null,lease_id:null,lease_until:null}).eq('id',true).eq('lease_id',lease);
  if(finish.error)throw Error('Account synchronization state could not be saved.');
  return {skipped:false,discovered,updated,review,failed};
 }catch(e){
  await db.from('talazo_provider_sync').update({error:e instanceof Error?e.message:'Provider account unavailable',lease_id:null,lease_until:null}).eq('id',true).eq('lease_id',lease);
  throw e;
 }
}

/** Used by mapped-field refreshes so edits in Farmonaut are checked even when
 * only a farmer is signed in. It never discovers or returns other fields. */
export async function reconcileMappedField(providerId:string){
 const p=provider();if(p.testing)return;
 const db=service();const previous=await db.from('talazo_provider_fields').select('seen_at,present,issue').eq('provider_id',providerId).maybeSingle();
 if(previous.data?.present&&!previous.data.issue&&Date.now()-Date.parse(previous.data.seen_at)<5*60000)return;
 const field=providerField(await p.call('getFarmerData',{FieldID:providerId}),providerId);
 const saved=await db.from('talazo_provider_fields').upsert({...field,present:true,seen_at:new Date().toISOString(),issue:null});
 if(saved.error)throw Error('Provider metadata could not be saved.');
 const result=await rpc(db,'talazo_apply_provider_field',{p_provider_id:providerId});
 if(result.action==='review')throw Error('The provider boundary changed and requires Talazo review.');
}
