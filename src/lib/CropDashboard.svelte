<script lang="ts">
 import ObservationTrend from './ObservationTrend.svelte';
 import BoundaryMap from './BoundaryMap.svelte';
 import {sensedMap,normalizeIndex} from './satellite.mjs';
 import {validDate} from './calendar.mjs';

 let {data,field=$bindable('')}:{data:any,field?:string}=$props();
 const statuses:Record<string,string>={active:'Monitoring',awaiting:'Awaiting first observations',requested:'Awaiting approval',paused:'Paused',uncertain:'Under review',registering:'Registering',error:'Needs attention'};
 const status=(record:any)=>statuses[record?.status]||'Monitoring not requested';
 const iso=(value:string)=>value.includes('-')?value:value.replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3');
 const dateLabel=(value:string)=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(iso(value)+'T00:00:00Z'));
 const hectares=(value:number)=>new Intl.NumberFormat('en',{maximumFractionDigits:3}).format(value/10000);
 let records=$derived(data.tables.talazo_monitoring.filter((m:any)=>m.environment===data.environment));
 let fields=$derived(data.tables.talazo_zones.map((zone:any)=>{
  const record=records.find((m:any)=>m.zone_id===zone.id);
  const products=data.tables.talazo_observations.find((o:any)=>o.monitoring_id===record?.id)?.data?.products;
  const sensed=sensedMap(products?.getSensedDays?.value);
  const dates=Object.keys(sensed).filter(date=>validDate(iso(date))).sort().reverse();
  return {zone,record,sensed,dates,vegetation:products?.getAllIndexValues?.value?.ndvi||{},farm:data.tables.talazo_farms.find((f:any)=>f.id===zone.farm_id)?.name||'Farm'};
 }));
 let selected=$derived(fields.find((item:any)=>item.zone.id===field)||fields.find((item:any)=>item.record?.status==='active')||fields[0]);
 $effect(()=>{if(selected&&field!==selected.zone.id)field=selected.zone.id;});
 let latest=$derived(selected?.dates[0]);
 let cloudy=$derived(Boolean(latest&&selected.sensed[latest]?.isCloudy));
 let comparable=$derived((selected?.dates||[]).filter((date:string)=>!selected.sensed[date]?.isCloudy&&normalizeIndex(selected.vegetation[date])!==null));
 let current=$derived(normalizeIndex(selected?.vegetation[comparable[0]]));
 let previous=$derived(normalizeIndex(selected?.vegetation[comparable[1]]));
 let change=$derived(current===null||previous===null?null:Math.round((current-previous)*100)/100);
 let trend=$derived(Object.fromEntries((selected?.dates||[]).map((date:string)=>[date,selected.sensed[date]?.isCloudy?null:selected.vegetation[date]])));
 let alerts=$derived((data.alerts||[]).filter((alert:any)=>selected?.record&&alert.monitoring_id===selected.record.id&&!alert.acknowledged_at&&typeof alert.observed_on==='string'&&validDate(iso(alert.observed_on))).sort((a:any,b:any)=>iso(b.observed_on).localeCompare(iso(a.observed_on))).slice(0,3));
 const fieldLink=(section:string,id:string,date?:string)=>'/portal/'+section+'?'+new URLSearchParams({field:id,...(date?{date:iso(date).replaceAll('-','')}:{})});
</script>

