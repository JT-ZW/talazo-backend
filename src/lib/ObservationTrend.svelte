<script lang="ts">
 import {validDate} from './calendar.mjs';
 import {normalizeIndex} from './satellite.mjs';
 let {series={},moisture}: {series?:Record<string,unknown>;moisture?:Record<string,unknown>}=$props();
 let metric=$state<'vegetation'|'moisture'>('vegetation');
 let values=$derived(metric==='moisture'&&moisture?moisture:series);
 let dates=$derived([...new Set([...Object.keys(series),...Object.keys(moisture||{})])].filter(date=>/^\d{8}$/.test(date)).sort());
 const iso=(date:string)=>date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6);
 const timestamp=(date:string)=>Date.parse(iso(date)+'T00:00:00Z');
 let days=$derived(dates.filter(date=>validDate(iso(date))));
 let first=$derived(timestamp(days[0]||''));
 let last=$derived(timestamp(days.at(-1)||''));
 const x=(date:string)=>last===first?307:44+526*(timestamp(date)-first)/(last-first);
 let readings=$derived(days.flatMap(date=>{
  const value=normalizeIndex(values[date]);
  return value===null?[]:[{date,value}];
 }));
</script>
{#if moisture}
 <div class="p-page-tabs" role="group" aria-label="Observation index">
  <button type="button" aria-pressed={metric==='vegetation'} onclick={()=>metric='vegetation'}>Vegetation</button>
  <button type="button" aria-pressed={metric==='moisture'} onclick={()=>metric='moisture'}>Moisture</button>
 </div>
{/if}
<p class="trend-note">{metric==='moisture'?'NDMI tracks vegetation moisture from satellite imagery.':'NDVI shows how green and dense vegetation appears from satellite imagery.'} Dates without usable readings have no plotted point.</p>
{#if readings.length}
 <svg viewBox="0 0 620 225" role="img" aria-label={metric==='moisture'?'Moisture index observations by date':'Vegetation index observations by date'}>
  {#each [1,0.5,0] as value}
   {@const y=184-value*154}
   <line x1="44" y1={y} x2="570" y2={y} stroke="#d6e0d0" stroke-dasharray="4 4"/>
   <text x="5" y={y+5}>{value.toFixed(1)}</text>
  {/each}
  {#each readings as reading}
   <circle cx={x(reading.date)} cy={184-reading.value*154} r="5" fill="#3e704e"><title>{iso(reading.date)}: {reading.value.toFixed(2)}</title></circle>
  {/each}
  <text x="44" y="214">{iso(days[0])}</text>
  {#if days.length>1}<text x="570" y="214" text-anchor="end">{iso(days[days.length-1])}</text>{/if}
 </svg>
 <details><summary>View dated readings</summary><dl>{#each readings as reading}<div><dt>{iso(reading.date)}</dt><dd>{reading.value.toFixed(2)}</dd></div>{/each}</dl></details>
{:else}<div class="p-empty compact"><h3>No usable readings yet</h3><p>Readings will appear here when observations are available for this field.</p></div>{/if}
<style>
 svg{display:block;width:100%;max-height:340px;margin:16px auto}
 text{font-size:15px;fill:#506350}
 .trend-note,details{font-size:14px}
 .trend-note{color:#506350}
 dl>div{display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #e9eee4}
 dd{margin:0}
</style>
