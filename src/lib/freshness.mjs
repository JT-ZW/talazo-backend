/** Retrieval time does not mean a new satellite acquisition.
 * @param {string|null|undefined} fetched @param {string|null|undefined} error @param {number} [now] */
export function freshness(fetched,error,now=Date.now()){
 const time=fetched?Date.parse(fetched):NaN;
 if(!Number.isFinite(time))return {state:'waiting',label:'No successful retrieval yet'};
 if(error)return {state:'warning',label:'Latest refresh incomplete · saved data shown'};
 if(Math.max(0,(now-time)/3600000)>=12)return {state:'stale',label:'Saved data needs a refresh'};
 return {state:'current',label:'Saved data available'};
}

/** @param {{status:string,last_sync?:string|null,error?:string|null}} record */
export function monitoringNeedsReview(record){
 return ['uncertain','error'].includes(record.status)||Boolean(record.error)||
  (record.status==='active'&&freshness(record.last_sync,null).state!=='current');
}
