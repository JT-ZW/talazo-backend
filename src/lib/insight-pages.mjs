export const insightPages=[
 ['health','Crop health'],['pests','Pests & diseases'],['weeds','Weeds'],
 ['nutrients','Nutrients'],['irrigation','Irrigation'],['yield','Yield outlook'],['soil','Soil insights']
];
/** @param {string} section */
export const isInsightPage=section=>insightPages.some(([id])=>id===section);
/** Activation is scoped to accessible saved fields in the current environment.
 * @param {any[]} farms @param {any[]} zones @param {any[]} monitoring @param {string} environment */
export function activeInsightZoneIds(farms,zones,monitoring,environment) {
 return zones.filter(z=>farms.some(f=>f.id===z.farm_id)&&monitoring.some(m=>m.zone_id===z.id&&m.environment===environment&&m.status==='active'&&Boolean(m.provider_id))).map(z=>z.id);
}
