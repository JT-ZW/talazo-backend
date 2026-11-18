<script lang="ts">
 import {onMount} from 'svelte';
 import * as env from '$app/env/public';
 import {previewArea} from './area.mjs';
 import {boundaryJSON,parseBoundary,parseCorners,validPoint} from './map-boundary.mjs';
 import {loadGoogleMaps} from './google-maps';
 import {removeMapListeners} from './map-lifecycle.mjs';
 let {value=$bindable(''),editable=true}:{value?:string,editable?:boolean}=$props();
 let element:HTMLDivElement;
 let points=$state<google.maps.LatLngLiteral[]>([]),finished=$state(false),coordinates=$state('');
 let latitude=$state<number|undefined>(),longitude=$state<number|undefined>();
 let status=$state('Mark the field corners, then finish the boundary.'),mapState=$state('loading'),mapError=$state(''),mapType=$state('satellite');
 let map:google.maps.Map|undefined,polygon:google.maps.Polygon|undefined,api:typeof google.maps|undefined;
 let last='',updating=false,disposed=false,authDenied=$state(false);
 let pathListeners:google.maps.MapsEventListener[]=[],listeners:google.maps.MapsEventListener[]=[];
 let area=$derived(previewArea(value));
 const modes=[['satellite','Satellite'],['hybrid','Hybrid'],['roadmap','Street'],['terrain','Terrain']];
 function publish(){coordinates=points.map(p=>`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`).join('\n');last=boundaryJSON(points);value=last;}
 function paint(){
  if(!polygon||!api)return;updating=true;removeMapListeners(pathListeners);
  polygon.setPath(points);polygon.setEditable(editable&&finished&&points.length>=3);
  const path=polygon.getPath();
  const changed=()=>{if(updating)return;const next=path.getArray().map(p=>({lat:p.lat(),lng:p.lng()}));if(next.length>500||!next.every(validPoint)){status='Use at most 500 valid corners.';paint();return;}points=next;publish();status='Boundary adjusted. The selected area has been updated.';};
  pathListeners=['set_at','insert_at','remove_at'].map(event=>path.addListener(event,changed));updating=false;
 }
 function fit(){if(!map||!api||!points.length)return;const bounds=new api.LatLngBounds();points.forEach(p=>bounds.extend(p));map.fitBounds(bounds,50);}
 function replace(next:google.maps.LatLngLiteral[],complete=false){points=next;finished=complete;publish();paint();}
 function apply(){try{replace(parseCorners(coordinates),true);fit();status='Boundary loaded. Drag the corners or midpoint handles to adjust it.';}catch(e){status=e instanceof Error?e.message:'Check your coordinates.';}}
 function locate(){const p={lat:latitude,lng:longitude};if(!validPoint(p)){status='Enter valid decimal latitude and longitude.';return;}if(!map){status='Coordinates are valid. Add your field corners below while the map is unavailable.';return;}map.panTo(p);map.setZoom(18);status='Location found. Click around the field to mark its boundary.';}
 function finish(){if(points.length<3)return;finished=!finished;paint();status=finished?'Boundary finished. Drag corners or midpoint handles to adjust it.':'Click the map to add more corners.';}
 function add(event:google.maps.MapMouseEvent){if(!editable||finished||!event.latLng)return;if(points.length>=500){status='Maximum 500 corners reached.';return;}replace([...points,{lat:event.latLng.lat(),lng:event.latLng.lng()}]);status=`${points.length} corners. ${points.length>=3?'Finish the boundary to adjust its corners.':'Add at least three corners.'}`;}
 function external(text:string){if(text===last)return;try{points=text?parseBoundary(text):[];finished=!!text;last=text;coordinates=points.map(p=>`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`).join('\n');paint();fit();status=text?'Saved boundary displayed.':'Click the map to place field corners.';}catch(e){status=e instanceof Error?e.message:'Boundary could not be displayed.';}}
 $effect(()=>external(value));
 function disposeMap(){
  removeMapListeners([...listeners,...pathListeners]);listeners=[];pathListeners=[];
  try{polygon?.setMap(null);}catch{}try{map?.unbindAll();if(map&&api)api.event.clearInstanceListeners(map);}catch{}
  map=undefined;polygon=undefined;
 }
 function retry(){if(authDenied){window.location.reload();return;}void initialize();}
 async function initialize(){
  mapState='loading';mapError='';
  try{
   disposeMap();api=await loadGoogleMaps(env.PUBLIC_GOOGLE_MAPS_API_KEY||'');if(disposed)return;
   if(!(element instanceof HTMLElement)||!element.isConnected)throw new Error('The map view is no longer open. Reopen it to load Google Maps.');
   map=new api.Map(element,{center:points[0]||{lat:-17.8,lng:31.05},zoom:points.length?17:12,maxZoom:22,mapTypeId:mapType,mapTypeControl:false,streetViewControl:false,fullscreenControl:true,zoomControl:true,rotateControl:false,tilt:0,gestureHandling:'cooperative',clickableIcons:false,keyboardShortcuts:true});
   polygon=new api.Polygon({map,paths:points,strokeColor:'#e3ef99',strokeOpacity:1,strokeWeight:3,fillColor:'#154f3c',fillOpacity:.22,editable:editable&&finished});
   listeners=[map.addListener('click',add),polygon.addListener('click',add),map.addListener('maptypeid_changed',()=>{mapType=map?.getMapTypeId()||'satellite';try{localStorage.setItem('talazo.mapType',mapType);}catch{}})];
   paint();fit();if(!authDenied)mapState='ready';
  }catch(e){if(!disposed){mapState='error';mapError=e instanceof Error?e.message:'Google Maps could not load.';}}
 }
 onMount(()=>{
  disposed=false;try{const saved=localStorage.getItem('talazo.mapType');if(modes.some(([id])=>id===saved))mapType=saved!;}catch{}void initialize();
  const authFailure=()=>{authDenied=true;mapState='error';mapError='Google Maps access was denied. Enable Maps JavaScript API in the Google Cloud project that owns this key, check billing and website restrictions, then reload this page.';};
  window.addEventListener('talazo:maps-auth-error',authFailure);
  const observer=new ResizeObserver(()=>{if(map&&api&&!authDenied)api.event.trigger(map,'resize');});if(element instanceof HTMLElement)observer.observe(element);
  return()=>{disposed=true;observer.disconnect();window.removeEventListener('talazo:maps-auth-error',authFailure);disposeMap();};
 });
