<script lang="ts">
 import {enhance} from '$app/forms';
 import ObservationTrend from './ObservationTrend.svelte';
 import AdvisoryValues from './AdvisoryValues.svelte';
 import {imageDates,imageLayers} from './imagery.mjs';
 import {normalizeIndex,sensedMap} from './satellite.mjs';

 let {zone,farm,record,products,date,form,environment,enhanced,busy}:{zone:any;farm?:string;record:any;products:any;date:string;form?:any;environment:string;enhanced:any;busy:boolean}=$props();
 const formats=[
  {id:'pdf',label:'PDF field report',description:'A printable provider report for the chosen optical observation.'},
  {id:'image',label:'Satellite image',description:'Open the dated image for your selected layer.'},
  {id:'advisory',label:'Interactive advisory report',description:'Open the provider report for the selected observation.'},
  {id:'recommendations',label:'Structured field advisory',description:'View the provider recommendations in Talazo for this observation.'},
  {id:'geotiff',label:'GeoTIFF',description:'Export a georeferenced image for GIS tools.'}
 ];
 let kind=$state('pdf'),layer=$state('ndvi'),choice=$state('');
 let selectedFormat=$derived(formats.find(item=>item.id===kind));
 let usesLayer=$derived(['image','geotiff','pdf'].includes(kind));
 let effectiveLayer=$derived(kind==='pdf'&&['rvi','rsm'].includes(layer)?'ndvi':layer);
 let radar=$derived(['image','geotiff'].includes(kind)&&['rvi','rsm'].includes(layer));
 let days=$derived(imageDates(products[radar?'getSARDays':'getSensedDays']?.value,radar));
 let outputDate=$derived(days.includes(choice)?choice:days.includes(date)?date:days[0]);
 let sensed=$derived(sensedMap(products.getSensedDays?.value));
 let quality=$derived(sensed[date]?.isCloudy===true?'Cloud-affected':sensed[date]?.isCloudy===false?'Clear optical observation':'Cloud quality unreported');
 let data=$derived(products.getAllIndexValues?.value||{});
 const meanings:Record<string,string>={
  ndvi:'How green and dense the crop canopy appears. Compare the same field across clear observations and check unusual changes on the ground.',
  ndmi:'A signal of water held in vegetation. Compare it with recent rain, irrigation and field moisture before deciding to water.',
  evi:'Another view of vegetation growth, useful where the canopy is dense. Compare EVI with earlier EVI readings.',
  savi:'Vegetation greenness adjusted for exposed soil. Useful when plants are small or cover only part of the ground.',
  ndre:'A red-edge signal related to canopy chlorophyll. Use changes to guide scouting and confirm nutrient concerns with field checks.',
  ndwi:'A water-related signal from optical imagery. Compare it with the image and check suspected standing water on the ground.',
  rsm:'A radar-based moisture indicator. Compare readings from radar visits and check surface moisture in the field.',
  rvi:'A radar-based vegetation indicator. Compare it with earlier radar readings to follow changes in canopy structure.',
  soc:'A modelled organic carbon indicator. Confirm soil carbon with a soil sample before reporting or making soil management decisions.'
 };
 const featured=['ndvi','ndmi','evi','savi'];
 let priorDates=$derived(Object.keys(sensed).filter(day=>day<date&&sensed[day]?.isCloudy!==true).sort().reverse());
 let readings=$derived(Object.entries(data).map(([key,series])=>{
  const values=series as Record<string,unknown>|undefined;
  const code=key.toLowerCase(),value=normalizeIndex(values?.[date]);
  const previous=featured.includes(code)&&sensed[date]?.isCloudy!==true&&value!==null?priorDates.find(day=>normalizeIndex(values?.[day])!==null):undefined;
  const before=previous?normalizeIndex(values?.[previous]):null;
  return {key,code,label:imageLayers.find(([id])=>id===code)?.[1]||key.toUpperCase(),value,previous,before};
 }).sort((a,b)=>(featured.includes(a.code)?featured.indexOf(a.code):featured.length)-(featured.includes(b.code)?featured.indexOf(b.code):featured.length)||a.label.localeCompare(b.label)));
 const trend=(values:Record<string,unknown>|undefined)=>Object.fromEntries(Object.keys(sensed).map(day=>[day,sensed[day]?.isCloudy===true?null:values?.[day]]));
 const dateText=(value:string|undefined)=>value?value.slice(6)+'/'+value.slice(4,6)+'/'+value.slice(0,4):'Unavailable';
 const flagList=(value:unknown)=>Array.isArray(value)?value.length?value.join(', '):'None flagged':'Unavailable';
 const fieldLink=(path:string)=>'/portal/'+path+'?'+new URLSearchParams({field:zone.id,...(date?{date}:{})});
 let reportMatches=$derived(form?.assetMonitoring===record.id&&form?.assetDate===outputDate&&
  (form?.asset?form.assetKind===kind&&(!usesLayer||form.assetLayer===effectiveLayer):kind==='recommendations'&&form?.recommendations));
