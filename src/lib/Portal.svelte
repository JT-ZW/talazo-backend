<script lang="ts">
 import {page} from '$app/state';
 import {monitoringNeedsReview} from './freshness.mjs';
 import {displayText} from './display-text.mjs';
 import NavIcon from './NavIcon.svelte';
 import FarmZoneMap from './FarmZoneMap.svelte';
 import CropDashboard from './CropDashboard.svelte';
 import ImpactDashboard from './ImpactDashboard.svelte';
 import OperationsDashboard from './OperationsDashboard.svelte';
 import ProviderInventory from './ProviderInventory.svelte';
 import JobHealth from './JobHealth.svelte';
 import FieldChanges from './FieldChanges.svelte';
 import PortalAccount from './PortalAccount.svelte';
 import SupportRequests from './SupportRequests.svelte';
 import HistoryRequests from './HistoryRequests.svelte';
 import DatePicker from './DatePicker.svelte';
 import {untrack,onMount,tick} from 'svelte';
 let navigationReady=$state(false);onMount(()=>{navigationReady=true;});
 import {todayISO} from './calendar.mjs';
 import {enhance} from '$app/forms';
 import {feedbackForm} from '#lib/feedback.ts';
 import ProviderConnection from './ProviderConnection.svelte';
 import CropHealthPage from './CropHealthPage.svelte';
 import ImageExplorer from './ImageExplorer.svelte';
 import FieldInsightPage from './FieldInsightPage.svelte';
 import {insightPages,isInsightPage} from './insight-pages.mjs';
 import {standardCrop} from './crops.mjs';
 import FieldCapacity from './FieldCapacity.svelte';
 import CropAdministration from './CropAdministration.svelte';
 import BoundaryMap from './BoundaryMap.svelte';
 import FieldMapReview from './FieldMapReview.svelte';
 import FieldWeather from './FieldWeather.svelte';
 import AnalysisReports from './AnalysisReports.svelte';
 import FieldPassport from './FieldPassport.svelte';
 import {normalizeIndex,sensedMap} from './satellite.mjs';
 import './portal.css';
 let {data,form}: {data:any,form?:any}=$props();
 let menu=$state(false),boundary=$state(''),selectedFarm=$state(''),selectedZone=$state(untrack(()=>data.initialZone||'')),selectedDate=$state(''),busy=$state(false);
 const farmerNav=[['overview','Overview'],['farms','My farms'],['satellite','Satellite monitoring'],['weather','Weather'],...insightPages,['analysis','Analysis & reports'],['account','Account & support']];
 const adminNav=[['overview','Operations overview'],['users','Farmers & invitations'],['quota','Hectare allocations'],['requests','Monitoring requests'],['operations','Integration health'],['crops','Crops & analysis'],['impact','Impact'],['support','Support inbox']];
 let nav=$derived(data.admin?adminNav:farmerNav);
 const farmerGroups=[{label:'Workspace',ids:['overview','farms']},{label:'Field monitoring',ids:['satellite','weather']},{label:'Crop intelligence',ids:insightPages.map(([id])=>id)},{label:'Reports & support',ids:['analysis','account']}];
 const adminGroups=[{label:'Workspace',ids:['overview']},{label:'People & capacity',ids:['users','quota','support']},{label:'Monitoring operations',ids:['requests','operations']},{label:'Intelligence',ids:['crops','impact']}];
 let navGroups=$derived(data.admin?adminGroups:farmerGroups);
 function closeMenu(){menu=false;document.getElementById('portal-menu-toggle')?.focus();}
 let farms=$derived(data.tables.talazo_farms),zones=$derived(data.tables.talazo_zones),monitoring=$derived(data.tables.talazo_monitoring.filter((m:any)=>m.environment===data.environment));
 let insightPage=$derived(isInsightPage(data.section));
 let insightEnabled=$derived(Boolean(data.insightZoneIds?.length));
 let pageZones=$derived(insightPage?zones.filter((z:any)=>data.insightZoneIds?.includes(z.id)):zones);
 const requestedDate=()=>page.url.searchParams.get('date')||'';
 $effect(()=>{
  if(data.initialZone){selectedZone=data.initialZone;selectedFarm='';}
 });
 $effect(()=>{
  selectedDate=requestedDate();
 });
 let pageFarms=$derived(insightPage?farms.filter((f:any)=>pageZones.some((z:any)=>z.farm_id===f.id)):farms);
 let effectiveFarm=$derived(pageFarms.some((f:any)=>f.id===selectedFarm)?selectedFarm:'');
 let visibleZones=$derived(effectiveFarm?pageZones.filter((z:any)=>z.farm_id===effectiveFarm):pageZones);
 let zone=$derived(visibleZones.find((z:any)=>z.id===selectedZone)||visibleZones[0]);
 let record=$derived(monitoring.find((m:any)=>m.zone_id===zone?.id));
 function fieldHref(section:string){
  const field=zone?.id||selectedZone;
  const dated=['satellite','analysis'].includes(section)||isInsightPage(section);
  return '/portal/'+section+(field&&(dated||['overview','weather'].includes(section))?'?'+new URLSearchParams({field,...(dated&&date?{date}:{})}):'');
 }
 let requestFilter=$derived(page.url.searchParams.get('view'));
 let requests=$derived(monitoring.filter((m:any)=>requestFilter==='pending'?m.status==='requested':requestFilter==='attention'?monitoringNeedsReview(m):true));
 const descriptions:Record<string,string>={
  farms:'Manage your farms, growing areas and monitoring setup.',
  satellite:'Review dated satellite images and follow changes in your field.',
  weather:'Check the forecast for your selected field.',
  health:'See how vegetation is changing and where to inspect your field.',
  pests:'Review potential pest and disease risks for the selected observation.',
  weeds:'See potential weeds and plan what to look for when scouting.',
  nutrients:'Review nutrient estimates with the product, rate and units supplied.',
  irrigation:'Review vegetation moisture and the dated watering outlook.',
  yield:'Follow the provider yield estimate and harvest outlook.',
  soil:'Review modelled soil properties and what to verify with sampling.',
  analysis:'Review readings, field records and reports.',
  account:'Manage your sign-in, monitoring allowance and support requests.',
  support:'Review and respond to requests from the farmer workspace.',
  users:'Invite farmers and manage workspace access.',
  quota:'Track monthly capacity and allocate hectares.',
  requests:'Review field boundaries and manage monitoring requests.',
  operations:'Check provider connectivity, job health and recent activity.',
  crops:'Review crop classifications and analysis.',
  impact:'Track fellowship goals and evidence of venture outcomes.'
 };
 let observation=$derived(data.tables.talazo_observations.find((o:any)=>o.monitoring_id===record?.id));
 let products=$derived(observation?.data?.products||{});
 let indices=$derived(products.getAllIndexValues?.value||{});
 let sensed=$derived(sensedMap(products.getSensedDays?.value));
 let dates=$derived(Object.keys(sensed).sort().reverse());
 let date=$derived(dates.includes(selectedDate)?selectedDate:dates[0]);
 let latest=$derived(normalizeIndex(indices.ndvi?.[date]));
 let forecast=$derived(products.getForecastWeather?.value?.normal||products.getForecastWeather?.value||{});
 let weather=$derived(products.getPresentWeather?.value?.current);
 let period=$derived(data.tables.talazo_periods.find((p:any)=>p.period===data.period));
 let allocations=$derived(data.tables.talazo_allocations.filter((a:any)=>a.period===data.period));
 let allocated=$derived(allocations.reduce((n:number,a:any)=>n+Number(a.sqm),0));
 let monitored=$derived(zones.filter((z:any)=>monitoring.some((m:any)=>m.zone_id===z.id&&['registering','uncertain','awaiting','active'].includes(m.status))).reduce((n:number,z:any)=>n+Number(z.area_sqm),0));
 const ha=(sqm:number)=>new Intl.NumberFormat('en',{maximumFractionDigits:4}).format(Number(sqm||0)/10000);
 const dateText=(v:string)=>v&&/^\d{8}$/.test(v)?`${v.slice(6)}/${v.slice(4,6)}/${v.slice(0,4)}`:v?new Date(v).toLocaleString('en-GB',{timeZone:'Africa/Harare'}):'Not yet available';
 const nameOf=(z:any)=>farms.find((f:any)=>f.id===z?.farm_id)?.name||'Farm';
 const statusText=(s:string)=>({requested:'Awaiting Talazo approval',registering:'Registering',uncertain:'Needs reconciliation',awaiting:'Awaiting observations',active:'Monitoring',paused:'Monitoring paused',error:'Needs attention'}[s]||'Not requested');
 let crop=$state('');
 let matchedCrop=$derived(standardCrop(crop,data.tables.talazo_crop_catalog));
 const enhanced=feedbackForm({onBusy:value=>busy=value});
 const signout=feedbackForm({branded:true,success:'You’ve been signed out.'});
 let chosenFarm=$state('');
 let setupFarm=$state('');
 let farmDialog=$state<HTMLDialogElement>();
 let farmMode=$state<'create'|'edit'|'addField'|'field'|'changes'|'deleteFarm'|'deleteZone'|null>(null);
 let dialogField=$state<any>(null);
 let dialogStartForm=$state.raw<any>(null);
 let selectedFarmGroup=$derived.by(()=>{
  const anchor=page.url.hash.startsWith('#field-')?page.url.hash.slice(7):'';
  const linkedFarm=zones.find((z:any)=>z.id===anchor)?.farm_id;
  const farm=farms.find((f:any)=>f.id===(chosenFarm||linkedFarm))||farms[0];
  return {farm,fields:zones.filter((z:any)=>z.farm_id===farm?.id)};
 });
 const farmModalTitles={create:'Add a farm',edit:'Edit farm details',addField:'Map a new field',field:'Field details',changes:'Field changes and history',deleteFarm:'Delete farm',deleteZone:'Delete field'};
 async function openFarmDialog(mode:NonNullable<typeof farmMode>,field?:any){
  if(mode==='addField'){setupFarm=selectedFarmGroup.farm?.id;boundary='';crop='';}
  dialogField=field||null;
  dialogStartForm=form;
  farmMode=mode;
  await tick();
  if(farmDialog&&!farmDialog.open)farmDialog.showModal();
 }
 function closeFarmDialog(){farmDialog?.close();farmMode=null;}
 const farmEnhanced=feedbackForm({onBusy:value=>busy=value,onSuccess:()=>{if(form?.savedFarm)chosenFarm=form.savedFarm;closeFarmDialog();}});
 const fieldEnhanced=feedbackForm({onBusy:value=>busy=value,onSuccess:closeFarmDialog});
 </script>
