<script lang="ts">
 import {onMount} from 'svelte';
 import * as env from '$app/env/public';
 import {loadGoogleMaps} from './google-maps';
 import {parseBoundary} from './map-boundary.mjs';
 let {fields,active}:{fields:{id:string;name:string;boundary:unknown}[];active?:string}=$props();
 const colors=['#b6d291','#c8dace','#ecd49b','#b4ccdf','#dec0a2'];
 const outline=(value:unknown)=>{
  try{return parseBoundary(JSON.stringify(value));}catch{return [];}
 };
 let shapes=$derived(fields.map((field,i)=>({...field,points:outline(field.boundary),color:colors[i%colors.length]})).filter(field=>field.points.length));
 let points=$derived(shapes.flatMap(shape=>shape.points));
 let bounds=$derived.by(()=>{
  let north=-90,south=90,west=180,east=-180;
  for(const point of points){
   north=Math.max(north,point.lat);south=Math.min(south,point.lat);
   east=Math.max(east,point.lng);west=Math.min(west,point.lng);
  }
  const longitudeScale=Math.cos((north+south)*Math.PI/360);
  const scale=Math.min(490/Math.max((east-west)*longitudeScale,1e-10),235/Math.max(north-south,1e-10));
  return {lat:(north+south)/2,lng:(east+west)/2,longitudeScale,scale};
 });
 const project=(p:{lat:number;lng:number})=>[300+(p.lng-bounds.lng)*bounds.longitudeScale*bounds.scale,152+(bounds.lat-p.lat)*bounds.scale];
 let canvas=$state<HTMLDivElement>();
 let maps=$state.raw<typeof google.maps>();
 let map=$state.raw<google.maps.Map>();
 let unavailable=$state(false);
 let ready=$derived(Boolean(map&&shapes.length&&!unavailable));

 onMount(()=>{
  let disposed=false;
  const denied=()=>{unavailable=true;};
  window.addEventListener('talazo:maps-auth-error',denied);
  void loadGoogleMaps(env.PUBLIC_GOOGLE_MAPS_API_KEY||'').then(api=>{
   if(!disposed)maps=api;
  }).catch(()=>{if(!disposed)unavailable=true;});
  return ()=>{disposed=true;window.removeEventListener('talazo:maps-auth-error',denied);};
 });

 $effect(()=>{
  const api=maps,element=canvas;
  if(!api||!element||unavailable)return;
  const instance=new api.Map(element,{
   mapTypeId:'satellite',mapTypeControl:false,streetViewControl:false,
   fullscreenControl:true,zoomControl:true,gestureHandling:'cooperative',
   clickableIcons:false,tilt:0,maxZoom:21
  });
  map=instance;
  return ()=>{
   api.event.clearInstanceListeners(instance);
   instance.unbindAll();
   map=undefined;
  };
 });

 $effect(()=>{
  const api=maps,instance=map,element=canvas;
  if(!api||!instance||!element||!shapes.length)return;
  const extent=new api.LatLngBounds();
  const overlays=shapes.map(shape=>{
   for(const point of shape.points)extent.extend(point);
   return {id:shape.id,polygon:new api.Polygon({
    map:instance,paths:shape.points,clickable:false,
    strokeColor:shape.color,strokeOpacity:1,strokeWeight:3,
    fillColor:shape.color,fillOpacity:.24
   })};
  });
  polygons=overlays;
  const fit=()=>instance.fitBounds(extent,28);
  fit();
  const observer=new ResizeObserver(fit);
  observer.observe(element);
  return ()=>{observer.disconnect();for(const {polygon} of overlays)polygon.setMap(null);polygons=[];};
 });

 let polygons=$state.raw<{id:string;polygon:google.maps.Polygon}[]>([]);
 $effect(()=>{
  for(const {id,polygon} of polygons){
   const highlighted=id===active;
   polygon.setOptions({strokeWeight:highlighted ? 5 : 3,fillOpacity:highlighted ? 0.34 : 0.24,zIndex:highlighted ? 1 : 0});
  }
 });
</script>

{#if shapes.length}
 <figure class="farm-diagram">
  <div class="farm-map-frame">
   <div class="satellite-map" class:visible={ready} aria-label="Google Maps satellite view of the farm" aria-hidden={!ready} bind:this={canvas}></div>
   {#if !ready}
  <svg viewBox="0 0 600 304" role="img" aria-label={'Mapped zones: '+shapes.map(shape=>shape.name).join(', ')}>
   {#each shapes as shape (shape.id)}
    <polygon points={shape.points.map(p=>project(p).join(',')).join(' ')} fill={shape.color} class:active={active===shape.id}>
     <title>{shape.name}</title>
    </polygon>
   {/each}
   <text x="567" y="29" text-anchor="middle">N</text>
   <path d="M567 35v19m-5-14 5-5 5 5" fill="none" stroke="#355a41" stroke-width="1.5"/>
  </svg>
   <p class="map-status" role="status">{unavailable?'Satellite imagery unavailable. Saved zone outlines shown.':'Loading satellite imagery…'}</p>
   {/if}
  </div>
  <figcaption>{#each shapes as shape (shape.id)}<span><i style:background={shape.color}></i>{shape.name}</span>{/each}</figcaption>
 </figure>
{:else}
 <div class="farm-diagram-empty"><p>No mapped field zones yet.</p></div>
{/if}

<style>
 .farm-diagram{margin:0;min-width:0;border:1px solid #cfddc9;border-radius:14px;overflow:hidden;background:#e6efe1}
 .farm-map-frame{position:relative;min-height:260px;aspect-ratio:600/304;isolation:isolate}
 .satellite-map{position:absolute;inset:0;visibility:hidden}
 .satellite-map.visible{visibility:visible}
 .map-status{position:absolute;bottom:0;left:0;right:0;margin:0;padding:7px 10px;background:#f6faf2e8;color:#355a41;font-size:13px;text-align:center}
 svg{display:block;width:100%;height:auto;min-height:170px;background:repeating-linear-gradient(0deg,transparent 0 23px,#c7d7c64d 23px 24px),repeating-linear-gradient(90deg,transparent 0 23px,#c7d7c64d 23px 24px)}
 polygon{stroke:#466d50;stroke-width:1.5;stroke-linejoin:round;vector-effect:non-scaling-stroke}
 polygon.active{stroke:#174a37;stroke-width:3}
 text{font-size:13px;font-weight:700;fill:#355a41}
 figcaption{background:#f6faf2;border-top:1px solid #cfddc9;display:flex;flex-wrap:wrap;gap:7px 16px;padding:10px 14px;font-size:13px;overflow-wrap:anywhere}
 figcaption span{display:inline-flex;align-items:center;gap:6px;min-width:0}
 i{display:block;width:12px;height:12px;border:1px solid #587a52;border-radius:3px;flex:none}
 .farm-diagram-empty{display:grid;place-items:center;min-height:170px;padding:16px;border:1px solid #cfddc9;border-radius:14px;background:#e6efe1;text-align:center}
 .farm-diagram-empty p{margin:0}
</style>