</script>

<section class="p-card report-context">
 <div><p class="p-kicker">{farm}</p><h2>{zone.name}</h2><p>{zone.crop_entered_name||zone.crop_name} &middot; {date?'Observation '+dateText(date):'Awaiting observations'}</p></div>
 <div class="report-links">
  <a class="p-button subtle" href={fieldLink('satellite')}>Satellite monitoring &nearr;</a>
  <a class="p-button subtle" href={'/api/satellite/export?monitoring='+encodeURIComponent(record.id)}>Download observation history CSV</a>
 </div>
</section>
<section class="p-card report-export" aria-labelledby="create-report-title">
 <h2 id="create-report-title">Create a report or export</h2>
 <p>Choose the output you need and the satellite observation to include. The CSV above contains the available observation history for this field.</p>
 <form method="POST" action="?/report" use:enhance={enhanced} class="p-form">
  <input type="hidden" name="monitoring" value={record.id}/>
  <input type="hidden" name="date" value={outputDate||''}/>
  <label class="p-field">Output format<select name="kind" bind:value={kind} onchange={()=>choice=''}>{#each formats as option}<option value={option.id}>{option.label}</option>{/each}</select></label>
  {#if usesLayer}
   <label class="p-field">Image layer<select name="layer" value={effectiveLayer} onchange={event=>{layer=event.currentTarget.value;choice='';}}>
    {#each imageLayers.filter(([id])=>kind!=='pdf'||!['rvi','rsm'].includes(id)) as [id,label]}<option value={id}>{label}</option>{/each}
   </select></label>
  {/if}
  <label class="p-field">{radar?'Radar observation':'Optical observation'}<select bind:value={choice} disabled={!days.length}>
   <option value="">{days.length?'Use selected observation or latest available':'No observations available'}</option>
   {#each days as day}<option value={day}>{dateText(day)}</option>{/each}
  </select></label>
  <button class="p-button" disabled={busy||!outputDate||record.status!=='active'}>Generate output</button>
 </form>
 <p class="p-caption">{selectedFormat?.description} {#if outputDate}Output date: <strong>{dateText(outputDate)}</strong>.{/if} {#if record.status!=='active'}Active monitoring is required to generate provider outputs.{/if}</p>
</section>

{#if reportMatches}
 <section class="p-card" aria-live="polite">
  <h2>{environment==='test'?'Sample output':'Output for '+dateText(outputDate)}</h2>
  {#if form.asset}
   {#if form.assetKind==='image'}<img class="p-result-image" src={form.asset} alt={zone.name+' on '+dateText(outputDate)} referrerpolicy="no-referrer"/>{/if}
   <a class="p-button" href={form.asset} target="_blank" rel="noopener noreferrer">Open {selectedFormat?.label.toLowerCase()} &nearr;</a>
  {:else if form.recommendations}
   <p>Check the recommendations against your field conditions before acting.</p>
   {#each Object.entries(form.recommendations) as [topic,value]}<details class="report-advisory"><summary>{topic.replaceAll('_',' ')}</summary><AdvisoryValues {value}/></details>{/each}
  {/if}
 </section>
{/if}

<div class="report-evidence">
 <section class="p-card">
  <h2>Vegetation and moisture over time</h2>
  <ObservationTrend series={trend(data.ndvi)} moisture={trend(data.ndmi)}/>
 </section>
 <section class="p-card">
  <h2>Inspection flags</h2>
  <p>Provider grid cells for {dateText(date)}. Use them as prompts for field inspection.</p>
  <dl class="p-facts"><div><dt>Crop review</dt><dd>{sensed[date]?.isCloudy===true?'Unavailable for cloudy observation':flagList(sensed[date]?.cropRedZones)}</dd></div><div><dt>Water-stress review</dt><dd>{sensed[date]?.isCloudy===true?'Unavailable for cloudy observation':flagList(sensed[date]?.irrigationRedZones)}</dd></div></dl>
  <div class="report-links"><a class="p-button subtle" href={fieldLink('health')}>Crop health &nearr;</a><a class="p-button subtle" href={fieldLink('irrigation')}>Irrigation &nearr;</a></div>
 </section>
</div>
<section class="p-card">
 <h2>Measurements for {dateText(date)}</h2>
 <p>{date?quality:'Choose an observation to see its readings.'} {#if sensed[date]?.isCloudy===true}Clouds can affect the provider readings below.{/if}</p>
 <div class="p-table"><table class="measurement-table"><thead><tr><th scope="col">Index</th><th scope="col">Reading</th><th scope="col">What it means for your field</th></tr></thead><tbody>
  {#each readings as reading (reading.key)}<tr><th scope="row">{reading.label}</th><td><strong>{reading.value?.toFixed(2)??'Unavailable'}</strong>
   {#if reading.previous&&reading.before!==null&&reading.value!==null}
    <small>{reading.value.toFixed(2)===reading.before.toFixed(2)?'Unchanged':reading.value>reading.before?'Higher':'Lower'} than {reading.before.toFixed(2)} on {dateText(reading.previous)}</small>
   {/if}</td><td>{meanings[reading.code]||'Additional provider index. Confirm its definition and scale before using it for a field decision.'}</td></tr>{:else}<tr><td colspan="3">No index measurements have been returned for this field.</td></tr>{/each}
 </tbody></table></div>
 <p class="p-caption">Talazo displays the provider's index readings on a 0 to 1 scale. A reading of 0.21 is an index value, not 21% crop health. Compare like-for-like dates and use field observations to explain changes. <a href="https://farmonaut.com/farmonaut-satellite-weather-api-developer-docs" target="_blank" rel="noopener noreferrer">Farmonaut index documentation &nearr;</a></p>
</section>

<style>
 .report-context{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px 20px}
 .report-context h2,.report-context p{margin:0 0 6px}
 .report-links{display:flex;gap:8px;flex-wrap:wrap}
 .report-evidence{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:18px}
 .report-evidence>section{min-width:0}
 .report-export .p-form{margin:12px 0}
 .report-export .p-form .p-field{margin:0}
 .report-advisory{padding:12px 0;border-top:1px solid #d8e2d3}
 @media(max-width:900px){.report-evidence{grid-template-columns:minmax(0,1fr);gap:0}}
 .measurement-table th[scope="row"]{background:none;white-space:normal;text-transform:none;letter-spacing:0;font-size:14px;color:#173f30}
 .measurement-table td:last-child{min-width:200px;white-space:normal}
 .measurement-table small{display:block;margin-top:4px;color:#516a55}
  @media(max-width:600px){
  .measurement-table tr{display:grid;grid-template-columns:minmax(0,1fr) auto}
  .measurement-table thead tr{grid-template-columns:minmax(0,1fr) auto}
  .measurement-table thead th:last-child{position:absolute;clip-path:inset(50%)}
  .measurement-table tbody td:last-child{grid-column:1/-1;min-width:0;padding-top:3px}
  .measurement-table tbody :is(th,td){min-width:0}
  .measurement-table tbody tr{border-bottom:1px solid #d8e2d3}
  .measurement-table tbody td{border-bottom:0}
 }
 </style>