<svelte:window onkeydown={e=>{if(e.key==='Escape'&&menu)closeMenu();}}/>
<svelte:head><title>{nav.find(([id])=>id===data.section)?.[1]} · Talazo</title><meta name="robots" content="noindex,nofollow"/></svelte:head>
<a class="skip" href="#portal-content">Skip to content</a>
<div class="p-shell">
 <aside id="portal-navigation" class="p-sidebar" class:open={menu}>
  <button type="button" class="p-menu p-button subtle p-close-menu" aria-label="Close navigation" onclick={closeMenu}>Close menu</button>
  <a class="p-logo" href={data.admin?'/admin/overview':'/portal/overview'}><img src="/images/talazo-logo-cropped.png" alt="Talazo Agritech"/></a>
  <div class="p-workspace-label"><span class="p-workspace-dot" aria-hidden="true"></span>{data.admin?'Administration':'Farmer workspace'}</div>
  <nav aria-label="Main navigation">{#each navGroups as group,groupIndex}<div class="p-nav-section"><p class="p-nav-group" id={'nav-group-'+groupIndex}>{group.label}</p><ul aria-labelledby={'nav-group-'+groupIndex}>{#each nav.filter(([id])=>group.ids.includes(id)) as [id,label]}<li>{#if !data.admin&&isInsightPage(id)&&!insightEnabled}<span class="p-nav-disabled" role="link" aria-disabled="true" aria-describedby="insight-activation-note"><NavIcon name={id}/><span class="p-nav-label">{label}</span><span class="p-nav-lock"><NavIcon name="lock"/></span></span>{:else}<a class:current={data.section===id} aria-current={data.section===id?'page':undefined} href={data.admin?'/admin/'+id:fieldHref(id)} onclick={()=>menu=false}><NavIcon name={id}/><span class="p-nav-label">{label}</span>{#if data.section===id}<span class="p-nav-active-dot" aria-hidden="true"></span>{/if}</a>{/if}</li>{/each}</ul></div>{/each}</nav>
  {#if !data.admin&&!insightEnabled}<p id="insight-activation-note" class="p-nav-note">Crop pages unlock when a field has active satellite monitoring.</p>{/if}
  {#if data.isAdmin}<a class="p-switch" href={data.admin?'/portal/overview':'/admin/overview'}><NavIcon name="switch"/><span>{data.admin?'Open farmer workspace':'Open administration'}</span><span aria-hidden="true">&nearr;</span></a>{/if}
  <div class="p-sidebar-foot"><p class="p-nav-brandline">Rooted in better decisions.</p><form method="POST" action="?/signout" use:enhance={signout}><button class="p-button subtle p-signout"><NavIcon name="logout"/>Sign out</button></form></div>
 </aside>
 {#if menu}<button type="button" class="p-nav-backdrop" aria-label="Close navigation overlay" onclick={closeMenu}></button>{/if}
 <div class="p-body">
  <header class="p-topbar"><button id="portal-menu-toggle" disabled={!navigationReady} class="p-menu p-button subtle" aria-controls="portal-navigation" aria-expanded={menu} onclick={()=>menu=!menu}>Menu</button><span>{data.admin?'Talazo administration':data.name}</span><div><span class="p-status">{data.environment==='test'?'Test environment':'Satellite monitoring'}</span><span class="p-avatar">{data.name.slice(0,1).toUpperCase()}</span></div></header>
  <main id="portal-content" class="p-main">
   <div class="p-heading"><div><p class="p-kicker">TALAZO / {data.admin?'ADMINISTRATION':'FARM INTELLIGENCE'}</p><h1>{data.section==='overview'?(data.admin?'Operations overview':'Farm overview'):nav.find(([id])=>id===data.section)?.[1]}</h1><p>{data.section==='overview'?(data.admin?'Review monitoring requests and track your monthly capacity.':'See your fields and their latest observations.'):descriptions[data.section]||'Explore dated observations for your selected field.'}</p></div>{#if !data.admin&&data.section==='overview'}<a class="p-button" href="/portal/farms">Manage my land <span aria-hidden="true">↗</span></a>{/if}</div>
   {#if data.environment==='test'}<div class="p-test"><strong>Test mode</strong> Provider results are samples, not observations of your farm. Test and live records are kept separate.</div>{/if}
   {#if data.liveRegistrationIssue}<div class="p-test" role="status">The live satellite registration needs administrator reconciliation. Do not submit the field again until the provider confirms its identifier and boundary.</div>{/if}
   {#if form?.message}<div class="p-feedback" role="status">{displayText(form.message)}</div>{/if}
   {#if form?.invitation}<section class="p-card"><h2>Private activation link</h2><p>Share this single-use link directly with the approved farmer. Treat it as a credential.</p><label class="p-field">Access link<input readonly value={form.invitation} onclick={e=>e.currentTarget.select()}/></label></section>{/if}
   {#if busy}<p role="status" class="p-working">Saving your request…</p>{/if}

   {#if data.admin}
    {#if data.section==='overview'}
     <div class="p-section-heading"><p>Fellowship goals and venture reporting</p><a class="p-button subtle" href="/admin/impact">View impact &nearr;</a></div>
     <div class="p-admin-overview"><OperationsDashboard {data} capacity={quotaSummary}/></div>
    {:else if data.section==='impact'}
     <ImpactDashboard {data} {form}/>
    {:else if data.section==='support'}
     <SupportRequests {data} {form}/>
    {:else if data.section==='users'}
     <section class="p-card"><p class="p-kicker">CONTROLLED ONBOARDING</p><h2>Welcome a farmer to Talazo.</h2><p>The farmer receives a private activation link and chooses their own password. Existing approved farmers can receive a fresh access link here.</p><form method="POST" action="?/invite" use:enhance={enhanced} class="p-form"><label class="p-field">Farmer name<input name="name" required maxlength="120" autocomplete="name"/></label><label class="p-field">Email address<input name="email" required type="email" autocomplete="email"/></label><label class="p-field">Delivery<select name="delivery"><option value="supabase">Send invitation through Supabase email</option><option value="link">Generate a link to share directly</option>{#if data.emailReady}<option value="email">Send invitation email</option>{/if}</select></label><button disabled={busy} class="p-button">Approve farmer & create access link ↗</button></form>{#if !data.emailReady}<p class="p-caption">Supabase sends invitation emails using your Auth email settings. For production, configure a verified SMTP sender and allow this app’s redirect URL. Private links are available if email delivery is unavailable.</p>{/if}</section>
     <section class="p-card"><h2>Farmer register <span class="p-muted">/ {data.users.length}</span></h2><div class="p-table"><table><thead><tr><th>Farmer</th><th>Status</th><th>Access</th></tr></thead><tbody>{#each data.users as u}<tr><td><strong>{u.name}</strong><small>{u.email}</small></td><td><span class="p-pill">{u.status}</span></td><td><form method="POST" action="?/status" use:enhance={enhanced}><input type="hidden" name="user" value={u.user_id}/><input type="hidden" name="status" value={u.status==='suspended'?'active':'suspended'}/><button disabled={busy} class="p-button subtle">{u.status==='suspended'?'Reactivate':'Suspend access'}</button></form></td></tr>{:else}<tr><td colspan="3">No farmers registered yet. Start with an invitation above.</td></tr>{/each}</tbody></table></div></section>
     <section class="p-card"><h2>Set up a farm on a farmer’s behalf</h2><form method="POST" action="?/farm" use:enhance={enhanced} class="p-form"><label class="p-field">Owner<select name="owner" required><option value="">Choose a farmer</option>{#each data.users as u}<option value={u.user_id}>{u.name}</option>{/each}</select></label><label class="p-field">Farm name<input name="name" required maxlength="120"/></label><label class="p-field">District<input name="district" maxlength="120"/></label><button class="p-button" disabled={busy}>Create farm</button></form><p class="p-caption">Use the farmer workspace to add growing areas to farms you manage.</p></section>
    {:else if data.section==='quota'}
     {@render quotaSummary()}
     <div class="p-grid"><section class="p-card"><p class="p-kicker">PAID CAPACITY</p><h2>Your monthly hectare quota</h2><p>Enter the hectares covered by your paid subscription. This is your declared allowance, not a provider-verified balance.</p><form method="POST" action="?/quota" use:enhance={enhanced} class="p-form single"><label class="p-field">Paid month<DatePicker name="period" value={data.period.slice(0,7)} mode="month" label="Paid month" required/></label><label class="p-field">Monthly quota (ha)<input type="number" name="hectares" min="0" step="0.0001" value={period?period.quota_sqm/10000:''} required/></label><button class="p-button" disabled={busy}>Save monthly quota</button></form></section><section class="p-card"><p class="p-kicker">FARMER ALLOWANCE</p><h2>Allocate monitored hectares</h2><form method="POST" action="?/allocation" use:enhance={enhanced} class="p-form single"><label class="p-field">Farmer<select name="user" required><option value="">Choose farmer</option>{#each data.users as u}<option value={u.user_id}>{u.name}</option>{/each}</select></label><label class="p-field">Paid month<DatePicker name="period" value={data.period.slice(0,7)} mode="month" label="Paid month" required/></label><label class="p-field">Total allowance for this farmer (ha)<input type="number" name="hectares" min="0" step="0.0001" required/></label><button class="p-button" disabled={busy}>Save allocation</button></form></section></div>
     <section class="p-card"><h2>Allocation ledger</h2><div class="p-table"><table><thead><tr><th>Month</th><th>Farmer</th><th>Allocated hectares</th></tr></thead><tbody>{#each data.tables.talazo_allocations as a}<tr><td>{a.period.slice(0,7)}</td><td>{data.users.find((u:any)=>u.user_id===a.user_id)?.name||'Farmer'}</td><td>{ha(a.sqm)} ha</td></tr>{:else}<tr><td colspan="3">No allocations yet.</td></tr>{/each}</tbody></table></div></section>
    {:else if data.section==='crops'}
     <CropAdministration {data} {enhanced} {busy}/>
    {:else if data.section==='requests'}
     <section class="p-card"><h2>Monitoring requests</h2><p>Registration reserves the farmer’s allocated area. Uncertain registrations retain that reservation to prevent duplicate submissions.</p><nav class="p-page-tabs" aria-label="Monitoring request filters">
      <a aria-current={!['pending','attention'].includes(requestFilter||'')?'page':undefined} href="/admin/requests">All records</a>
      <a aria-current={requestFilter==='pending'?'page':undefined} href="/admin/requests?view=pending">Awaiting approval</a>
      <a aria-current={requestFilter==='attention'?'page':undefined} href="/admin/requests?view=attention">Needs attention</a>
     </nav>{#each requests as m}{@const z=zones.find((z:any)=>z.id===m.zone_id)}<article class="p-request"><div><p class="p-kicker">{nameOf(z)} / {ha(z?.area_sqm)} HA</p><h3>{z?.name}</h3><p>{z?.crop_name} · {statusText(m.status)}</p>{#if m.error}<p class="p-error">{displayText(m.error)}</p>{/if}<FieldMapReview boundary={z?.boundary} label="Review field boundary on Google Maps"/></div><div>{#if ['requested','paused'].includes(m.status)}<form method="POST" action="?/register" use:enhance={enhanced}><input type="hidden" name="monitoring" value={m.id}/><button disabled={busy||!data.providerConfigured} class="p-button">{m.status==='paused'?'Resume monitoring':data.environment==='test'?'Approve sample preview':'Approve & register field'}</button></form>{:else if m.provider_id}<form method="POST" action="?/sync" use:enhance={enhanced}><input type="hidden" name="monitoring" value={m.id}/><button disabled={busy} class="p-button subtle">Refresh observations</button></form>{#if ['active','awaiting'].includes(m.status)}{#if data.environment==='live'}<form method="POST" action="?/details" use:enhance={enhanced}><input type="hidden" name="monitoring" value={m.id}/><button disabled={busy} class="p-button subtle">Sync satellite field details</button></form>{/if}<form method="POST" action="?/pause" use:enhance={enhanced}><input type="hidden" name="monitoring" value={m.id}/><button disabled={busy} class="p-button subtle">Pause monitoring</button></form>{/if}{/if}<small>Last sync: {dateText(m.last_sync)}</small></div></article>{:else}<div class="p-empty compact"><h3>No requests to review.</h3><p>{requestFilter?'No fields match this filter.':'Requests appear after a farmer maps their growing area.'}</p></div>{/each}</section>
    {:else}
     <ProviderInventory {data} {enhanced} {busy}/>
     <JobHealth jobs={data.jobs}/>
     <FieldChanges {data} {enhanced} {busy}/>
     <HistoryRequests {data} {enhanced} {busy}/>
     {#if data.liveRegistrationIssue}<section class="p-card"><p class="p-kicker">LIVE CONNECTION / RECONCILIATION REQUIRED</p><h2>Verify the first registration before retrying.</h2><p>The provider did not return a verified registration. Open your satellite account and check whether the submitted field already exists. If it does, enter its ID below. Talazo will verify the boundary before saving the mapping.</p><a class="p-button subtle" href="https://sat.farmonaut.com/" target="_blank" rel="noopener noreferrer">Open satellite account ↗</a>{#each data.tables.talazo_monitoring.filter((m:any)=>m.environment==='live'&&m.status==='uncertain') as m}{@const z=zones.find((z:any)=>z.id===m.zone_id)}<form method="POST" action="?/discover" use:enhance={enhanced}><input type="hidden" name="monitoring" value={m.id}/><button class="p-button subtle" disabled={busy}>Find &amp; verify existing field</button></form><form method="POST" action="?/reconcile" use:enhance={enhanced} class="p-form"><input type="hidden" name="monitoring" value={m.id}/><label class="p-field">{nameOf(z)} / {z?.name} · Monitoring field ID<input name="provider_id" required maxlength="120" autocomplete="off"/></label><button class="p-button" disabled={busy}>Verify existing live field</button></form><p class="p-caption">{displayText(m.error)}</p>{/each}</section>{/if}<section class="p-card"><h2>Integration health</h2><dl class="p-facts"><div><dt>Provider</dt><dd>Satellite monitoring</dd></div><div><dt>API key</dt><dd>{data.providerConfigured?'Configured on server':'Missing'}</dd></div><div><dt>Environment</dt><dd>{data.environment}</dd></div><div><dt>Google Maps</dt><dd>{data.mapsConfigured?'Browser key configured':'Add PUBLIC_GOOGLE_MAPS_API_KEY'}</dd></div><div><dt>Monitored area committed</dt><dd>{ha(monitored)} ha</dd></div></dl><form method="POST" action="?/connection" use:enhance={enhanced}><button class="p-button subtle" disabled={busy||!data.providerConfigured}>Check production connection</button></form>
{#if form?.connectionChecks}<div class="p-feedback" role="status"><p>Checked: {dateText(form.connectionCheckedAt)}</p>{#each form.connectionChecks as check}<p><strong>{check.endpoint}: {check.ok?'Responding':'Needs attention'}</strong><br/>{displayText(check.message)}</p>{/each}</div>{/if}
<p>Approved fields are registered in your satellite monitoring account. Pausing and resuming monitoring also updates the satellite service. Farmer accounts, approvals, hectare allocations and field activity records are managed in Talazo.</p><p>Scheduled synchronization requires the protected worker endpoint and a hosting scheduler. Account usage alone does not establish working field imagery.</p></section><section class="p-card"><h2>Recent activity</h2>{#each data.events as e}<div class="p-activity"><span>{e.action.replaceAll('_',' ')}</span><small>{dateText(e.created_at)}</small></div>{:else}<p>No activity recorded yet.</p>{/each}</section>
    {/if}
   {:else}
    {#if data.section==='overview'}
     <CropDashboard {data} bind:field={selectedZone}/>
    {:else if data.section==='farms'}
     <div class="farm-toolbar">
      {#if farms.length>1}<div class="farm-picker" role="group" aria-label="Select a farm">{#each farms as f (f.id)}<button type="button" class="p-button subtle" aria-pressed={selectedFarmGroup.farm?.id===f.id} onclick={()=>chosenFarm=f.id}>{f.name}</button>{/each}</div>{/if}
      <button type="button" class="p-button" onclick={()=>void openFarmDialog('create')}><span aria-hidden="true">+</span> Add a farm</button>
     </div>
     {#if selectedFarmGroup.farm}
      {@const farm=selectedFarmGroup.farm}
      {@const fields=selectedFarmGroup.fields}
      <section class="p-card farm-profile">
       <div>
        <h2>{farm.name}</h2>
        <dl class="farm-facts">
         <div><dt>Location</dt><dd>{farm.district||'District not recorded'}</dd></div>
         <div><dt>Field zones</dt><dd>{fields.length}</dd></div>
         <div><dt>Mapped area</dt><dd>{ha(fields.reduce((sum:number,z:any)=>sum+Number(z.area_sqm),0))} ha</dd></div>
         <div><dt>Zones monitored</dt><dd>{fields.filter((z:any)=>monitoring.some((m:any)=>m.zone_id===z.id&&m.status==='active')).length} of {fields.length}</dd></div>
        </dl>
        <div class="farm-buttons">
         <button type="button" class="p-button subtle" onclick={()=>void openFarmDialog('edit')}>Edit farm details</button>
         <button type="button" class="p-button farm-danger-outline" onclick={()=>void openFarmDialog('deleteFarm')}>Delete farm</button>
        </div>
       </div>
       <div><h3>Farm layout</h3><FarmZoneMap {fields} active={page.url.hash.slice(7)}/></div>
      </section>
      <section class="p-card farm-group">
       <div class="farm-heading"><h2>Field zones</h2><div class="farm-buttons">
        {#if fields.length}<button type="button" class="p-button subtle" onclick={()=>void openFarmDialog('changes')}>Changes and history</button>{/if}
        <button type="button" class="p-button" onclick={()=>void openFarmDialog('addField')}>Add a field</button>
       </div></div>
       {#if fields.length}
        <ul class="farm-fields">
         {#each fields as z (z.id)}
          {@const m=monitoring.find((entry:any)=>entry.zone_id===z.id)}
          <li id={'field-'+z.id}>
           <div class="farm-field-row">
            <div><h3>{z.name}</h3><p>{z.crop_entered_name||z.crop_name} &middot; {ha(z.area_sqm)} ha{#if z.sowing_date} &middot; Planted {z.sowing_date}{/if}</p></div>
            <div class="farm-field-actions">
             <span class="p-pill">{m?statusText(m.status):'Monitoring not requested'}</span>
             <button type="button" class="p-button subtle" onclick={()=>void openFarmDialog('field',z)}>Field details</button>
             {#if !m}
              <form method="POST" action="?/request" use:enhance={enhanced}><input type="hidden" name="zone" value={z.id}/><button class="p-button subtle" disabled={busy}>Request monitoring</button></form>
             {:else if ['active','awaiting'].includes(m.status)}
              <a class="p-button subtle" href={'/portal/satellite?field='+encodeURIComponent(z.id)}>View monitoring &nearr;</a>
             {/if}
            </div>
           </div>
          </li>
         {/each}
        </ul>
       {:else}<p class="farm-no-fields">Map your first field to record its crop and boundary.</p>{/if}
      </section>
     {:else}
      <section class="p-card p-empty"><h2>No farms yet</h2><p>Add a farm first. Then you can map its fields and request satellite monitoring.</p></section>
     {/if}
     <dialog class="farm-dialog" bind:this={farmDialog} aria-labelledby="farm-dialog-title" onclose={()=>{if(!farmDialog?.open)farmMode=null;}}>
      {#if farmMode}
       <div class="farm-dialog-heading"><h2 id="farm-dialog-title">{farmModalTitles[farmMode]}</h2><button type="button" class="p-button subtle" onclick={closeFarmDialog}>Close</button></div>
       {#if form!==dialogStartForm&&form?.message}<p class="p-feedback" role="status">{displayText(form.message)}</p>{/if}
       {#if farmMode==='create'}
        <form method="POST" action="?/farm" use:enhance={farmEnhanced} class="p-form"><label class="p-field">Farm name<input name="name" required maxlength="120" placeholder="e.g. Mupfuti Farm"/></label><label class="p-field">District<input name="district" maxlength="120" placeholder="e.g. Goromonzi"/></label>{#if data.isAdmin}<label class="p-field">Farm owner<select name="owner" required><option value={data.userId}>My own farm (administrator)</option>{#each data.users as u}<option value={u.user_id}>{u.name}</option>{/each}</select></label>{/if}<button class="p-button" disabled={busy}>Save farm ↗</button></form>
       {:else if farmMode==='edit'&&selectedFarmGroup.farm}
        <form method="POST" action="?/editFarm" use:enhance={farmEnhanced}>
         <input type="hidden" name="farm" value={selectedFarmGroup.farm.id}/>
         <label class="p-field">Farm name<input name="name" required maxlength="120" value={selectedFarmGroup.farm.name}/></label>
         <label class="p-field">District<input name="district" maxlength="120" value={selectedFarmGroup.farm.district||''}/></label>
         <button class="p-button" disabled={busy}>Save changes</button>
        </form>
       {:else if farmMode==='addField'}
        <form method="POST" action="?/zone" use:enhance={fieldEnhanced}><div class="p-form"><label class="p-field">Farm<select name="farm" required bind:value={setupFarm}><option value="" disabled>Choose a farm</option>{#each farms as f}<option value={f.id}>{f.name}</option>{/each}</select></label><label class="p-field">Growing area name<input name="name" required maxlength="120" placeholder="e.g. North field"/></label><label class="p-field">Crop name<small aria-live="polite">{crop.trim()?(matchedCrop.review?'Saved as entered; Talazo will classify it for reporting.':'Standard reporting crop: '+matchedCrop.name):'Type the crop you grow. We standardize its name for reporting.'}</small><input name="crop_name" bind:value={crop} required maxlength="120" placeholder="e.g. Maize, soya beans, groundnuts"/></label><label class="p-field">Actual planting date <small>Optional</small><DatePicker name="sowing" max={todayISO()} label="Actual planting date"/></label></div><BoundaryMap bind:value={boundary}/><input type="hidden" name="boundary" value={boundary}/><FieldCapacity {boundary} farm={setupFarm} {farms} {zones} {allocations} period={data.period}/><details class="farm-coordinate-options"><summary class="p-button subtle">Enter GeoJSON coordinates</summary><label class="p-field">GeoJSON Polygon (longitude, latitude)<textarea bind:value={boundary} rows="5" required placeholder={JSON.stringify({type:'Polygon',coordinates:[[[31,-17],[31.01,-17],[31.01,-17.01],[31,-17]]]})}></textarea></label></details><label class="p-field">Soil, irrigation, drainage & field notes<textarea name="notes" rows="3" maxlength="2000" placeholder="What is distinctive about this growing area?"></textarea></label><button class="p-button" disabled={busy||!boundary}>Save field ↗</button><p class="p-caption">Saving calculates the field area. You can request monitoring from the saved field.</p></form>
       {:else if farmMode==='changes'}
        <FieldChanges {data} {enhanced} {busy} embedded farmId={selectedFarmGroup.farm?.id}/>
       {:else if farmMode==='field'&&dialogField}
        <h3>{dialogField.name}</h3>
        <p>{dialogField.crop_entered_name||dialogField.crop_name} &middot; {ha(dialogField.area_sqm)} ha</p>
        <p>Planting date: {dialogField.sowing_date||'Not recorded'}</p>

        <BoundaryMap value={JSON.stringify(dialogField.boundary)} editable={false}/>
        <form method="POST" action="?/editZoneNotes" use:enhance={fieldEnhanced}>
         <input type="hidden" name="zone" value={dialogField.id}/>
         <label class="p-field">Field notes<textarea name="notes" rows="3" maxlength="2000" value={dialogField.characteristics||''}></textarea></label>
         <div class="farm-buttons"><button class="p-button" disabled={busy}>Save field notes</button><button type="button" class="p-button farm-danger-outline" onclick={()=>void openFarmDialog('deleteZone',dialogField)}>Delete field</button></div>
        </form>
       {:else if farmMode==='deleteFarm'&&selectedFarmGroup.farm}
        {#if selectedFarmGroup.fields.length}<p>Only empty farms can be deleted. This farm contains {selectedFarmGroup.fields.length} field zones.</p>
        {:else}
         <p>Permanently delete <strong>{selectedFarmGroup.farm.name}</strong>?</p>
         <form method="POST" action="?/deleteFarm" use:enhance={farmEnhanced}><input type="hidden" name="farm" value={selectedFarmGroup.farm.id}/><button class="p-button farm-danger" disabled={busy}>Delete farm permanently</button></form>
        {/if}
       {:else if farmMode==='deleteZone'&&dialogField}
        {#if data.tables.talazo_monitoring.some((m:any)=>m.zone_id===dialogField.id)||data.tables.talazo_field_activities?.some((a:any)=>a.zone_id===dialogField.id)}
         <p>Fields with monitoring or activity history cannot be deleted.</p>
        {:else}
         <p>Permanently delete <strong>{dialogField.name}</strong> and its saved boundary?</p>
         <form method="POST" action="?/deleteZone" use:enhance={farmEnhanced}><input type="hidden" name="zone" value={dialogField.id}/><button class="p-button farm-danger" disabled={busy}>Delete field permanently</button></form>
        {/if}
       {/if}
      {/if}
     </dialog>
    {:else if ['satellite','weather','analysis'].includes(data.section)||insightPage}
     {#if pageZones.length&&data.section!=='weather'}<section class="p-filter">{#if pageFarms.length>1||!insightPage&&data.section!=='analysis'}<label class="p-field">Farm<select bind:value={selectedFarm} onchange={()=>selectedDate=''}><option value="">All my farms</option>{#each pageFarms as f}<option value={f.id}>{f.name}</option>{/each}</select></label>{/if}<label class="p-field">Field<select value={zone?.id||''} onchange={e=>{selectedZone=e.currentTarget.value;selectedDate='';}}>{#if !visibleZones.length}<option value="">No fields in this farm</option>{/if}{#each visibleZones as z}<option value={z.id}>{z.name} · {nameOf(z)}</option>{/each}</select></label>{#if !['weather','satellite'].includes(data.section)}<label class="p-field">Available observation<select bind:value={selectedDate} disabled={!dates.length}>{#if !dates.length}<option value="">Awaiting observations</option>{:else}<option value="">Latest · {dateText(dates[0])}</option>{#each dates as d}<option value={d}>{dateText(d)}</option>{/each}{/if}</select></label><span class="p-pill">{statusText(record?.status)}</span>{/if}</section>{/if}
     {#if data.section==='weather'&&zone}{#key zone.id}<FieldWeather {zone} farm={nameOf(zone)} fields={zones.map((z:any)=>({id:z.id,label:z.name+' / '+nameOf(z)}))} onFieldChange={id=>{selectedFarm='';selectedZone=id;}} cached={data.tables.talazo_weather.find((w:any)=>w.zone_id===zone.id&&w.environment===data.environment)} {products} {enhanced} {busy}/>{/key}
     {:else if data.section==='weather'}<section class="p-card p-empty"><h2>Add a field to see its forecast</h2><p>Talazo uses the saved field boundary to locate your forecast.</p><a class="p-button" href="/portal/farms">Go to My Farms</a></section>
     {:else if insightPage}
      {#if !insightEnabled}<section class="p-card p-empty"><p class="p-kicker">CROP INTELLIGENCE / NOT ACTIVE YET</p><h2>Activate a field to open this page.</h2><p>Save a farm and field, request satellite monitoring, then wait for Talazo approval and the first observations. This page becomes available automatically when monitoring is active.</p><a class="p-button" href="/portal/farms">Review my farms</a></section>
      {:else if !zone||!record||!observation}<section class="p-card p-empty"><h2>Your field data is getting ready.</h2><p>Select an active field. Its dated information will appear after observations have synchronized.</p><a class="p-button subtle" href={fieldHref('satellite')}>View monitoring status</a></section>
      {:else if data.section==='health'}{#key record.id}<CropHealthPage {zone} farm={nameOf(zone)} {record} {products} {date} {enhanced} {busy}/>{/key}
      {:else}{#key record.id+date+data.section}<FieldInsightPage section={data.section} {zone} farm={farms.find((f:any)=>f.id===zone.farm_id)} {record} {products} {date} {form} {enhanced} {busy}/>{/key}{/if}
     {:else if record?.status==='awaiting'&&record.provider_id&&!dates.length}<section class="p-card p-empty"><div class="p-orbit" aria-hidden="true">◎</div><p class="p-kicker">FIELD CONNECTED / AWAITING SATELLITE DATA</p><h2>Your field is connected to satellite monitoring.</h2><p>{zone?.name} is connected. There is not yet an available optical observation. Talazo checks automatically while this page is open; crop maps, advice and dated reports become available after observations synchronize.</p><dl class="p-facts"><div><dt>Monitoring field ID</dt><dd>{record.provider_id}</dd></div><div><dt>Last check</dt><dd>{dateText(record.last_sync)}</dd></div></dl><a class="p-button" href={fieldHref('weather')}>View field weather ↗</a><p class="p-caption">You do not need to register this field again.</p></section>
     {:else if !record||!observation}<section class="p-card p-empty"><div class="p-orbit" aria-hidden="true">◎</div><p class="p-kicker">YOUR NEXT CHAPTER</p><h2>{record?'Your field is getting ready.':'Bring your fields into view.'}</h2><p>{record?`Current status: ${statusText(record.status)}. Observations will appear here after registration and synchronization.`:'Map your growing areas and request monitoring to see satellite imagery, weather and reports.'}</p><a class="p-button" href="/portal/farms">Review my growing areas ↗</a></section>
     {:else}
      {#if data.section==='satellite'}
         {@const prior=dates.find(d=>d<date&&!(sensed[d] as any)?.isCloudy&&normalizeIndex(indices.ndvi?.[d])!==null)}
         {@const previous=prior?normalizeIndex(indices.ndvi?.[prior]):null}
       <div class="satellite-workspace">
        <div class="satellite-view">{#key record.id}<ImageExplorer boundary={zone.boundary} {record} {products} {date} streamlined onObservationChange={value=>selectedDate=value}/>{/key}</div>
        <section class="p-card satellite-reading">
         <p class="p-kicker">{nameOf(zone)}</p><h2>{zone.name}</h2>
         <p>{statusText(record.status)} &middot; {dateText(date)}</p>
         {#if (sensed[date] as any)?.isCloudy}<p>Clouds affected this image. Choose a clearer observation to compare vegetation.</p>
         {:else if latest!==null&&previous!==null&&prior}<p>Vegetation looked {latest===previous?'about as green as':latest>previous?'greener than':'less green than'} on {dateText(prior)}.</p>
         {:else}<p>{date?'A vegetation comparison needs two usable readings.':'The first observation will appear after it is available.'}</p>{/if}
         <div class="satellite-links"><a class="p-button subtle" href={fieldHref('health')}>Crop Health &nearr;</a><a class="p-button subtle" href={fieldHref('irrigation')}>Irrigation &nearr;</a><a class="p-button subtle" href={fieldHref('analysis')}>Analysis &amp; Reports &nearr;</a></div>
         {#key record.id}<ProviderConnection {record}/>{/key}
        </section>
       </div>
       <section class="p-card" id="observation-history">
        <h2>Observation history</h2>
        <div class="satellite-dates" aria-label="Open an observation">{#each dates as d}<button type="button" class="p-button subtle" aria-pressed={date===d} onclick={()=>{selectedDate=d;document.querySelector('.satellite-view')?.scrollIntoView({block:'start'});}}>{dateText(d)}{#if (sensed[d] as any)?.isCloudy} &middot; Cloud-affected{/if}</button>{:else}<p>No observations yet.</p>{/each}</div>
       </section>
      {/if}
      {#if data.section==='analysis'}{#key record.id}<AnalysisReports {zone} farm={nameOf(zone)} {record} {products} {date} {form} environment={data.environment} {enhanced} {busy}/>{/key}{/if}
      {#if Object.keys(observation.data.errors||{}).length}<div class="p-test">Some products were unavailable at the last sync. Available results are retained with their own retrieval dates.</div>{/if}
     {/if}
     {#if data.section==='analysis'&&zone}<FieldPassport {zone} farm={farms.find((f:any)=>f.id===zone.farm_id)} activities={data.tables.talazo_field_activities} {enhanced} {busy}/>{/if}
    {:else}<PortalAccount {data} {form} {enhanced} {busy}/>{/if}
   {/if}
   {#if !data.admin&&data.section==='analysis'&&record}<HistoryRequests {data} {enhanced} {busy} monitoringId={record.id}/>{/if}
   <footer class="p-footer"><span>Talazo Agritech · Better decisions. Stronger roots.</span><span>Talazo crop intelligence</span></footer>
  </main>
 </div>
</div>

{#snippet quotaSummary()}
 <section class="p-card p-capacity-summary">
  <div class="p-section-heading"><div><p class="p-kicker">{data.period.slice(0,7)}</p><h2>Monthly hectare capacity</h2></div>{#if data.section!=='quota'}<a href="/admin/quota">Manage allocations &nearr;</a>{/if}</div>
  {#if period}
   <p><strong>{ha(allocated)} ha</strong> allocated of {ha(period.quota_sqm)} ha</p>
   {#if Number(period.quota_sqm)>0}<meter min="0" max={Number(period.quota_sqm)} value={Math.min(allocated,Number(period.quota_sqm))} aria-label="Allocated hectare capacity"></meter>{/if}
   <p>{allocated>period.quota_sqm?ha(allocated-period.quota_sqm)+' ha over quota':ha(period.quota_sqm-allocated)+' ha available to allocate'}</p>
  {:else}
   <p>{ha(allocated)} ha allocated. Set a monthly quota to see available capacity.</p>
  {/if}
 </section>
{/snippet}
