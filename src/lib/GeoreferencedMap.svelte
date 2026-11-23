<script lang="ts">
 import {displayText} from './display-text.mjs';
 import {onMount,untrack} from 'svelte';import * as env from '$app/env/public';import {loadGoogleMaps} from './google-maps';
 let {record,date,layer,boundary,compact=false,onOpenImage}:{record:any,date:string,layer:string,boundary?:any,compact?:boolean,onOpenImage?:()=>void}=$props();
 let element:HTMLDivElement,map:google.maps.Map|undefined,overlay:google.maps.GroundOverlay|undefined,outline:google.maps.Polygon|undefined;
 let ready=$state(false),busy=$state(false),message=$state('Preparing your field map…'),opacity=$state(.65),mode=$state('satellite'),shown=$state(false),details=$state<any>(null);
 type Raster={url:string;bounds:google.maps.LatLngBoundsLiteral;width:number;height:number;source:string;sample?:boolean};
 const cache=new Map<string,{raster:Raster;expires:number}>();
 let raster=$state.raw<Raster>();
 let mapLoading=$state(true);
 let mapError=$state('');
 let retryAt=$state(0);
 let disposed=false,controller:AbortController|undefined,version=0,retryTimer:ReturnType<typeof setTimeout>|undefined;
 function fit(){if(!map||!boundary?.coordinates?.[0])return;const bounds=new google.maps.LatLngBounds();for(const p of boundary.coordinates[0])bounds.extend({lat:p[1],lng:p[0]});map.fitBounds(bounds,65);}
 onMount(()=>{
  disposed=false;
  const denied=()=>{
   version++;
   controller?.abort();
   overlay?.setMap(null);
   ready=false;mapLoading=false;busy=false;shown=false;details=null;raster=undefined;
   mapError='Google Maps access is unavailable. You can open the original satellite image.';
  };
  window.addEventListener('talazo:maps-auth-error',denied);
  void loadGoogleMaps(env.PUBLIC_GOOGLE_MAPS_API_KEY||'').then(api=>{
   if(disposed)return;
   map=new api.Map(element,{center:{lat:-17.8,lng:31.05},zoom:12,maxZoom:22,mapTypeId:'satellite',mapTypeControl:false,streetViewControl:false,fullscreenControl:true,tilt:0,gestureHandling:'cooperative'});
   ready=true;mapLoading=false;
  }).catch(e=>{if(!disposed){mapLoading=false;mapError=e.message;controller?.abort();busy=false;}});
  return()=>{
   disposed=true;version++;controller?.abort();clearTimeout(retryTimer);
   window.removeEventListener('talazo:maps-auth-error',denied);
   overlay?.setMap(null);outline?.setMap(null);
  };
 });
 $effect(()=>{if(!ready||!map||!boundary?.coordinates?.[0])return;const paths=boundary.coordinates[0].map((p:number[])=>({lat:p[1],lng:p[0]}));outline?.setMap(null);outline=new google.maps.Polygon({map,paths,strokeColor:'#ffffff',strokeWeight:2,fillOpacity:0,clickable:false});fit();});
 $effect(()=>{
  const id=record.id,d=date,l=layer;
  if(!id||!d||!l||mapError){
   version++;controller?.abort();clearTimeout(retryTimer);
   raster=undefined;shown=false;busy=false;details=null;retryAt=0;
   message='Select an available observation to load the overlay.';
   return;
  }
  untrack(()=>void load());
 });
 $effect(()=>{
  const image=raster,instance=ready&&map;
  if(!image||!instance)return;
  const mounted=new google.maps.GroundOverlay(image.url,image.bounds,{opacity:untrack(()=>Number(opacity)),clickable:false});
  overlay=mounted;
  mounted.setMap(instance);
  details=image;shown=true;
  return()=>{mounted.setMap(null);if(overlay===mounted)overlay=undefined;};
 });
 $effect(()=>{const loaded=ready;void loaded;overlay?.setOpacity(Number(opacity));map?.setMapTypeId(mode);});
 async function load(){
  const token=++version;
  controller?.abort();
  clearTimeout(retryTimer);
  retryAt=0;
  controller=new AbortController();
  const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(90000)]);
  raster=undefined;
  overlay?.setMap(null);
  shown=false;details=null;busy=true;message='Requesting dated satellite pixels.';
  const requested={monitoring:record.id,date,layer};
  const key=JSON.stringify(requested);
  const saved=cache.get(key);
  if(saved&&saved.expires>Date.now()){
   raster=saved.raster;
   message='Verified geographic alignment for the selected observation.';
   busy=false;
   return;
  }
  const deadline=Date.now()+90000;
  try{
   while(Date.now()<deadline&&!signal.aborted){
    const response=await fetch('/api/satellite/overlay',{
     method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(requested),signal
    });
    const result=await response.json().catch(()=>null);
    if(disposed||token!==version)return;
    if(response.ok&&result?.state==='pending'){
     message='The provider is preparing the overlay. You can view the saved boundary while it loads.';
     await new Promise(resolve=>setTimeout(resolve,2500));
     continue;
    }
    if(!response.ok||result?.state!=='ready'){
     const until=Date.parse(result?.retryAfter||'');
     if(until>Date.now()){
      retryAt=until;
      retryTimer=setTimeout(()=>retryAt=0,until-Date.now());
     }
     throw Error(result?.error||'The mapped observation could not be loaded.');
    }
    if(result.value.sample)throw Error('Sample imagery is available in the original image view.');
    const {url,bounds}=result.value;
    const image=new Image();
    image.src=url;
    await image.decode().catch(()=>{throw Error('The mapped image could not be displayed.');});
    if(disposed||token!==version||signal.aborted)return;
    const verified={...result.value,url:image.src,bounds};
    if(cache.size>=8)cache.delete(cache.keys().next().value!);
    cache.set(key,{raster:verified,expires:Date.now()+5*60*1000});
    raster=verified;
    message='Verified geographic alignment for the selected observation.';
    return;
   }
   message='The overlay is still processing. You can check again or open the original image.';
  }catch(e){
   if(!disposed&&token===version&&!controller?.signal.aborted){
    const error=e instanceof Error?e.message:'Mapped imagery unavailable.';
    message=/timed out|connection failed|failed to fetch/i.test(error)?'The satellite provider did not respond in time.':error;
   }
  }finally{
   if(!disposed&&token===version)busy=false;
  }
 }
