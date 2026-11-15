import {matchesRegisteredBoundary} from './farmonaut.mjs';

/** Read-only checks. Account usage alone does not establish working field access.
 * @param {{call:Function}} provider */
export async function checkLiveConnection(provider) {
 const endpoints=['getMyUsage','getAllFieldIDs'];
 const results=await Promise.allSettled(endpoints.map(endpoint=>provider.call(endpoint)));
 return endpoints.map((endpoint,i)=>{
  const result=results[i];
  if(result.status==='rejected')return {endpoint,ok:false,message:result.reason instanceof Error?result.reason.message:'Provider unavailable'};
  if(endpoint==='getAllFieldIDs'){
   try{return {endpoint,ok:true,message:`Field list available (${liveFieldEntries(result.value).length} fields).`};}
   catch{return {endpoint,ok:false,message:'Farmonaut returned a sample or invalid field list in live mode.'};}
  }
  return {endpoint,ok:true,message:'Account usage endpoint responded. This does not verify field monitoring access.'};
 });
}

/** Production IDs are documented as numeric strings. Reject example placeholders.
 * @param {unknown} value @returns {[string,string][]} */
export function liveFieldEntries(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid live field list.');
 const entries=Object.entries(value);
 if(entries.some(([id,name])=>!/^\d+$/.test(id)||typeof name!=='string'))throw new Error('Invalid live field list.');
 return entries;
}

/** Discover only the uniquely named field submitted by Talazo; never creates fields.
 * @param {{call:Function}} provider @param {{id:string,boundary:any}} zone */
export async function findRegisteredField(provider,zone){
 const entries=liveFieldEntries(await provider.call('getAllFieldIDs'));
 const marker=`Talazo ${zone.id}`;
 const candidates=entries.filter(([,name])=>name===marker||name.endsWith(`[${marker}]`));
 if(candidates.length!==1)throw new Error(candidates.length?'Multiple Farmonaut fields match this registration. Review them before connecting.':'No uniquely named Farmonaut field was found. This check does not submit a replacement.');
 const id=candidates[0][0];
 const metadata=await provider.call('getFarmerData',{FieldID:id});
 if(!matchesRegisteredBoundary(metadata,id,zone.boundary.coordinates[0].slice(0,-1)))throw new Error('Farmonaut did not confirm the saved field boundary. No mapping was changed.');
 return id;
}

/** Keep a stable marker for reconciliation while making fields recognisable in Farmonaut.
 * @param {{id:string,name:string}} zone @param {{name?:string,district?:string}} farm */
export function fieldDetails(zone,farm){
 return {FieldDescription:`${farm.name||'Farm'} / ${zone.name} [Talazo ${zone.id}]`,FieldAddress:farm.district||''};
}
