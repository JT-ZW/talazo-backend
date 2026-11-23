<script lang="ts">
 import CropInsights from './CropInsights.svelte';
 import IndexAreaChart from './IndexAreaChart.svelte';
 import ImageExplorer from './ImageExplorer.svelte';
 import ObservationTrend from './ObservationTrend.svelte';
 import ProviderConnection from './ProviderConnection.svelte';
 import {normalizeIndex,sensedMap} from './satellite.mjs';

 let {zone,farm,record,products,date,enhanced,busy}:{zone:any;farm?:string;record:any;products:any;date:string;enhanced:any;busy:boolean}=$props();
 let retrievedAdvisory=$state<any>(null);
 let areaBreakdown=$state<any>(null);
 let observations=$derived(sensedMap(products.getSensedDays?.value));
 let indices=$derived(products.getAllIndexValues?.value||{});
 let current=$derived(observations[date]);
 let cloudy=$derived(current?.isCloudy===true);
 let ndvi=$derived(normalizeIndex(indices.ndvi?.[date]));
 let prior=$derived(Object.keys(observations).sort().reverse().find(day=>day<date&&observations[day]?.isCloudy!==true&&normalizeIndex(indices.ndvi?.[day])!==null));
 let previous=$derived(prior?normalizeIndex(indices.ndvi?.[prior]):null);
 let change=$derived(!cloudy&&ndvi!==null&&previous!==null?Math.round((ndvi-previous)*100)/100:null);
 let trend=$derived(Object.fromEntries(Object.keys(observations).map(day=>[day,observations[day]?.isCloudy===true?null:indices.ndvi?.[day]])));
 let flags=$derived.by(()=>{
  const values=current?.cropRedZones;
  if(!Array.isArray(values))return null;
  const valid=values.filter(flag=>(typeof flag==='number'&&Number.isFinite(flag))||(typeof flag==='string'&&flag.trim()));
  return valid.length===values.length?[...new Set(valid.map(flag=>String(flag).trim()))]:null;
 });
 let advice=$derived(retrievedAdvisory?.requestedDate===date?retrievedAdvisory:products.askJeevnAPI);
 const day=(value:string)=>/^\d{8}$/.test(value)?value.slice(6)+'/'+value.slice(4,6)+'/'+value.slice(0,4):'Unavailable';
 const link=(topic:string)=>'/portal/'+topic+'?'+new URLSearchParams({field:zone.id,...(date&&topic!=='weather'?{date}:{})});
 const metric=(value:unknown)=>normalizeIndex(value)?.toFixed(2)??'Unavailable';
</script>