</script>
<section class="geo-map" class:compact aria-label="Geographic crop monitoring"><div class="map-toolbar"><label>Basemap<select bind:value={mode}><option value="satellite">Satellite</option><option value="hybrid">Hybrid</option><option value="roadmap">Street</option><option value="terrain">Terrain</option></select></label><label>Data opacity <span>{Math.round(Number(opacity)*100)}%</span><input aria-label="Data opacity" type="range" min="0" max="1" step="0.05" bind:value={opacity}/></label><button type="button" class="p-button subtle" disabled={!ready} onclick={fit}>Fit field</button><button type="button" class="p-button subtle" disabled={!ready||busy||!date||retryAt>0} onclick={load}>{busy?'Loading overlay…':'Retry overlay'}</button></div><div class="map-stage"><div class="map" aria-busy={busy||mapLoading} bind:this={element}></div><div class="map-badge"><span>{layer.toUpperCase()} / {date||'Awaiting observation'}</span><strong>{shown?'Satellite overlay active':busy?'Preparing satellite overlay':'Field boundary · overlay unavailable'}</strong></div>
 {#if busy||mapLoading}<div class="overlay-loading"><div class="overlay-loading-card" role="status"><img src="/images/talazo-logo-cropped.png" alt="" width="394" height="141"/><strong>{mapLoading?'Loading field map':'Preparing satellite overlay'}</strong><span>Keep browsing while the imagery loads.</span></div></div>{/if}
 </div><div class="map-status" class:available={shown} role="status"><strong>{shown?'Mapped observation':busy||mapLoading?'Preparing mapped observation':'Satellite overlay needs attention'}</strong><p>{displayText(mapError||message)}</p>{#if details}<p>Raster grid: {details.width} × {details.height} pixels. {displayText(details.source)}. Opacity blends data with the Google basemap.</p>{/if}{#if retryAt}<p>Retry available at {new Date(retryAt).toLocaleTimeString('en-GB',{timeZone:'Africa/Harare'})} CAT.</p>{/if}{#if !shown&&!busy&&!mapLoading&&onOpenImage}<button type="button" class="p-button subtle" onclick={onOpenImage}>View original satellite image</button>{/if}</div><p class="caption">Satellite pixels describe the selected index and acquisition date. The Google basemap may be from a different date. Field-wide advice does not locate individual pests or nutrient deficiencies; coloured zones require spatial data. Small fields can contain only a few source pixels, so genuine uniform areas remain uniform.</p></section>
<style>.geo-map{background:#fffef8;color:#163f32}.map-toolbar{display:flex;gap:14px;flex-wrap:wrap;align-items:end;padding:18px 22px;border-bottom:1px solid #dce4d3}.map-toolbar label{display:grid;gap:6px;font-size:11px}.map-toolbar label span{font-size:10px;color:#60735e}.map-toolbar select{padding:9px;font-size:12px}.map-toolbar .p-button{font-size:11px;padding:11px 14px}.map-stage{position:relative}.map{height:580px;background:#eaf0e2}.map-badge{position:absolute;top:14px;left:14px;max-width:calc(100% - 80px);background:#143f33ef;color:#fff;padding:12px 16px;border-radius:9px;pointer-events:none;box-shadow:0 3px 18px #0002}.map-badge span{display:block;font-size:9px;letter-spacing:.1em;color:#d7e99b}.map-badge strong{display:block;font-size:11px;font-weight:500;margin-top:6px}.map-status{padding:16px 22px;background:#f6efdc;border-top:1px solid #e4dcc1}.map-status.available{background:#eef4e3}.map-status strong{font-size:12px}.map-status p{font-size:11px;margin:6px 0 0;line-height:1.7}.caption{padding:16px 22px;margin:0;font-size:10px!important;line-height:1.8;color:#61745e}@media(max-width:600px){.map{height:430px}.map-toolbar{padding:14px;gap:10px}.map-status{padding:14px}.caption{padding:14px}.map-badge{left:10px;top:10px;padding:10px}.map-toolbar input{max-width:140px}} .compact .map{height:clamp(340px,40vw,480px)}
 .compact .map-toolbar{padding-block:12px}
 .compact .map-status,.compact .caption{padding-block:10px}
 .map-status button{margin-top:8px;min-height:38px}
  .overlay-loading{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;padding:18px}
 .overlay-loading-card{display:grid;justify-items:center;gap:8px;text-align:center;padding:18px 24px;border:1px solid #d6e2ce;border-radius:15px;background:#fffef8f5;box-shadow:0 12px 38px #123e3150}
 .overlay-loading-card img{width:min(170px,45vw);height:auto;animation:overlay-pulse 2s ease-in-out infinite}
 .overlay-loading-card strong{font-size:16px}.overlay-loading-card span{font-size:13px;color:#4a634e}
 @keyframes overlay-pulse{0%,100%{transform:scale(.96);opacity:.82}50%{transform:scale(1);opacity:1}}
 @media(prefers-reduced-motion:reduce){.overlay-loading-card img{animation:none}}
 </style>
