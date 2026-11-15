<script lang="ts">
 import {enhance} from '$app/forms';
 let {data,enhanced,busy}:{data:any,enhanced:any,busy:boolean}=$props();
 let catalog=$derived([...data.tables.talazo_crop_catalog].sort((a,b)=>a.name.localeCompare(b.name)));
 let fields=$derived(data.tables.talazo_zones);
 let pending=$derived(fields.filter((z:any)=>z.crop_code==='999'));
 let groups=$derived([...catalog,{code:'999',name:'Unclassified / needs review'}].map(c=>{
  const rows=fields.filter((z:any)=>z.crop_code===c.code);
  const owners=new Set(rows.map((z:any)=>data.tables.talazo_farms.find((f:any)=>f.id===z.farm_id)?.owner_id));
  return {...c,count:rows.length,area:rows.reduce((sum:number,z:any)=>sum+Number(z.area_sqm),0),farmers:owners.size};
 }).filter(c=>c.count));
</script>
<section class="p-card"><p class="p-kicker">CROP REGISTER / STANDARD REPORTING</p><h2>Many ways to name a crop. One reporting standard.</h2><p>Farmers type their crop names freely. Recognized names and approved aliases are grouped under the standard crop. Unclassified entries remain visible for review and are excluded from specific crop totals.</p><div class="p-table"><table><thead><tr><th>Standard crop</th><th>Fields</th><th>Farmers</th><th>Mapped area</th></tr></thead><tbody>{#each groups as crop}<tr><td><strong>{crop.name}</strong></td><td>{crop.count}</td><td>{crop.farmers}</td><td>{(crop.area/10000).toLocaleString('en',{maximumFractionDigits:4})} ha</td></tr>{:else}<tr><td colspan="4">Crop totals will appear after farmers save their fields.</td></tr>{/each}</tbody></table></div><p class="p-caption">These are current mapped fields, not measured production or yield. The farmer’s exact crop wording is retained on each field.</p></section>
<section class="p-card"><p class="p-kicker">CLASSIFICATION QUEUE / {pending.length}</p><h2>Review new crop names.</h2><p>Choose the correct standard crop for a new name. Your decision also recognizes that wording on future registrations. Unclear names should be confirmed with the farmer before mapping them.</p>{#each pending as z}<article class="p-request"><div><h3>{z.crop_entered_name||'Name not recorded'}</h3><p>{z.name} · {data.tables.talazo_farms.find((f:any)=>f.id===z.farm_id)?.name}</p></div><form method="POST" action="?/classify" use:enhance={enhanced}><input type="hidden" name="zone" value={z.id}/><label class="p-field">Standard crop<select name="code" required><option value="">Choose the confirmed crop</option>{#each catalog as c}<option value={c.code}>{c.name}</option>{/each}</select></label><button class="p-button" disabled={busy}>Confirm classification</button></form></article>{:else}<p>All saved fields have a standard crop classification.</p>{/each}</section>
<style>.p-request form{min-width:260px}.p-field{margin-top:0}@media(max-width:600px){.p-request form{min-width:0;width:100%}}</style>
