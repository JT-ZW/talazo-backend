import {normalizeIndex} from './server/farmonaut.mjs';
import {sensedMap} from './satellite.mjs';
/** Only comparable actual optical observations can trigger a drop alert.
 * @param {any} products @param {number} threshold */
export function ndviDrop(products,threshold){
 const values=products?.getAllIndexValues?.value?.ndvi||{};
 const sensed=sensedMap(products?.getSensedDays?.value);
 const dates=Object.keys(sensed).filter(d=>/^\d{8}$/.test(d)&&!sensed[d]?.isCloudy&&normalizeIndex(values[d])!==null).sort().reverse();
 if(dates.length<2||!Number.isFinite(threshold)||threshold<=0||threshold>1)return null;
 const current=normalizeIndex(values[dates[0]]),previous=normalizeIndex(values[dates[1]]);
 if(current===null||previous===null||previous-current+1e-10<threshold)return null;
 return {date:dates[0],previousDate:dates[1],current,previous,drop:previous-current,message:'Vegetation index fell between two usable observations. Inspect the field; this is not a diagnosis.'};
}
