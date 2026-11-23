export const FARMONAUT_BASE = 'https://us-central1-farmbase-b2f7e.cloudfunctions.net';
const endpoints = new Set(['getMyUsage','getAllFieldIDs','change_field_data','submitField','getSensedDays','getSARDays','getAllIndexValues','getFieldImage','getPresentWeather','getForecastWeather','getForecastWeatherFromLatLong','getFieldReport','generate_geotif_file','askJeevnAPI','getAdvisoryReport','getFieldIndexBreakdown','getFarmerData','pauseFieldMonitoring','resumeFieldMonitoring','updateCropCode','updateSowingDate','modifyFieldPoints','requestPreviousSatelliteData']);
export class ProviderError extends Error {
 /** @param {string} code @param {boolean} [uncertain] */
 constructor(code, uncertain=false) { super(code); this.code=code; this.uncertain=uncertain; }
}
/** @param {{key:string,testMode?:string,fetcher?:typeof fetch}} options */
export function farmonaut({key,testMode='true',fetcher=fetch}) {
 if (!['true','false'].includes(testMode)) throw new ProviderError('Invalid Farmonaut test mode');
 const testing=testMode==='true';
 return {testing, environment:testing?'test':'live',
  /** @param {string} endpoint @param {Record<string,unknown>} [body] */
  async call(endpoint,body={}) {
   if(!key) throw new ProviderError('Farmonaut key is missing');
   if(!endpoints.has(endpoint)) throw new ProviderError('Unsupported provider operation');
   let response;
   try { response=await fetcher(`${FARMONAUT_BASE}/${endpoint}`,{
    method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({...body,isTesting:testing}),signal:AbortSignal.timeout(endpoint==='generate_geotif_file'?60000:45000)
   }); } catch { throw new ProviderError('Provider request timed out or connection failed',true); }
   let data;
   try {data=await response.json();} catch {throw new ProviderError(`Provider returned ${response.ok?'an unreadable response':'HTTP '+response.status} (${response.headers.get('content-type')?.split(';')[0]||'unknown content type'})`,true);}
   if(!response.ok) throw new ProviderError(`Provider returned HTTP ${response.status}`,response.status>=500);
   if((data && typeof data==='object' && 'error' in data) || (typeof data==='string' && /^(?:Field (?:does not exist|is Paused|is Expired)|Request failed|Error|invalid|failed|No Farm Exists)/i.test(data))) throw new ProviderError('Provider could not complete the operation');
   return data;
  }
 };
}
/** Provider's clipped scale cannot recover negative raw indices. @param {unknown} value */
export function normalizeIndex(value) {
 if(value===null || value===undefined || value==='') return null;
 const number=Number(value);
 return Number.isFinite(number) && number>=0 && number<=100 ? number/100:null;
}
/** Reject documentation/sample metadata before connecting a paid field.
 * @param {any} response @param {string} id @param {number[][]} points */
export function matchesRegisteredBoundary(response,id,points){
 const field=response?.[id]||response;
 if(!field||String(field.FieldID)!==id||JSON.stringify(field).includes('{SatelliteVisitDate}'))return false;
 const coordinates=Object.values(field.Coordinates||{}).map((/** @type {any} */ p)=>[Number(p.Longitude),Number(p.Latitude)]);
 const unique=[...new Map(coordinates.filter(p=>p.every(Number.isFinite)).map(p=>[p.join(','),p])).values()];
 if(unique.length<3)return false;
 const near=(/** @type {number[]} */ a,/** @type {number[]} */ b)=>Math.abs(a[0]-b[0])<0.00001&&Math.abs(a[1]-b[1])<0.00001;
 return points.every(p=>unique.some(v=>near(p,v)))&&unique.every(p=>points.some(v=>near(p,v)));
}