<section class="p-card health-overview" aria-labelledby="health-field">
 <div>
  <p class="p-kicker">{farm}</p>
  <h2 id="health-field">{zone.name}</h2>
  <p>{zone.crop_entered_name||zone.crop_name} &middot; <time datetime={date?date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6):undefined}>{day(date)}</time></p>
  <span class="p-pill" class:cloud-warning={cloudy}>{!date?'Awaiting observation':cloudy?'Cloud-affected':current?.isCloudy===false?'Clear optical observation':'Cloud quality unreported'}</span>
 </div>
 <div class="health-interpretation">
  <h3>What the observation shows</h3>
  {#if cloudy}<p>Clouds affected this observation. Choose a clearer date before comparing vegetation.</p>
  {:else if change!==null&&prior}<p>Vegetation looked {change===0?'about as green as':change>0?'greener than':'less green than'} on {day(prior)}.</p>
  {:else}<p>{ndvi===null?'A vegetation reading is unavailable for this observation.':'A second usable observation is needed to measure change.'}</p>{/if}
  {#if !cloudy&&flags?.length}<p>Inspect provider grid {flags.length===1?'cell':'cells'} <strong>{flags.join(', ')}</strong>. These are inspection prompts for the selected field.</p>
  {:else if !cloudy&&flags}<p>No inspection cells were flagged for this observation.</p>{/if}
  <div class="health-actions">
   <a class="p-button subtle" href={link('satellite')}>Compare observations &nearr;</a>
   <a class="p-button subtle" href={link('pests')}>Pests &amp; diseases &nearr;</a>
  </div>
 </div>
 <dl class="health-metrics">
  <div><dt>Vegetation greenness (NDVI)</dt><dd>{cloudy?'Unavailable':metric(indices.ndvi?.[date])}</dd><small>Field average on a 0 to 1 scale</small></div>
  <div><dt>Change from previous reading</dt><dd>{change===null?'Unavailable':(change>0?'+':'')+change.toFixed(2)}</dd><small>{prior?'Previous reading: '+day(prior):'No comparable reading yet'}</small></div>
  <div><dt>Field inspection flags</dt><dd>{cloudy||!flags?'Unavailable':flags.length}</dd><small>Provider grid cells flagged</small></div>
 </dl>
</section>

<div class="health-imagery">
  <ImageExplorer boundary={zone.boundary} section="health" {record} {products} {date} healthMode bind:areaBreakdown bind:advisoryProduct={retrievedAdvisory}/>
</div>
<div class="health-evidence">
 <section class="p-card health-trend">
  <h2>Vegetation through the season</h2>
  <ObservationTrend series={trend}/>
  <dl class="health-secondary">
   <div><dt>Enhanced vegetation (EVI)</dt><dd>{cloudy?'Unavailable':metric(indices.evi?.[date])}</dd></div>
   <div><dt>Soil-adjusted vegetation (SAVI)</dt><dd>{cloudy?'Unavailable':metric(indices.savi?.[date])}</dd></div>
  </dl>
  <p>Satellite vegetation readings help you decide where to inspect. Confirm the cause of stress in the field.</p>
 </section>
 <IndexAreaChart product={areaBreakdown} layer={areaBreakdown?.value?.layer||'ndvi'}/>
</div>

{#if !cloudy}<CropInsights {record} {date} product={advice} {enhanced} {busy} topicId="health" standalone/>{/if}
<div class="health-footer">
 <div class="health-actions"><a class="p-button subtle" href={link('analysis')}>Analysis &amp; field records &nearr;</a><a class="p-button subtle" href={link('weather')}>Field weather &nearr;</a></div>
 <ProviderConnection {record}/>
</div>

<style>
 .health-overview{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.4fr);gap:18px 28px}
 .health-overview h2,.health-overview h3{margin-bottom:8px}
 .health-overview h2{overflow-wrap:anywhere}
 .health-overview p{margin-bottom:12px}
 .health-interpretation{padding:16px 18px;background:#e9f1e1;border:1px solid #d4e0cc;border-radius:12px;min-width:0;overflow-wrap:anywhere}
 .health-actions{display:flex;flex-wrap:wrap;gap:8px}
 .health-metrics{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0}
 .health-metrics>div{padding:12px 14px;background:#f2f6ed;border:1px solid #d8e2d3;border-radius:10px}
 dt{margin:0;font-size:14px;color:#465f4b}
 .health-metrics dd{font:650 clamp(19px,2.3vw,32px)/1.25 Manrope,sans-serif;margin:5px 0}
 .health-metrics small{font-size:13px;color:#465f4b}
 .cloud-warning{background:#f6ead3;border-color:#d9c098;color:#684b26}
 .health-evidence{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:stretch;gap:18px}
 .health-imagery,.health-trend{min-width:0}
 .health-secondary{margin:16px 0}
 .health-secondary>div{display:flex;justify-content:space-between;gap:12px;padding-block:10px;border-top:1px solid #d8e2d3}
 .health-secondary dd{font-size:14px;font-weight:700;margin:0}
 .health-footer{display:grid;gap:14px}
 @media(max-width:880px){.health-evidence{grid-template-columns:minmax(0,1fr)}}
 @media(max-width:680px){.health-overview,.health-metrics{grid-template-columns:minmax(0,1fr)}}
</style>
