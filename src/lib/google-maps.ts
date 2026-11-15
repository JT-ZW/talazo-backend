let loading:Promise<typeof google.maps>|undefined;
let authorizationFailed=false;
type MapsWindow=Window&{google?:typeof google;__talazoGoogleMapsReady?:()=>void;gm_authFailure?:()=>void};
/** One official SDK request shared by every map. Uses a website-restricted browser key. */
export function loadGoogleMaps(key:string):Promise<typeof google.maps>{
 if(typeof window==='undefined')return Promise.reject(new Error('Google Maps loads in the browser.'));
 if(!key.trim())return Promise.reject(new Error('Google Maps is not configured yet.'));
 if(authorizationFailed)return Promise.reject(new Error('Google Maps access was denied. Enable Maps JavaScript API in the key’s Google Cloud project, then reload the page.'));
 const root=window as MapsWindow;
 const ready=async()=>{if(root.google?.maps?.importLibrary)await root.google.maps.importLibrary('maps');if(authorizationFailed)throw new Error('Google Maps access was denied. Enable Maps JavaScript API, then reload the page.');if(!root.google?.maps?.Map)throw new Error('Google Maps did not initialize.');return root.google.maps;};
 if(loading)return loading;
 if(root.google?.maps?.Map){loading=ready().catch(e=>{loading=undefined;throw e;});return loading;}
 loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');let settled=false;
  const fail=(message:string)=>{if(settled)return;settled=true;clearTimeout(timer);loading=undefined;script.remove();reject(new Error(message));};
  const timer=setTimeout(()=>fail('Google Maps took too long to load. Check your connection and try again.'),25000);
  const previousAuthFailure=root.gm_authFailure;
  root.gm_authFailure=()=>{authorizationFailed=true;window.dispatchEvent(new Event('talazo:maps-auth-error'));fail('Google Maps access was denied. Enable Maps JavaScript API in the key’s Google Cloud project, then reload the page.');previousAuthFailure?.();};
  root.__talazoGoogleMapsReady=()=>{if(settled)return;void ready().then(maps=>{if(settled)return;settled=true;clearTimeout(timer);resolve(maps);}).catch(()=>fail('Google Maps could not initialize. Check API activation and reload the page.'));};
  const url=new URL('https://maps.googleapis.com/maps/api/js');url.search=new URLSearchParams({key:key.trim(),v:'weekly',loading:'async',callback:'__talazoGoogleMapsReady',language:'en'}).toString();
  script.src=url.toString();script.async=true;script.dataset.talazoGoogleMaps='true';const nonce=document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;if(nonce)script.nonce=nonce;
  script.onerror=()=>fail('Google Maps could not load. Check your connection or enter coordinates below.');document.head.append(script);
 });return loading;
}