</script>
{#if editable}<div class="map-locate"><label class="p-field">Go to latitude<input type="number" step="any" min="-90" max="90" bind:value={latitude} placeholder="-17.8000"/></label><label class="p-field">Longitude<input type="number" step="any" min="-180" max="180" bind:value={longitude} placeholder="31.0500"/></label><button type="button" class="p-button subtle" onclick={locate}>Find on map</button></div>{/if}
<div class="map-toolbar"><div class="map-modes" role="group" aria-label="Google Maps view">{#each modes as [id,label]}<button type="button" class:chosen={mapType===id} aria-pressed={mapType===id} disabled={mapState!=='ready'} onclick={()=>{mapType=id;map?.setMapTypeId(id);}}>{label}</button>{/each}</div><button type="button" class="fit-button" disabled={!points.length||mapState!=='ready'} onclick={fit}>Fit field</button></div>
<div class="map-frame"><div class="boundary-map" bind:this={element} aria-label={editable?'Google Maps field boundary editor':'Google Maps field location'}></div>
 {#if mapState!=='ready'}<div class="map-placeholder" role="status"><strong>{mapState==='loading'?'Loading Google Maps…':'Google Maps is unavailable'}</strong><p>{mapState==='loading'?'Preparing the field map.':mapError}</p>{#if mapState==='error'&&env.PUBLIC_GOOGLE_MAPS_API_KEY}<button type="button" class="p-button subtle" onclick={retry}>{authDenied?'Reload after enabling API':'Retry map'}</button>{/if}{#if editable&&mapState==='error'}<small>You can still enter boundary coordinates below and save the field.</small>{/if}</div>{/if}
 <output class="map-area" aria-live="polite">{area===null?'Mark your field boundary':`≈ ${(area/10000).toLocaleString('en',{maximumFractionDigits:4})} ha selected`}</output>
</div>
{#if editable}<div class="map-tools"><p aria-live="polite">{status}</p><button type="button" class="p-button subtle" disabled={points.length<3} onclick={finish}>{finished?'Add more corners':'Finish boundary'}</button><button type="button" class="p-button subtle" disabled={!points.length} onclick={()=>{replace(points.slice(0,-1));status='Last corner removed.';}}>Undo corner</button><button type="button" class="p-button subtle" disabled={!points.length} onclick={()=>{replace([]);status='Boundary cleared. Mark a new field.';}}>Clear</button></div>
 <details open={mapState==='error'}><summary>Enter boundary corner coordinates</summary><label class="p-field">One latitude, longitude pair per line<textarea rows="5" bind:value={coordinates} placeholder={'-17.8000, 31.0500\n-17.8010, 31.0500\n-17.8010, 31.0510'}></textarea></label><button type="button" class="p-button subtle" onclick={apply}>Use these coordinates</button></details>{/if}
<p class="p-caption">Google Maps provides the reference map. Image dates and detail vary by location; the map is separate from the satellite service’s dated crop observations.</p>
<style>
 .map-frame{position:relative;isolation:isolate;overflow:hidden;border-radius:0 0 14px 14px;z-index:0;border:1px solid #dce2d4}.boundary-map{height:480px;background:#e8eee2}.map-area{position:absolute;top:14px;left:14px;z-index:2;max-width:calc(100% - 90px);pointer-events:none;background:#123f33;color:#fff;padding:10px 14px;border-radius:7px;box-shadow:0 2px 10px #0002;font-size:12px;font-weight:600}.map-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;background:#edf1e5;border:1px solid #dce2d4;border-bottom:0;border-radius:14px 14px 0 0}.map-modes{display:flex;gap:4px;flex-wrap:wrap}.map-toolbar button{font:600 11px 'DM Sans',sans-serif;border:1px solid transparent;background:transparent;border-radius:6px;padding:10px 13px;cursor:pointer;color:#214c38;min-height:38px}.map-toolbar button.chosen{background:#174a38;color:#fff}.map-toolbar button:not(.chosen):hover:not(:disabled){background:#dbe5cb}.map-toolbar button:disabled{opacity:.5;cursor:not-allowed}.map-toolbar .fit-button{border-color:#becbab;background:#fffef8}.map-placeholder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:60px 28px;text-align:center;background:#eaf0e2;z-index:1}.map-placeholder strong{font-size:20px;font-weight:500;color:#184734}.map-placeholder p{max-width:430px;font-size:13px;line-height:1.8;margin:0;color:#62735a}.map-placeholder small{font-size:11px;color:#62735a;max-width:370px;line-height:1.7}.map-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:12px 0}.map-tools p{font-size:12px;margin:0 auto 0 0;line-height:1.7;flex-basis:100%}.map-locate{display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end;margin:24px 0}.map-locate .p-field{min-width:0;margin:0}.map-locate .p-button{margin:0;min-height:48px;align-self:end}.map-locate input{width:100%}details{margin:16px 0}summary{font-size:12px;cursor:pointer}.map-toolbar button:focus-visible,summary:focus-visible{outline:3px solid #b77d17;outline-offset:2px}@media(max-width:600px){.boundary-map{height:360px}.map-locate{grid-template-columns:1fr 1fr}.map-locate .p-button{grid-column:1/-1}.map-toolbar{align-items:stretch;flex-direction:column}.map-modes{display:grid;grid-template-columns:repeat(4,1fr)}.map-modes button{padding:9px 5px;font-size:10px}.map-area{font-size:10px;padding:8px 10px}}
</style>
