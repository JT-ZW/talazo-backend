/** Validate provider image links before reporting them as available. Only known
 * public image/CDN hosts may be requested by the server; redirects are bounded.
 * @param {string} url @param {typeof fetch} [fetcher] */
export async function verifyProviderImage(url,fetcher=fetch){
 let target=new URL(url);
 const allowed=(/** @type {URL} */ u)=>u.protocol==='https:'&&['googleusercontent.com','googleapis.com','farmonaut.com','cloudfront.net'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d));
 for(let i=0;i<4;i++){
  if(!allowed(target)||target.username||target.password)throw new Error('The provider image host is not supported for automatic verification.');
  let response=await fetcher(target,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(15000)});
  if([301,302,303,307,308].includes(response.status)){
   const location=response.headers.get('location');if(!location)break;target=new URL(location,target);continue;
  }
  if([403,405].includes(response.status)){
   response=await fetcher(target,{method:'GET',headers:{Range:'bytes=0-1023'},redirect:'manual',signal:AbortSignal.timeout(15000)});
   await response.body?.cancel();
  }
  if(!response.ok)throw new Error(`Farmonaut’s image link is unavailable (HTTP ${response.status}).`);
  if(!response.headers.get('content-type')?.startsWith('image/'))throw new Error('Farmonaut’s image link did not return an image.');
  return;
 }
 throw new Error('The provider image redirect could not be verified.');
}
