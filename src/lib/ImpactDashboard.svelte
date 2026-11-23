<script lang="ts">
 import {tick} from 'svelte';
 import {enhance} from '$app/forms';
 import {feedbackForm} from './feedback';
 import {impactMetrics,type ImpactEntry,type ImpactMetric} from './impact';
 let {data,form}:{data:any,form?:any}=$props();
 const targets=[
  {title:'Prevent crop losses',description:'Reduce preventable losses from pests, disease and detectable stress across the pilot.',items:[['lossTonnes',3],['lossReduction',10],['evaluatedArea',25]],link:'/admin/crops',linkLabel:'Crops & analysis'},
  {title:'Deliver the Talazo app',description:'One digital platform developed, as confirmed by the project owner.',items:[],link:'/portal/overview',linkLabel:'Open farmer workspace'},
  {title:'Onboard and retain farmers',description:'Reach 25 pilot farmers and sustain long-term participation.',items:[['onboarded',25],['retention',30]],link:'/admin/users',linkLabel:'Farmers & invitations'},
  {title:'Expand active monitoring',description:'Reach 25 hectares under active AI and sensor monitoring in pilot communities.',items:[['monitoredArea',25]],link:'/admin/requests',linkLabel:'Monitoring requests'}
 ] satisfies {title:string;description:string;items:[ImpactMetric,number][];link:string;linkLabel:string}[];
 const venture:ImpactMetric[]=['interventions','waterSaved','training','consentedStories','payingCustomers','revenue','costs'];
 const metricKeys=Object.keys(impactMetrics) as ImpactMetric[];
 let entries=$derived((data.impactEntries||[]) as ImpactEntry[]);
 let selectedMonth=$state('');
 let month=$derived(selectedMonth||data.period.slice(0,7));
 let throughMonth=$derived(entries.filter(entry=>entry.period.slice(0,7)<=month).sort((a,b)=>b.period.localeCompare(a.period)||b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id)));
 let monthEntries=$derived(throughMonth.filter(entry=>entry.period.slice(0,7)===month));
 const latest=(metric:ImpactMetric,monthly=false)=>(monthly?monthEntries:throughMonth).find(entry=>entry.metric===metric);
 const number=(value:number)=>new Intl.NumberFormat('en',{maximumFractionDigits:4}).format(value);
 const format=(value:number,unit:string)=>number(value)+(unit==='%'?'%':' '+unit);
 let liveZones=$derived(new Set<string>(data.tables.talazo_monitoring.filter((row:any)=>row.environment==='live'&&row.status==='active'&&row.provider_id).map((row:any)=>row.zone_id)));
 let liveArea=$derived(data.tables.talazo_zones.filter((row:any)=>liveZones.has(row.id)).reduce((sum:number,row:any)=>sum+Number(row.area_sqm),0)/10000);
 let activated=$derived(data.users.filter((user:any)=>user.status==='active').length);
 let communities=$derived(new Set(data.tables.talazo_farms.map((farm:any)=>farm.district?.trim().toLowerCase()).filter(Boolean)).size);
 let summary=$derived([
  'Talazo impact | '+month,
  'Talazo app developed (project owner confirmed).',
  ...targets.flatMap(goal=>goal.items.map(([key,target])=>{
   const item=latest(key),metric=impactMetrics[key];
   return metric.label+': '+(item?format(item.value,metric.unit)+' (reported '+item.period.slice(0,7)+')':'Not reported')+' / target '+format(target,metric.unit);
  })),
  ...venture.flatMap(key=>{const item=latest(key,true);return item?[impactMetrics[key].label+': '+format(item.value,impactMetrics[key].unit)]:[];})
 ].join('\n'));
 let dialog=$state<HTMLDialogElement>();
 let open=$state(false),busy=$state(false),metric=$state<ImpactMetric>('lossTonnes');
 let priorForm=$state.raw<any>();
 const save=feedbackForm({pending:'Recording impact update',onBusy:value=>busy=value,onSuccess:()=>dialog?.close()});
 async function record(key:ImpactMetric){
  metric=key;priorForm=form;open=true;await tick();dialog?.showModal();
 }
</script>

<section class="p-card impact-header">
 <div><h2>Fellowship commitments</h2><p>Target date for the pilot outcomes: March 2027.</p></div>
 <div class="impact-actions">
  <label class="p-field">Reporting month<input type="month" value={month} max={data.period.slice(0,7)} onchange={event=>selectedMonth=event.currentTarget.value}/></label>
  <button class="p-button" type="button" disabled={!data.impactAvailable} onclick={()=>void record('lossTonnes')}>Record update</button>
  <a class="p-button subtle" download={'talazo-impact-'+month+'.txt'} href={'data:text/plain;charset=utf-8,'+encodeURIComponent(summary)}>Download summary</a>
 </div>
