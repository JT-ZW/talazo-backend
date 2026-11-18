<script lang="ts">
 import {displayText} from './display-text.mjs';
 import {onMount} from 'svelte';import {invalidateAll} from '$app/navigation';
 import {enhance} from '$app/forms';
 import FieldMapReview from './FieldMapReview.svelte';
 let {data,enhanced,busy,compact=false}:{data:any,enhanced:any,busy:boolean,compact?:boolean}=$props();
 let refreshing=$state(false),message=$state('');
 let disposed=false,request:AbortController|undefined;
 async function refresh(force=false){if(refreshing||data.environment!=='live')return;refreshing=true;message='Reading fields and changes from the satellite service…';
  try{request=new AbortController();const response=await fetch('/api/satellite/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({force}),signal:request.signal});const result=await response.json();if(disposed)return;if(!response.ok)throw Error(result.message||'Account refresh unavailable.');
   message=result.skipped?'Using the latest account check. Checks are shared and throttled to protect your API allowance.':`${result.discovered} field(s) read. ${result.updated} updated; ${result.review} need boundary review; ${result.failed} need attention.`;
   if(!result.skipped)await invalidateAll();
  }catch(e){if(!disposed)message=e instanceof Error?e.message:'Satellite monitoring is temporarily unavailable.';}finally{if(!disposed)refreshing=false;}
 }
 onMount(()=>{disposed=false;void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh();},300000);return()=>{disposed=true;request?.abort();clearInterval(timer);};});
 const mapping=(id:string)=>data.tables.talazo_monitoring.find((m:any)=>m.environment==='live'&&m.provider_id===id);
 const stamp=(date:string)=>date?new Date(date).toLocaleString('en-GB',{timeZone:'Africa/Harare'}):'Not checked yet';
</script>
<section class="p-card"><div class="p-section-heading"><div><p class="p-kicker">SATELLITE CONNECTION</p><h2>Your satellite account fields</h2></div><button type="button" class="p-button" disabled={refreshing||busy||data.environment!=='live'} onclick={()=>refresh(true)}>{refreshing?'Checking account…':'Refresh satellite fields'}</button></div>
 <p>Existing provider fields are discovered here without registering them again. Choose the Talazo farm and owner before importing an unassigned field. Linked names, crops and planting dates are checked automatically; changed boundaries need your review.</p>
 <p class="p-caption">Last account check: {stamp(data.providerStatus?.checked_at)}. Farmer accounts and hectare allocations stay under Talazo’s control.</p>
 {#if message}<p class="p-feedback" role="status">{displayText(message)}</p>{/if}{#if data.providerStatus?.error}<p class="p-test" role="status">{displayText(data.providerStatus.error)}</p>{/if}
 {#if data.environment!=='live'}<p class="p-test">Switch to live mode to discover your real provider fields. Sample records are kept separate.</p>{/if}
 {#if data.environment==='live'}{#if compact}<p>{(data.providerFields||[]).filter((f:any)=>f.present).length} provider fields · {(data.providerFields||[]).filter((f:any)=>f.present&&!mapping(f.provider_id)).length} unassigned.</p><a class="p-button subtle" href="/admin/operations">Review provider fields & imports ↗</a>
 {:else}{#each data.providerFields||[] as field}{@const linked=mapping(field.provider_id)}
 <article class="provider-field"><div><p class="p-kicker">PROVIDER FIELD {field.provider_id}</p><h3>{field.name}</h3><p><span class="p-pill">{!field.present?'Absent from provider list':linked?'Connected to Talazo':'Unassigned · admin only'}</span> <span class="p-caption">{field.remote_state==='unknown'?'Provider state not supplied':field.remote_state} · Checked {stamp(field.seen_at)}</span></p>{#if field.issue}<p class="p-error">{displayText(field.issue)}</p>{/if}
 {#if field.boundary}<FieldMapReview boundary={field.boundary} label="Review the satellite field boundary"/>{/if}</div>
 {#if field.present&&field.boundary}
  {#if !linked}<form method="POST" action="?/importProvider" use:enhance={enhanced} class="p-form single"><input type="hidden" name="provider_id" value={field.provider_id}/><label class="p-field">Assign to Talazo farm & owner<select name="farm" required><option value="">Choose the owning farm</option>{#each data.tables.talazo_farms as farm}<option value={farm.id}>{farm.name} / {data.users.find((u:any)=>u.user_id===farm.owner_id)?.name||'Farmer'}</option>{/each}</select></label><label class="p-field">Field name in Talazo<input name="name" value={field.name.slice(0,120)} maxlength="120" required/></label><button class="p-button subtle" disabled={busy||refreshing}>Import existing field</button><p class="p-caption">Checks the farmer’s approved status, field overlap and current hectare allocation. This creates no new satellite field.</p></form>
  {:else if field.issue||field.fingerprint!==field.applied_hash}<form method="POST" action="?/acceptProvider" use:enhance={enhanced}><input type="hidden" name="provider_id" value={field.provider_id}/><p class="p-caption">Review the provider boundary above. Applying it recalculates hectares and retains the same farmer owner. Old cached products are cleared when crop, planting date or geometry changes.</p><button class="p-button subtle" disabled={busy||refreshing}>Apply reviewed provider changes</button></form>
  {:else}<p class="p-caption">Connected field is up to date. Its farmer can open monitoring, imagery, weather and reports.</p>{/if}
 {/if}</article>
 {:else}<div class="p-empty compact"><h3>No provider inventory loaded yet.</h3><p>Refresh your satellite account to discover existing fields.</p></div>{/each}{/if}{/if}
</section>
<style>.provider-field{padding:26px 0;border-top:1px solid #dce2d4}.provider-field h3{font-size:21px;overflow-wrap:anywhere}.provider-field .p-form{margin-top:22px;max-width:650px}.provider-field p{line-height:1.7}.provider-field .p-pill{display:inline-block;margin-right:8px}.provider-field form:not(.p-form){margin-top:18px}</style>