{#if selected}
 {#if fields.length>1}
  <section class="p-card" aria-labelledby="my-fields-heading">
   <div class="p-section-heading"><h2 id="my-fields-heading">My fields at a glance</h2><a href="/portal/farms">Manage fields &nearr;</a></div>
   <ul class="field-list">
    {#each fields as item (item.zone.id)}
     <li><button type="button" aria-pressed={item.zone.id===selected.zone.id} onclick={()=>field=item.zone.id}>
      <span><strong>{item.zone.name}</strong><small>{item.farm} &middot; {item.zone.crop_entered_name||item.zone.crop_name}</small></span>
      <span class="field-list-status"><span class="p-pill">{status(item.record)}</span><small>{item.dates[0]?'Observed '+dateLabel(item.dates[0]):'No observation yet'}</small></span>
     </button></li>
    {/each}
   </ul>
  </section>
 {/if}

 <section class="p-card field-overview" aria-labelledby="field-snapshot-heading">
  <div class="field-snapshot">
   <p class="p-kicker">{selected.farm}</p>
   <h2 id="field-snapshot-heading">{selected.zone.name}</h2>
   <p>{selected.zone.crop_entered_name||selected.zone.crop_name} &middot; {hectares(selected.zone.area_sqm)} ha</p>
   <span class="p-pill">{status(selected.record)}</span>

   <div class="field-update" aria-live="polite">
    <h3>Latest field update</h3>
    {#if latest}
     <p class="observation-date">Satellite observation &middot; <time datetime={iso(latest)}>{dateLabel(latest)}</time></p>
     {#if cloudy}<p>Clouds affected this observation, so it cannot be used to compare vegetation.</p>
     {:else if comparable[0]!==latest}<p>A vegetation reading is unavailable for this observation.</p>
     {:else if change===null}<p>There is a vegetation reading for this date. A second usable observation is needed to compare changes.</p>{/if}
     {#if change!==null}
      <p>{comparable[0]!==latest?'In the latest usable reading ('+dateLabel(comparable[0])+'), vegetation':'Vegetation'} {change===0?'looked about as green as':change>0?'looked greener than':'looked less green than'} on {dateLabel(comparable[1])}.</p>
     {/if}
    {:else if selected.record}
     <p>{selected.record.status==='requested'?'Talazo will review your request. Satellite updates appear after monitoring starts.':selected.record.status==='paused'?'Monitoring is paused for this field.':'Satellite readings will appear here once the first observation is available.'}</p>
    {:else}
     <p>Request monitoring to start receiving satellite updates for this field.</p>
    {/if}
   </div>

   <div class="field-actions">
    {#if latest}<a class="p-button" href={fieldLink('satellite',selected.zone.id,comparable[0]||latest)+(change!==null?'#observation-history':'')}>{change!==null?'Compare observations':'View satellite observation'} &nearr;</a>
    {:else if !selected.record}<a class="p-button" href={'/portal/farms#field-'+encodeURIComponent(selected.zone.id)}>Request monitoring &nearr;</a>
    {:else}<a class="p-button" href={fieldLink('satellite',selected.zone.id)}>View monitoring status &nearr;</a>{/if}
    <a class="p-button subtle" href={fieldLink('weather',selected.zone.id)}>Check field weather &nearr;</a>
   </div>
  </div>
  <div class="field-map">
   {#key selected.zone.id}<BoundaryMap value={JSON.stringify(selected.zone.boundary)} editable={false}/>{/key}
  </div>
 </section>

 <section class="p-card recent-changes" aria-labelledby="recent-changes-heading">
  <div class="p-section-heading"><h2 id="recent-changes-heading">Recent changes</h2>{#if latest}<a href={fieldLink('satellite',selected.zone.id,comparable[0]||latest)+'#observation-history'}>View satellite history &nearr;</a>{/if}</div>
  {#if alerts.length}
   <ul class="field-alerts">
    {#each alerts as alert (alert.id)}
     <li><span><strong>Vegetation alert</strong><small>{dateLabel(alert.observed_on)} &middot; Satellite readings flagged a drop worth checking in the field.</small></span><a href={fieldLink('health',selected.zone.id,alert.observed_on)}>Review observation &nearr;</a></li>
    {/each}
   </ul>
  {/if}
  {#if comparable.length}
   <div class="compact-trend"><ObservationTrend series={trend}/></div>
  {:else}
   <p>Usable satellite readings will appear here as they become available.</p>
  {/if}
 </section>
{:else}
 <section class="p-card p-empty">
  <h2>Add your first field</h2>
  <p>Create a farm and draw your field boundary to request satellite monitoring.</p>
  <a class="p-button" href="/portal/farms">Set up my farm &nearr;</a>
 </section>
{/if}

<style>
 .field-list,.field-alerts{list-style:none;margin:0;padding:0}
 .field-list{display:grid;gap:8px}
 .field-list button,.field-alerts li{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
 .field-list button{width:100%;padding:12px 14px;text-align:left;border-radius:10px;border:1px solid #d8e2d3;background:#fffef9;color:#153e30}
 .field-list button:hover,.field-list button[aria-pressed="true"]{background:#e7efdf;border-color:#688757}
 .field-list strong,.field-alerts strong{display:block;font-size:16px;overflow-wrap:anywhere}
 .field-list small,.field-alerts small{display:block;margin-top:4px;color:#4f6651;font-size:13px}
 .field-list-status{display:flex;gap:8px 12px;align-items:center;flex-wrap:wrap}
 .field-list-status small{margin:0}
 .field-overview{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:24px;align-items:start}
 .field-snapshot{min-width:0;overflow-wrap:anywhere}
 .field-snapshot>p:not(.p-kicker){margin-bottom:10px}
 .field-update{margin-top:22px;padding-top:18px;border-top:1px solid #ccd9c3}
 .field-update h3{margin:0 0 4px;font-size:19px}
 .field-update p{margin:0 0 12px}
 .observation-date{color:#4f6651;font-size:14px}
 .field-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
 .field-map{min-width:0}
 .field-map :global(.boundary-map){height:clamp(260px,29vw,360px)}
 .field-alerts{display:grid;gap:8px;margin-bottom:16px}
 .field-alerts li{border:1px solid #e2d3a8;background:#f8f1dc;border-radius:10px;padding:12px 14px}
 .field-alerts a{font-size:14px;text-decoration:underline;text-underline-offset:3px}
 .compact-trend :global(svg){max-height:215px}
 @media(max-width:860px){.field-overview{grid-template-columns:minmax(0,1fr)}}
</style>
