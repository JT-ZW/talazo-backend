<script lang="ts">
 import NavIcon from './NavIcon.svelte';
 import AlertCenter from './AlertCenter.svelte';
 import SupportRequests from './SupportRequests.svelte';

 let {data,form,enhanced,busy}:{data:any;form?:any;enhanced:any;busy:boolean}=$props();
 let farms=$derived(new Set(data.tables.talazo_farms.filter((f:any)=>f.owner_id===data.userId).map((f:any)=>f.id)));
 let zones=$derived(data.tables.talazo_zones.filter((z:any)=>farms.has(z.farm_id)));
 let accountAlerts=$derived({...data,tables:{...data.tables,talazo_zones:zones}});
 let areaReserved=$derived(new Set(data.tables.talazo_monitoring.filter((m:any)=>['registering','uncertain','awaiting','active'].includes(m.status)).map((m:any)=>m.zone_id)));
 let allocation=$derived(data.tables.talazo_allocations.find((row:any)=>row.user_id===data.userId&&row.period===data.period));
 let allowance=$derived(Number(allocation?.sqm||0));
 let reserved=$derived(zones.reduce((sum:number,z:any)=>sum+(areaReserved.has(z.id)?Number(z.area_sqm):0),0));
 const ha=(value:number)=>new Intl.NumberFormat('en',{maximumFractionDigits:4}).format(value/10000)+' ha';
 const access=(value:string)=>({approved:'Approved',active:'Active',suspended:'Suspended'}[value]||'Administrator access');
 const help=[
  {title:'Set up a farm or field',body:'Add your farm, draw a field boundary, then request monitoring from the field.',href:'/portal/farms',label:'My farms',icon:'farms'},
  {title:'Find a satellite observation',body:'Select your field and check which observation dates are available. Clouds can affect optical imagery.',href:'/portal/satellite',label:'Satellite monitoring',icon:'satellite'},
  {title:'Download your field data',body:'Create a dated report or download observation history and your field activity record.',href:'/portal/analysis',label:'Analysis & reports',icon:'analysis'}
 ];
</script>

<div class="account-layout">
 <section class="p-card account-profile">
  <div class="account-person">
   <span class="account-avatar" aria-hidden="true">{data.name.trim().charAt(0).toUpperCase()||'T'}</span>
   <div><h2>{data.name}</h2><p>{data.accountEmail||'Email unavailable'}</p></div>
   <span class="p-pill">{access(data.accountStatus)}</span>
  </div>
  <div class="account-security"><h3>Sign-in and security</h3><p>Your sign-in email is managed by Talazo. Use the password settings to update your password.</p><a class="p-button subtle" href="/activate">Change password</a></div>
 </section>
 <section class="p-card account-allowance">
  <h2>Monitoring allowance</h2><p>{data.period.slice(0,7)}</p>
  {#if allocation}
   <p><strong>{ha(reserved)}</strong> reserved of {ha(allowance)}</p>
   {#if allowance>0}<meter aria-label="Reserved monitoring allowance" min="0" max={allowance} value={Math.min(reserved,allowance)}></meter>{/if}
   <p>{reserved>allowance?ha(reserved-allowance)+' above your current allowance':ha(allowance-reserved)+' available'}</p>
  {:else}<p>No monitoring allowance is assigned to your account this month.</p>{/if}
  <a class="p-button subtle" href="/portal/farms">Manage fields &nearr;</a>
 </section>
</div>
<SupportRequests {data} {form}/>
<section class="p-card account-help">
 <h2>Help with common tasks</h2>
 <div>{#each help as item}
  <article><span class="help-icon"><NavIcon name={item.icon}/></span><h3>{item.title}</h3><p>{item.body}</p><a href={item.href}>{item.label} &nearr;</a></article>
 {/each}</div>
</section>
<AlertCenter data={accountAlerts} {enhanced} {busy}/>

<style>
 .account-layout{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:18px}
 .account-person{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
 .account-person>div{min-width:0;overflow-wrap:anywhere}
 .account-person h2,.account-person p,.account-allowance h2{margin:0 0 5px}
 .account-person p{font-size:14px;color:#506852}
 .account-avatar{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:#dcebd2;color:#174a37;font:700 23px Manrope,sans-serif}
 .account-security{border-top:1px solid #d8e2d3;margin-top:18px;padding-top:16px}
 .account-security h3{margin:0 0 6px}
 .account-security p,.account-allowance p{margin:0 0 12px}
 .account-allowance strong{font:700 24px Manrope,sans-serif}
 .account-allowance meter{display:block;width:100%;height:18px;margin:10px 0;accent-color:#527d4a}
 .account-help>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
 .account-help article{background:#f2f6ed;border:1px solid #d8e2d3;border-radius:10px;padding:14px;min-width:0}
 .account-help h3{margin:8px 0 5px;font-size:17px}
 .account-help p{font-size:14px;color:#506852}
 .account-help a{font-size:14px;font-weight:700;text-decoration:underline;text-underline-offset:3px}
 .help-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:8px;background:#e0ecd7}
 @media(max-width:850px){.account-layout,.account-help>div{grid-template-columns:minmax(0,1fr);gap:0}.account-help>div{gap:10px}}
</style>
