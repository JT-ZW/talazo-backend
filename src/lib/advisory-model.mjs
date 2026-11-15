/** Strict numeric parsing: missing and descriptive values never become zero. @param {unknown} value */
export function numberValue(value){if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;}
/** @param {unknown} value */
export function percentValue(value){if(typeof value!=='string'||!/^\d+(\.\d+)?%$/.test(value.trim()))return null;const n=Number(value.trim().slice(0,-1));return n>=0&&n<=100?n:null;}
/** @param {any} product @param {string} date */
export function datedAdvisory(product,date){
 if(!date||product?.requestedDate!==date)return null;
 const value=product.value;
 if(value?.SensedDay&&value.SensedDay!==date)return null;
 return value?.advisory&&typeof value.advisory==='object'?value:null;
}
/** @param {any} value */
export function healthShares(value){
 const labels={green:'Healthy crop',orange:'Crop needs care',purple:'Needs water',red:'Crop & water poor',white:'Cloud or no crop'};
 return Object.entries(labels).map(([key,label])=>({key,label,percent:percentValue(value?.[key])}));
}
/** Provider risks are predictions, never confirmations. @param {any} advisory @param {string} topic */
export function riskItems(advisory,topic){
 const a=advisory||{};
 const groups=topic==='weeds'?[['Weed',a.Weed?.potential_weeds]]:[['Disease',a['Pest and Disease']?.potential_diseases],['Pest',a['Pest and Disease']?.potential_pests]];
 return groups.flatMap(([kind,items])=>Array.isArray(items)?items.filter(v=>v&&typeof v==='object').map(v=>({kind,name:v.disease_name||v.pest_name||v.weed_name||'Unnamed risk',probability:percentValue(v.probability_percentage),level:v.probability||'Not provided',solution:v.solution})):[]);
}
/** @param {any} fertilizer */
export function nutrientItems(fertilizer){
 const names={N:'Nitrogen',P:'Phosphorus',K:'Potassium',S:'Sulphur',Zn:'Zinc'};
 return Object.entries(names).filter(([code])=>fertilizer?.[code]).map(([code,name])=>({code,name,rate:numberValue(fertilizer[code].application_rate),organicRate:numberValue(fertilizer[code].application_rate_organic),unit:fertilizer.application_rate_units||'Unit not provided',level:fertilizer[code].critical||'Not provided',source:fertilizer[code]['source_of_'+code]||'',organicSource:fertilizer[code].organic_source||''}));
}
/** @param {any} irrigation */
export function irrigationDays(irrigation){
 return Object.entries(irrigation||{}).filter(([d,v])=>/^\d{8}$/.test(d)&&v&&typeof v==='object').sort(([a],[b])=>a.localeCompare(b)).map(([date,v])=>({date,quantity:numberValue(v.quantity),unit:irrigation.quantity_units||'Unit not provided',time:typeof v.time_range==='string'&&/\d/.test(v.time_range)?v.time_range:null,methods:Array.isArray(v.irrigation_methods)?v.irrigation_methods:[]}));
}
/** A distribution is area in ten index bins, not a diagnosis or custom thresholds.
 * @param {any} value @param {string} layer */
export function indexDistribution(value,layer){
 const source=value?.[layer];
 if(!Array.isArray(source)||source.length!==10)return [];
 const areas=source.map(numberValue);if(areas.some(n=>n===null||n<0))return [];
 const total=areas.reduce((n,a)=>Number(n)+Number(a),0)||0;if(!total)return [];
 return areas.map((area,i)=>({range:`${(i/10).toFixed(1)}–${((i+1)/10).toFixed(1)}`,area:Number(area),percent:Number(area)/total*100}));
}
