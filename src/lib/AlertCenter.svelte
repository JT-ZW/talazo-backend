<script lang="ts">
 import {enhance} from '$app/forms';
 import {displayText} from './display-text.mjs';
 let {data,enhanced,busy}:{data:any,enhanced:any,busy:boolean}=$props();
 let showReviewed=$state(false);
 let fields=$derived(new Map<string,any>(data.tables.talazo_zones.map((zone:any)=>[zone.id,zone])));
 let monitoring=$derived(new Map<string,any>(data.tables.talazo_monitoring.filter((item:any)=>item.environment===data.environment).map((item:any)=>[item.id,item])));
 let alerts=$derived((data.alerts||[]).filter((alert:any)=>fields.has(monitoring.get(alert.monitoring_id)?.zone_id)).sort((a:any,b:any)=>String(b.observed_on).localeCompare(String(a.observed_on))));
 let visible=$derived(showReviewed?alerts:alerts.filter((alert:any)=>!alert.acknowledged_at));
 const reading=(value:unknown)=>typeof value==='number'?value.toFixed(2):'Unavailable';
 const observed=(date:string)=>/^\d{8}$/.test(date)?date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6):date;
 const link=(id:string,date:string)=>'/portal/health?'+new URLSearchParams({field:id,date:date.replaceAll('-','')});
</script>
<section class="p-card">
 <h2>Field alert preferences</h2>
 <p>Turn on in-app alerts for a drop in vegetation greenness between usable satellite observations.</p>
 <form method="POST" action="?/alertPreferences" use:enhance={enhanced} class="p-form">
  <label class="p-field">In-app stress alerts<select aria-label="In-app stress alerts" name="enabled" value={data.alertPreference?.enabled?'true':'false'}><option value="false">Off</option><option value="true">On</option></select></label>
  <label class="p-field">NDVI decrease threshold<small>A drop of 0.15 means, for example, from 0.60 to 0.45.</small><input type="number" name="threshold" min="0.01" max="1" step="0.01" value={data.alertPreference?.ndvi_drop??.15} required/></label>
  <button class="p-button" disabled={busy}>Save alert preference</button>
 </form>
</section>
<section class="p-card">
 <div class="p-section-heading"><h2>Alert history</h2>
  {#if alerts.some((alert:any)=>alert.acknowledged_at)}<button type="button" class="p-button subtle" aria-pressed={showReviewed} onclick={()=>showReviewed=!showReviewed}>{showReviewed?'Hide reviewed alerts':'Include reviewed alerts'}</button>{/if}
 </div>
 {#each visible as alert (alert.id)}
  {@const zone=fields.get(monitoring.get(alert.monitoring_id).zone_id)}
  <article>
   <div><h3>{zone.name} &middot; vegetation change</h3><p>{displayText(alert.data?.message||'Review the selected field observation.')}</p><p class="p-caption">{reading(alert.data?.previous)} &rarr; {reading(alert.data?.current)} &middot; {observed(alert.observed_on)}</p></div>
   <div class="alert-actions"><a class="p-button subtle" href={link(zone.id,alert.observed_on)}>Review observation &nearr;</a>
    {#if !alert.acknowledged_at}
     <form method="POST" action="?/acknowledgeAlert" use:enhance={enhanced}><input type="hidden" name="alert" value={alert.id}/><button class="p-button subtle" disabled={busy}>Mark reviewed</button></form>
    {:else}<span class="p-pill">Reviewed</span>{/if}
   </div>
  </article>
 {:else}<p>{alerts.length?'No alerts need review.':'No field alerts have been recorded.'}</p>{/each}
</section>
<style>
 article{border-top:1px solid #dce2d4;padding:14px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px 18px}
 article:last-child{padding-bottom:0}
 article h3{margin:0 0 5px;font-size:17px}
 article p{margin:0 0 5px}
 .alert-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
 .p-form{margin:12px 0 0}
 .p-form .p-field{margin:0}
</style>