</section>
{#if !data.impactAvailable}<p class="p-feedback" role="status">Evidence logging becomes available after the impact database migration is applied.</p>{/if}
<div class="impact-goals">
 {#each targets as goal}
  <section class="p-card impact-goal">
   <h3>{goal.title}</h3><p>{goal.description}</p>
   {#if goal.items.length}
    {#each goal.items as [key,target]}
     {@const item=latest(key)}
     {@const info=impactMetrics[key]}
     <div class="impact-measure">
      <span>{info.label}</span>
      <strong>{item?format(item.value,info.unit):'Not reported'} <small>/ {format(target,info.unit)}</small></strong>
      {#if item}<meter min="0" max={target} value={Math.min(target,item.value)} aria-label={info.label}></meter><small>Recorded for {item.period.slice(0,7)}</small>{/if}
     </div>
    {/each}
    <button class="p-button subtle" type="button" disabled={!data.impactAvailable} onclick={()=>void record(goal.items[0][0])}>Record progress</button>
   {:else}
    <span class="p-pill">Complete &middot; app developed</span>
    <p class="p-caption">Fellowship submission and coach verification are tracked in Catalyst.</p>
   {/if}
   <a class="impact-link" href={goal.link}>{goal.linkLabel} &nearr;</a>
  </section>
 {/each}
</div>
<section class="p-card">
 <h2>Current operational indicators</h2>
 <p>Live workspace figures provide context for the fellowship updates. Pilot eligibility and sensor coverage are recorded with evidence.</p>
 <div class="impact-operational">
  <a href="/admin/users"><strong>{number(activated)}</strong><span>Active workspace accounts</span></a>
  <a href="/admin/requests"><strong>{number(liveArea)} ha</strong><span>Active live satellite area</span></a>
  <a href="/admin/crops"><strong>{number(communities)}</strong><span>Districts with saved farms</span></a>
 </div>
</section>
<section class="p-card">
 <h2>Venture and ESG measures</h2>
 <p>Record each figure for the selected month. For water savings, record the comparison baseline and measurement method.</p>
 <div class="p-table"><table><thead><tr><th>Measure</th><th>Reported value</th><th>Action</th></tr></thead><tbody>
  {#each venture as key}
   {@const item=latest(key,true)}
   <tr><td>{impactMetrics[key].label}</td><td>{item?format(item.value,impactMetrics[key].unit):'Not reported'}</td><td><button type="button" class="p-button subtle" disabled={!data.impactAvailable} onclick={()=>void record(key)}>Record update</button></td></tr>
  {/each}
 </tbody></table></div>
</section>
<section class="p-card">
 <h2>Evidence log</h2>
 <p>Updates for {month}. Corrections are saved as new entries with the earlier records retained.</p>
 <div class="p-table"><table><thead><tr><th>Measure</th><th>Value</th><th>Evidence</th></tr></thead><tbody>
  {#each monthEntries as entry (entry.id)}
   <tr><td>{impactMetrics[entry.metric].label}</td><td>{format(entry.value,impactMetrics[entry.metric].unit)}</td><td>{entry.evidence}</td></tr>
  {:else}<tr><td colspan="3">No impact updates recorded for this month.</td></tr>{/each}
 </tbody></table></div>
</section>
<dialog class="farm-dialog" bind:this={dialog} aria-labelledby="impact-dialog-title" onclose={()=>open=false}>
 {#if open}
  <div class="farm-dialog-heading"><h2 id="impact-dialog-title">Record impact update</h2><button class="p-button subtle" type="button" onclick={()=>dialog?.close()}>Close</button></div>
  {#if form!==priorForm&&form?.message}<p class="p-feedback" role="status">{form.message}</p>{/if}
  <form method="POST" action="?/impactEntry" use:enhance={save}>
   <label class="p-field">Measure<select name="metric" bind:value={metric}>{#each metricKeys as key}<option value={key}>{impactMetrics[key].label}</option>{/each}</select></label>
   <label class="p-field">Reporting month<input name="period" type="month" value={month} max={data.period.slice(0,7)} required/></label>
   <label class="p-field">Value ({impactMetrics[metric].unit})<input name="value" type="number" min="0" max={impactMetrics[metric].max} step={'whole' in impactMetrics[metric]?1:'any'} required/></label>
   <label class="p-field">Evidence and method<textarea name="evidence" rows="4" maxlength="2000" required placeholder="Source, measurement method, or validation record"></textarea></label>
   {#if metric==='lossTonnes'||metric==='lossReduction'}<p class="p-caption">Include the baseline, measured result, and agronomist validation reference.</p>{:else if metric==='retention'}<p class="p-caption">Include the cohort, participation window, and numerator and denominator used.</p>{/if}
   <button class="p-button" disabled={busy}>Save impact update</button>
  </form>
 {/if}
</dialog>
<style>
 .impact-header,.impact-actions{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap}
 .impact-header p,.impact-actions .p-field{margin:0}
 .impact-goals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-bottom:24px}
 .impact-goals .impact-goal{margin:0}
 .impact-goal h3{font-size:23px;margin-bottom:8px}
 .impact-measure{border-top:1px solid #d8e2d3;padding:12px 0;display:grid;gap:6px}
 .impact-measure span,.impact-measure small{font-size:13px;color:#4e6652}
 .impact-measure strong{font-size:18px;font-weight:700}
 .impact-measure meter{width:100%;height:16px;accent-color:#527d4a}
 .impact-link{display:block;text-decoration:underline;text-underline-offset:3px;font-size:14px;margin-top:12px}
 .impact-operational{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px}
 .impact-operational a{padding:16px;border:1px solid #d8e2d3;border-radius:12px;background:#eff5ea;display:grid;gap:4px}
 .impact-operational strong{font-size:25px}.impact-operational span{font-size:14px}
 td{overflow-wrap:anywhere}
 @media(max-width:790px){.impact-goals{grid-template-columns:minmax(0,1fr)}}
</style>
