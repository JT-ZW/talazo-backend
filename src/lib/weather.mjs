/** Preserve numeric zero; reject absent, malformed and out-of-range measurements. @param {unknown} value */
export function finiteReading(value,min=-Infinity,max=Infinity){return typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max?value:null;}
/** Weather condition IDs are the provider's OpenWeather codes. @param {any} condition */
export function weatherKind(condition){const id=condition?.id;const text=String(condition?.main||condition?.description||'').toLowerCase();if(id>=200&&id<300||text.includes('thunder'))return 'storm';if(id>=300&&id<600||text.includes('rain')||text.includes('drizzle'))return 'rain';if(id>=600&&id<700||text.includes('snow'))return 'snow';if(id>=700&&id<800||text.includes('mist')||text.includes('fog'))return 'mist';if(id===800||text.includes('clear'))return 'sun';return 'cloud';}
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
  // OpenWeather omits rain when the phenomenon is absent; explicit null/invalid stays unavailable.
  rain:!Object.hasOwn(d,'rain')?0:finiteReading(d.rain,0),
  icon:weatherKind(d.weather?.[0]),
  probability:typeof d.pop==='number'&&d.pop>=0&&d.pop<=1?Math.round(d.pop*100):null,
  humidity:finiteReading(d.humidity,0,100),
  wind:finiteReading(d.wind_speed,0)
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
