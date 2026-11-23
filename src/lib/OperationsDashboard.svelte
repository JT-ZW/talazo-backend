<script lang="ts">
 import type {Snippet} from 'svelte';
 import {monitoringNeedsReview} from './freshness.mjs';
 import {sensedMap} from './satellite.mjs';
 let {data,capacity}:{data:any,capacity:Snippet}=$props();
 let records=$derived(data.tables.talazo_monitoring.filter((m:any)=>m.environment===data.environment));
 let pending=$derived(records.filter((m:any)=>m.status==='requested'));
 let attention=$derived(records.filter(monitoringNeedsReview));
 const zone=(id:string)=>data.tables.talazo_zones.find((z:any)=>z.id===id);
 const farm=(id:string)=>data.tables.talazo_farms.find((f:any)=>f.id===id);
 const latest=(id:string)=>Object.keys(sensedMap(data.tables.talazo_observations.find((o:any)=>o.monitoring_id===id)?.data?.products?.getSensedDays?.value)).sort().reverse()[0];
 const day=(d:string)=>d?`${d.slice(6)}/${d.slice(4,6)}/${d.slice(0,4)}`:'Awaiting observations';
</script>
<section class="p-card p-work-queue">
 <p class="p-kicker">Monitoring operations</p>
 <h2>What needs attention</h2>
 <div class="p-queue-links">
  <a href="/admin/requests?view=pending"><strong>{pending.length}</strong><span>Monitoring requests awaiting approval &rarr;</span></a>
  <a href="/admin/requests?view=attention"><strong>{attention.length}</strong><span>Fields with sync or registration issues &rarr;</span></a>
 </div>
</section>
{@render capacity()}
<section class="p-card p-monitoring-register">
 <div class="p-section-heading"><h2>Monitoring register</h2><a href="/admin/operations">Integration health &nearr;</a></div>
 <p>{records.filter((m:any)=>m.status==='active').length} active &middot; {records.filter((m:any)=>m.status==='awaiting').length} awaiting observations &middot; {records.filter((m:any)=>m.status==='paused').length} paused</p>
 <div class="p-table"><table><thead><tr><th>Farm / field</th><th>Farmer</th><th>Monitoring</th><th>Latest optical observation</th><th>Data retrieved</th></tr></thead><tbody>{#each records as m}{@const z=zone(m.zone_id)}{@const f=farm(z?.farm_id)}<tr><td><strong>{f?.name} / {z?.name}</strong><small>{z?.crop_name} · {(Number(z?.area_sqm)/10000).toLocaleString('en',{maximumFractionDigits:4})} ha</small></td><td>{data.users.find((u:any)=>u.user_id===f?.owner_id)?.name||'Farmer'}</td><td><span class="p-pill">{m.status}</span>{#if m.error}<small class="p-error">{m.error}</small>{/if}</td><td>{day(latest(m.id))}</td><td>{m.last_sync?new Date(m.last_sync).toLocaleString('en-GB',{timeZone:'Africa/Harare'}):'Not yet retrieved'}</td></tr>{:else}<tr><td colspan="5">No monitoring requests yet. Invite a farmer and allocate hectares to get started.</td></tr>{/each}</tbody></table></div><p class="p-caption">Observation dates and retrieval times are different. Integration health shows provider errors; an old observation is not proof of a new satellite pass.</p></section>
