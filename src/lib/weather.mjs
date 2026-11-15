/** OpenWeather normal-format values are Kelvin. Never coerce missing readings to zero. @param {unknown} value */
export function celsius(value) {
 if(value===null||value===undefined||value==='')return null;
 const n=Number(value);return Number.isFinite(n)?n-273.15:null;
}
/** @param {any} value */
export function weatherDays(value) {
 const source=value?.normal||value;
 if(!Array.isArray(source?.daily))return [];
 return source.daily.filter((/** @type {any} */ d)=>Number.isFinite(d?.dt)).slice(0,7).map((/** @type {any} */ d)=>({
  timestamp:d.dt,min:celsius(d.temp?.min),max:celsius(d.temp?.max),
  description:d.weather?.[0]?.description||'Forecast',
  rain:typeof d.rain==='number'?d.rain:null,
  probability:typeof d.pop==='number'&&d.pop>=0&&d.pop<=1?Math.round(d.pop*100):null,
  humidity:typeof d.humidity==='number'?d.humidity:null,
  wind:typeof d.wind_speed==='number'?d.wind_speed:null
 }));
}
/** Bounding-box midpoint stays deterministic, including concave boundaries; used only as weather reference. @param {any} boundary */
export function weatherPoint(boundary) {
 const points=boundary?.coordinates?.[0];
 if(!Array.isArray(points)||points.length<4)throw new Error('Map a valid field first.');
 const xs=points.map(p=>Number(p[0])),ys=points.map(p=>Number(p[1]));
 if(xs.some(n=>!Number.isFinite(n)||Math.abs(n)>180)||ys.some(n=>!Number.isFinite(n)||Math.abs(n)>90))throw new Error('Invalid field coordinates.');
 return {Latitude:String((Math.min(...ys)+Math.max(...ys))/2),Longitude:String((Math.min(...xs)+Math.max(...xs))/2)};
}
