<script>
 import {goto} from '$app/navigation';
 import {workspaces,labels,farms,fields,devices,programs,alerts,tasks,metrics,scopedFarms} from '#lib/client-catalog.js';
 import Chart from '#lib/ClientChart.svelte';
 import PilotMonitoring from '#lib/PilotMonitoring.svelte';
 let {data}=$props();
 let workspace=$derived(data.workspace),section=$derived(data.section),config=$derived(workspaces[workspace]);
 let search=$state('');
 /** @type {'moisture'|'temp'|'ec'} */ let metric=$state('moisture');
 let range=$state('24h'),farmId=$state('farm-1'),menu=$state(false);
 /** @typedef {Record<string,string|number>} Row */
 /** @type {Row|null} */ let selected=$state(null);
 let notice=$state('');
 /** @type {string[]} */ let acknowledged=$state([]);
 /** @type {string[]} */ let done=$state([]);
 let sharingRevoked=$state(false);

 let farm=$derived(farms.find(f=>f.id===farmId)||farms[0]);
 let ownFarms=$derived(scopedFarms(workspace));
 let fleet=$derived(devices.filter(d=>workspace!=='farmer'||d.farm==='farm-1'));
 let currentAlerts=$derived(alerts.map(a=>({...a,status:acknowledged.includes(a.id)?'Acknowledged':a.status})));
 let currentTasks=$derived(tasks.map(t=>({...t,status:done.includes(t.id)?'Complete':t.status})));
 /** @type {Row[]} */ let rows=$derived.by(()=>{
  switch(section){
   case 'fields':return fields;
   case 'growers':case 'beneficiaries':return ownFarms.map(f=>({id:f.id,name:f.grower,farm:f.name,district:f.district,crop:f.crop,status:f.status}));
   case 'portfolio':case 'farms':return ownFarms;
   case 'nodes':case 'fleet':return fleet;
   case 'alerts':case 'risks':return currentAlerts;
   case 'tasks':return currentTasks;
   case 'programs':return programs;
   case 'coverage':return [{id:'district-1',name:'Goromonzi',enrolled:1,target:4,status:'25% of target'},{id:'district-2',name:'Marondera',enrolled:1,target:3,status:'33% of target'}];
   case 'evaluation':return [{id:'kpi-1',name:'Beneficiary enrollment',baseline:0,current:2,target:7,source:'registry',status:'29% achieved'},{id:'kpi-2',name:'Monitored farm area (ha)',baseline:0,current:42,target:120,source:'field records',status:'35% achieved'},{id:'kpi-3',name:'Yield improvement',baseline:'Not collected',current:'Not collected',target:'Set after baseline',source:'Harvest records required',status:'Not measurable yet'}];
   default:return [];
  }
 });
 let columns=$derived(rows.length?Object.keys(rows[0]).filter(k=>!['id','detail','farm','moisture','temp','ec','nodes','budget'].includes(k)):[]);
 let filtered=$derived(rows.filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase())));
 /** @param {string} message */
 function record(message){notice=message;}
 function exportRows(){/** @type {Row[]} */ const content=rows.length?rows:ownFarms;const keys=Object.keys(content[0]);const csv=[keys.join(','),...content.map(r=>keys.map(k=>'"'+String((/** @type {Row} */ (r))[k]??'').replaceAll('"','""')+'"').join(','))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`talazo-${workspace}-${section}.csv`;a.click();URL.revokeObjectURL(url);record('CSV exported.');}

 /** @param {Row} row */
 function openDetails(row){selected=row;}
 /** @param {HTMLDialogElement} node */
 function showDialog(node){const previous=document.activeElement;node.showModal();return {destroy(){if(previous instanceof HTMLElement)previous.focus();}};}
</script>
<svelte:head><title>{labels[section]} · Talazo Agritech</title><meta name="description" content="Field monitoring and farm management with Talazo Agritech."/></svelte:head>
<a href="#content" class="skip">Skip to content</a>
<div class="app-shell">
 <aside class:mobile-open={menu}>
  <a class="logo" href="/farmer/overview"><img src="/images/talazo-logo-cropped.png" alt="Talazo Agritech"/></a>
  <div class="workspace-label">WORKSPACE</div>
  <label class="sr-only" for="workspace">Choose workspace</label><select id="workspace" value={workspace} onchange={e=>{search='';selected=null;notice='';menu=false;goto(`/${e.currentTarget.value}/overview`);}}>{#each Object.entries(workspaces).filter(([key]) => key !== "admin") as [key,w]}<option value={key}>{w.name}</option>{/each}</select>
  <nav aria-label="Workspace navigation">{#each config.sections as item,i}<a class:active={section===item} aria-current={section===item?'page':undefined} href={`/${workspace}/${item}`} onclick={()=>{menu=false;search='';selected=null;notice='';}}><span class="nav-mark" aria-hidden="true">{String(i+1).padStart(2,'0')}</span>{labels[item]}{#if item==='alerts'}<span class="count">2</span>{/if}</a>{/each}</nav>
  <div class="sidebar-bottom"><span class="seed-dot"></span><strong>Rooted in better decisions.</strong><p>Farm intelligence for a resilient future.</p></div>
 </aside>
 <div class="main-shell">
  <header><button class="menu-button" aria-label="Toggle navigation" aria-expanded={menu} onclick={()=>menu=!menu}>☰</button><span>{config.account}</span><div class="header-right"><span class="avatar" aria-label="Workspace profile">T</span></div></header>
  <main id="content" tabindex="-1">
   <div class="page-heading"><div><p class="eyebrow">TALAZO / {config.name.toUpperCase()}</p><h1>{section==='overview'?config.subtitle:labels[section]}</h1><p class="subtitle">{section==='overview'?'A clear view of what matters, from the soil up.':`Explore and manage ${labels[section].toLowerCase()}.`}</p></div><button class="secondary" disabled={workspace==='farmer' && ['overview','monitoring','imagery','nodes'].includes(section)} onclick={exportRows}>Export CSV ↗</button></div>
   {#if notice}<div class="notice" role="status">{notice}<button aria-label="Dismiss notification" onclick={()=>notice=''}>×</button></div>{/if}
   <div class="notice" role="note"><strong>Preview workspace.</strong> Account sign-in and persistent farm setup are not connected. Registry records and actions are demonstrations; monitoring panels show connection status.</div>
   {#if workspace==='farmer' && ['overview','monitoring','imagery','nodes'].includes(section)}
    <PilotMonitoring {section}/>
   {:else if section==='overview'}
    <div class="metrics">{#each metrics[workspace] as [label,value,note]}<article><p>{label}</p><strong>{value}</strong><small>{note}</small></article>{/each}</div>
    <div class="overview-grid"><section class="panel primary-panel"><div class="panel-heading"><div><p class="eyebrow">{workspace==='farmer'?'YOUR FARM':'PORTFOLIO SNAPSHOT'}</p><h2>{workspace==='farmer'?farm.name:'Connected fields. Shared progress.'}</h2></div><span class="tag">2026 / 27 season</span></div>
     <div class="landscape"><img src="/images/farm-landscape.jpg" alt="Cultivated fields at sunset"/><div><span>FIELD LANDSCAPE</span><h3>{workspace==='farmer'?'Know your ground.':'See the wider picture.'}</h3><p>{workspace==='farmer'?'Goromonzi · 24 hectares · Maize':workspace==='program'?'2 farms across 2 districts':'3 farms across 3 districts'}</p></div></div>
     <div class="farm-list">{#each ownFarms as f}<button class="farm-row" onclick={()=>selected=f}><span><strong>{f.name}</strong><small>{f.district} · {f.area} ha · {f.crop}</small></span><span class:warning={f.status==='Needs review'} class="tag">{f.status}</span><span aria-hidden="true">↗</span></button>{/each}</div>
    </section><section class="panel attention"><p class="eyebrow">REQUIRES A CLOSER LOOK</p><h2>Your next actions</h2>{#each currentAlerts as alert}<article><span class="tiny-label">{alert.severity}</span><h3>{alert.name}</h3><p>{alert.detail}</p><button class="text-button" onclick={()=>{acknowledged=[...acknowledged,alert.id];record('alert acknowledged.');}} disabled={alert.status==='Acknowledged'}>{alert.status==='Acknowledged'?'Acknowledged ✓':'Acknowledge →'}</button></article>{/each}<a class="text-link" href={`/${workspace}/${workspace==='organization'?'tasks':workspace==='program'?'evaluation':'alerts'}`}>View workspace activity ↗</a></section></div>
    <section class="panel trend-panel"><div class="panel-heading"><div><p class="eyebrow">BENEATH THE SURFACE</p><h2>Soil moisture history</h2></div><a class="text-link" href={`/${workspace}/${workspace==='farmer'?'monitoring':'reports'}`}>Explore {workspace==='farmer'?'monitoring':'reports'} ↗</a></div><Chart/></section>
   {:else if section==='monitoring'}
    <div class="toolbar"><label>Monitoring location<select bind:value={farmId}>{#each ownFarms as f}<option value={f.id}>{f.name} · Upper slope</option>{/each}</select></label><label>Measurement<select bind:value={metric}><option value="moisture">Moisture (%)</option><option value="temp">Temperature (°C)</option><option value="ec">EC (mS/cm)</option></select></label><label>History window<select bind:value={range}><option value="24h">24 hours</option><option value="7d">6 daily aggregates</option></select></label></div>
    <div class="metrics"><article><p>Soil moisture</p><strong>{farm.moisture}%</strong><small>Relative reading</small></article><article><p>Temperature</p><strong>{farm.temp}°C</strong><small>soil temperature</small></article><article><p>EC</p><strong>{farm.ec}</strong><small>mS/cm</small></article><article><p>Last reading</p><strong class="compact">08:30 CAT</strong><small>01 Nov 2026</small></article></div>
    <section class="panel"><div class="panel-heading"><h2>{metric==='moisture'?'Soil moisture':metric==='temp'?'Soil temperature':'Electrical conductivity'}</h2><span class="tag">Reading history</span></div><Chart {metric} {range}/><p class="muted">Moisture is shown as a relative percentage. Interpret readings in the context of local soil conditions and probe calibration.</p></section>
   {:else if section==='imagery'}
    <section class="panel"><p class="eyebrow">FIELD OBSERVATIONS</p><h2>A closer look at the crop</h2><div class="imagery"><img src="/images/crop-fields.jpg" alt="Crop fields"/><div><span class="tag">Landscape</span><h3>Field landscape</h3><p>Browse imagery alongside your field observations.</p><dl><dt>Capture time</dt><dd>Not available</dd><dt>Camera node</dt><dd>Not connected</dd><dt>Growth analysis</dt><dd>Not performed</dd></dl><button class="secondary" onclick={()=>selected={name:'Crop image preview',source:'Field landscape',capture:'Unavailable',analysis:'Unavailable'}} >View image details ↗</button></div></div></section>
   {:else if section==='sharing'}
    <section class="panel form-panel"><p class="eyebrow">YOUR FARM, YOUR PERMISSION</p><h2>Manage sharing consent</h2><p>Farm ownership stays with the grower. Each external organization needs a specific purpose, scope and expiry.</p><dl><dt>Farm</dt><dd>Mupfuti Farm</dd><dt>Recipient</dt><dd>Greenbelt Growers</dd><dt>Purpose</dt><dd>Season agronomy support</dd><dt>Scopes</dt><dd>Farm details and readings only � no crop imagery</dd><dt>Expiry</dt><dd>31 March 2027</dd><dt>Status</dt><dd>{sharingRevoked?'Revoked in this session':'Active consent'}</dd></dl><button class="primary" disabled={sharingRevoked} onclick={()=>{sharingRevoked=true;record('Consent revoked for this session.');}}>{sharingRevoked?'consent revoked':'Revoke consent'}</button><p class="info">Changes apply to this session.</p></section>
   {:else if section==='reports'}
    <div class="report-grid">{#each ['Season monitoring summary','Device availability','Farm portfolio register'] as report}<section class="panel"><p class="eyebrow">WORKSPACE REPORT</p><h2>{report}</h2><p>Export the current workspace’s farm registry as a CSV. Sensor and yield reports require connected, validated observations.</p><button class="primary" onclick={exportRows}>Download register ↓</button></section>{/each}</div>
   {:else}
    {#if section==='coverage'}<div class="coverage-strip">{#each ['Goromonzi','Marondera','Murehwa'] as district,i}<article><span class="district-symbol" aria-hidden="true">⌖</span><h2>{district}</h2><p>{i===2?'No enrollment recorded':'Program coverage'}</p><div class="progress"><span style={`width:${i===0?25:i===1?33:0}%`}></span></div></article>{/each}</div>{/if}
    {#if section==='evaluation'}<p class="info">indicators describe enrollment and monitored area only. Yield and income indicators require separate observations.</p>{/if}
    <section class="panel table-panel"><div class="panel-heading"><div><p class="eyebrow">WORKSPACE REGISTER</p><h2>{labels[section]}</h2></div><label class="search"><span class="sr-only">Search {labels[section]}</span><input type="search" placeholder="Search records…" bind:value={search}/></label></div><div class="table-scroll"><table><thead><tr>{#each columns as col}<th>{col.replaceAll('_',' ')}</th>{/each}<th>Action</th></tr></thead><tbody>{#each filtered as row}<tr>{#each columns as col}<td>{#if col==='status'}<span class="tag" class:warning={['Offline','Needs review','Open'].includes(String(row[col]))}>{row[col]}</span>{:else}{row[col]}{/if}</td>{/each}<td><button class="text-button" onclick={()=>openDetails(row)}>Details ↗</button>{#if section==='tasks'}<button class="text-button" disabled={row.status==='Complete'} onclick={()=>{done=[...done,String(row.id)];record('task completed.');}}>Complete</button>{:else if section==='alerts'||section==='risks'}<button class="text-button" disabled={row.status==='Acknowledged'} onclick={()=>{acknowledged=[...acknowledged,String(row.id)];record('alert acknowledged.');}}>Acknowledge</button>{/if}</td></tr>{:else}<tr><td colspan={columns.length+1}><div class="empty"><h3>No matching records</h3><p>Try another search or clear the filter.</p><button class="secondary" onclick={()=>search=''}>Clear search</button></div></td></tr>{/each}</tbody></table></div><p class="table-note">{filtered.length} of {rows.length} records · Select Details to inspect a record.</p></section>
   {/if}
   <footer><span>Talazo Agritech · Better decisions. Stronger roots.</span></footer>
  </main>
 </div>
</div>
{#if selected}<dialog class="detail-dialog" use:showDialog onclose={()=>selected=null} oncancel={()=>selected=null} aria-labelledby="detail-title"><button class="close secondary" onclick={()=>selected=null} aria-label="Close details">Close �</button><p class="eyebrow">RECORD DETAILS</p><h2 id="detail-title">{selected.name||selected.id}</h2><dl>{#each Object.entries(selected) as [key,value]}<div><dt>{key}</dt><dd>{String(value)}</dd></div>{/each}</dl>
</dialog>{/if}
