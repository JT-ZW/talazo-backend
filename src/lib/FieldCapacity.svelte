<script lang="ts">
 import {previewArea} from './area.mjs';
 let {boundary,farm,farms,zones,allocations,period}:{boundary:string,farm:string,farms:any[],zones:any[],allocations:any[],period:string}=$props();
 let owner=$derived(farms.find(f=>f.id===farm)?.owner_id);
 let allowance=$derived(allocations.find(a=>a.user_id===owner));
 let mapped=$derived(zones.filter(z=>farms.some(f=>f.id===z.farm_id&&f.owner_id===owner)).reduce((sum,z)=>sum+Number(z.area_sqm),0));
 let area=$derived(previewArea(boundary));
 let quota=$derived(Number(allowance?.sqm||0));
 let projected=$derived(mapped+(area||0));
 let exceeds=$derived(projected>quota);
 const ha=(n:number)=>new Intl.NumberFormat('en',{maximumFractionDigits:4}).format(n/10000);
</script>
<section class="capacity" class:over={exceeds} aria-label="Field area and monitoring allocation">
 <div class="area"><span class="p-kicker">SELECTED FIELD / ESTIMATE</span><strong>{area===null?'—':ha(area)} <small>ha</small></strong><span>{area===null?'Draw at least three valid boundary corners.':`${Math.round(area).toLocaleString('en')} m² selected`}</span></div>
 <div class="capacity-facts"><dl><div><dt>Saved fields for this farmer</dt><dd>{ha(mapped)} ha</dd></div><div><dt>Mapped total with this field</dt><dd>≈ {ha(projected)} ha</dd></div><div><dt>Monitoring allowance · {period.slice(0,7)}</dt><dd>{ha(quota)} ha</dd></div><div><dt>Allowance remaining after mapped fields</dt><dd>{ha(Math.max(0,quota-projected))} ha</dd></div></dl>
 <p class="capacity-message" aria-live="polite">{#if !allowance}No monitoring allowance has been assigned to this farmer for the month. Save your field and contact Talazo for an allocation.{:else if exceeds}Your mapped land would exceed the allowance by approximately {ha(projected-quota)} ha. You can save this boundary; Talazo must approve more hectares before all these fields can be monitored.{:else}Your mapped land is within this farmer’s monthly monitoring allowance.{/if}</p></div>
 <p class="caption">Drawing areas are approximate. The server calculates the authoritative area on save. Saving land does not reserve paid monitoring; approval checks enforce the allocation.</p>
</section>
<style>.capacity{display:grid;grid-template-columns:1fr 2fr;gap:20px;background:#eff4e5;border:1px solid #cbdcbb;border-radius:12px;margin:20px 0;padding:24px}.capacity.over{background:#fff6df;border-color:#dfc681}.area{display:flex;flex-direction:column;justify-content:center;gap:12px}.area strong{font-size:36px;font-weight:600;letter-spacing:-.04em}.area small{font-size:15px;font-weight:400}.area>span:last-child{font-size:12px;color:#63715c}.capacity dl{margin:0}.capacity dl>div{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;font-size:12px}.capacity dd{margin:0;font-weight:600}.capacity-message{font-size:12px;line-height:1.7;margin-bottom:0}.caption{grid-column:1/-1;font-size:11px;line-height:1.7;color:#65715f;margin:0;border-top:1px solid #d6deca;padding-top:14px}@media(max-width:700px){.capacity{grid-template-columns:1fr;padding:20px}}</style>
