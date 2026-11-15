/** Preserve missing values; provider negatives have already been clipped. @param {unknown} value */
export function normalizeIndex(value) {
 if(value===null||value===undefined||value==='')return null;
 const number=Number(value);
 return Number.isFinite(number)&&number>=0&&number<=100?number/100:null;
}
/** Accept the documented wrapper and the flat date map returned by test mode. @param {unknown} value */
export function sensedMap(value) {
 if(!value||typeof value!=='object')return {};
 const object=/** @type {Record<string,any>} */(value);
 const candidate=object.SensedDays||object;
 return Object.fromEntries(Object.entries(candidate).filter(([date])=>/^\d{8}$/.test(date)));
}
