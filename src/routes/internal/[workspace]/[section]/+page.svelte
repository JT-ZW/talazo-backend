<script>
 import {goto, invalidateAll} from '$app/navigation';
 import {workspaces,labels,farms,fields,devices,programs,alerts,tasks,metrics,scopedFarms} from '$lib/catalog';
 import Chart from '$lib/Chart.svelte';
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
 /** @type {typeof devices} */ let newDevices=$state([]);
 /** @type {Record<string,Row>} */ let overrides=$state({});
 let editName=$state(''),editStatus=$state(''),editRole=$state('');
 let sharingRevoked=$state(false);

 let deviceId=$state(''),zone=$state('Upper slope'),network=$state('Mobile'),retention=$state('365'),digest=$state(true);
 /** @type {Row[]} */ let audit=$state([]);
 let farm=$derived(farms.find(f=>f.id===farmId)||farms[0]);
 let ownFarms=$derived(scopedFarms(workspace));
 let fleet=$derived([...devices,...newDevices].filter(d=>workspace!=='farmer'||d.farm==='farm-1'));
 let currentAlerts=$derived(alerts.map(a=>({...a,status:acknowledged.includes(a.id)?'Acknowledged':a.status})));
 let currentTasks=$derived(tasks.map(t=>({...t,status:done.includes(t.id)?'Complete':t.status})));
 const customerRows=[{id:'customer-1',name:'Demo independent grower',type:'Individual',plan:'Grower',status:'Active'},{id:'customer-2',name:'Demo Greenbelt Growers',type:'Organization',plan:'Portfolio',status:'Trial'},{id:'customer-3',name:'Demo Resilient Harvest',type:'Government',plan:'Program',status:'Trial'}];
 const people=[{id:'user-1',name:'Demo farmer A',role:'Owner',scope:'Individual tenant',sharing:'No external sharing'},{id:'user-2',name:'Demo agronomist A',role:'Agronomist',scope:'Greenbelt tenant',sharing:'Consented farm access only'},{id:'user-3',name:'Demo program officer',role:'Viewer',scope:'Program tenant',sharing:'Aggregate reports only'}];
 /** @type {Row[]} */ let baseRows=$derived.by(()=>{
  switch(section){
   case 'fields':return fields;
   case 'growers':case 'beneficiaries':return ownFarms.map(f=>({id:f.id,name:f.grower,farm:f.name,district:f.district,crop:f.crop,status:f.status}));
   case 'portfolio':case 'farms':return ownFarms;
   case 'nodes':case 'fleet':return fleet;
   case 'alerts':case 'risks':return currentAlerts;
   case 'tasks':return currentTasks;
   case 'programs':return programs;
   case 'coverage':return [{id:'district-1',name:'Goromonzi',enrolled:1,target:4,status:'25% of sample target'},{id:'district-2',name:'Marondera',enrolled:1,target:3,status:'33% of sample target'}];
   case 'evaluation':return [{id:'kpi-1',name:'Beneficiary enrollment',baseline:0,current:2,target:7,source:'Sample registry',status:'29% achieved'},{id:'kpi-2',name:'Monitored farm area (ha)',baseline:0,current:42,target:120,source:'Sample field records',status:'35% achieved'},{id:'kpi-3',name:'Yield improvement',baseline:'Not collected',current:'Not collected',target:'Set after baseline',source:'Harvest records required',status:'Not measurable yet'}];
   case 'customers':return customerRows;
   case 'organizations':return [{id:'org-1',name:'Demo Greenbelt Growers',type:'Contract organization',farms:3,status:'Trial'},{id:'org-2',name:'Demo Resilient Harvest',type:'Government program',farms:3,status:'Trial'}];
   case 'users':return people;
   case 'plans':return [{id:'plan-1',name:'Grower',scope:'Individual farm',subscription:'Demo independent grower',status:'Sample · no billing'},{id:'plan-2',name:'Portfolio',scope:'Contract organization',subscription:'Demo Greenbelt Growers',status:'Sample · no billing'},{id:'plan-3',name:'Program',scope:'Government',subscription:'Demo Resilient Harvest',status:'Sample · no billing'}];
   case 'audit':return [...audit,{id:'audit-seed',name:'Sample environment initialized',actor:'Demo system',at:'01 Nov 2026, 08:00 CAT',status:'Sample event'}];
   default:return [];
  }
 });
 let rows=$derived(baseRows.map(r=>({...r,...overrides[`${workspace}/${section}/${r.id}`]})));
 let columns=$derived(rows.length?Object.keys(rows[0]).filter(k=>!['id','detail','farm','moisture','temp','ec','nodes','budget'].includes(k)):[]);
 let filtered=$derived(rows.filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase())));
 /** @param {string} message */
 function record(message){notice=message;audit=[{id:`audit-${audit.length}`,name:message,actor:'Demo operator',at:new Date().toISOString(),status:'Session only'},...audit];}
 function exportRows(){/** @type {Row[]} */ const content=rows.length?rows:ownFarms;const keys=Object.keys(content[0]);const csv=['SAMPLE DATA — not live',keys.join(','),...content.map(r=>keys.map(k=>'"'+String((/** @type {Row} */ (r))[k]??'').replaceAll('"','""')+'"').join(','))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`talazo-sample-${workspace}-${section}.csv`;a.click();URL.revokeObjectURL(url);record('Sample CSV exported.');}
 /** @param {SubmitEvent} event */
 function provision(event){event.preventDefault();if([...devices,...newDevices].some(d=>d.id===deviceId.trim())){notice='That sample device ID already exists.';return;}newDevices=[...newDevices,{id:deviceId.trim(),name:'New sample node',farm:'farm-1',zone,status:'Pending',battery:'Unknown',network,last:'Never received'}];record(`Sample node ${deviceId.trim()} provisioned for ${zone}. No hardware was registered.`);deviceId='';}

 /** @param {Row} row */
 function openDetails(row){selected=row;editName=String(row.name||'');editStatus=String(row.status||'');editRole=String(row.role||'');}
 /** @param {HTMLDialogElement} node */
 function showDialog(node){const previous=document.activeElement;node.showModal();return {destroy(){if(previous instanceof HTMLElement)previous.focus();}};}
 function saveRecord(){if(!selected)return;const updated={...selected};if('name' in updated)updated.name=editName.trim();if('status' in updated)updated.status=editStatus.trim();if('role' in updated)updated.role=editRole;overrides={...overrides,[`${workspace}/${section}/${selected.id}`]:updated};selected=null;record('Sample record updated for this session. No live account was changed.');}
</script>
<svelte:head><title>{labels[section]} · Talazo Agritech</title><meta name="description" content="Talazo Agritech application shell. Sample workspaces and local device testing."/></svelte:head>
<a href="#content" class="skip">Skip to content</a>
<div class="app-shell">
 <aside class:mobile-open={menu}>
  <a class="logo" href="/internal/farmer/overview"><img src="/images/talazo-logo-cropped.png" alt="Talazo Agritech"/></a>
  <div class="workspace-label">WORKSPACE</div>
  <label class="sr-only" for="workspace">Choose sample workspace</label><select id="workspace" value={workspace} onchange={e=>{search='';selected=null;notice='';menu=false;goto(`/internal/${e.currentTarget.value}/overview`);}}>{#each Object.entries(workspaces) as [key,w]}<option value={key}>{w.name}</option>{/each}</select>
  <nav aria-label="Workspace navigation">{#each config.sections as item,i}<a class:active={section===item} aria-current={section===item?'page':undefined} href={`/internal/${workspace}/${item}`} onclick={()=>{menu=false;search='';selected=null;notice='';}}><span class="nav-mark" aria-hidden="true">{String(i+1).padStart(2,'0')}</span>{labels[item]}{#if item==='alerts'}<span class="count">2</span>{/if}</a>{/each}</nav>
  <div class="sidebar-bottom"><span class="seed-dot"></span><strong>Rooted in better decisions.</strong><p>Farm intelligence for a resilient future.</p><small>Demo workspace switcher<br/>does not grant real access.</small></div>
 </aside>
 <div class="main-shell">
  <header><button class="menu-button" aria-label="Toggle navigation" aria-expanded={menu} onclick={()=>menu=!menu}>☰</button><span>{config.account}</span><div class="header-right"><span class="connection"><i></i> Sample environment</span><span class="avatar" aria-label="Demo user">D</span></div></header>
  <div class="demo-banner"><strong>SAMPLE DATA</strong><span>Illustrative workspace records · sample edits last for this session</span></div>
  <main id="content" tabindex="-1">
   <div class="page-heading"><div><p class="eyebrow">TALAZO / {config.name.toUpperCase()}</p><h1>{section==='overview'?config.subtitle:labels[section]}</h1><p class="subtitle">{section==='overview'?'A clear view of what matters, from the soil up.':`Explore and manage sample ${labels[section].toLowerCase()}.`}</p></div><button class="secondary" onclick={exportRows}>Export sample CSV ↗</button></div>
   {#if notice}<div class="notice" role="status">{notice}<button aria-label="Dismiss notification" onclick={()=>notice=''}>×</button></div>{/if}
   {#if section==='overview'}
    <div class="metrics">{#each metrics[workspace] as [label,value,note]}<article><p>{label}</p><strong>{value}</strong><small>{note}</small></article>{/each}</div>
    <div class="overview-grid"><section class="panel primary-panel"><div class="panel-heading"><div><p class="eyebrow">{workspace==='farmer'?'YOUR FARM':'PORTFOLIO SNAPSHOT'}</p><h2>{workspace==='farmer'?farm.name:'Connected fields. Shared progress.'}</h2></div><span class="tag">2026 / 27 season · sample</span></div>
     <div class="landscape"><img src="/images/farm-landscape.jpg" alt="Talazo public-site farm landscape; illustrative, not a monitored farm"/><div><span>ILLUSTRATIVE LANDSCAPE</span><h3>{workspace==='farmer'?'Know your ground.':'See the wider picture.'}</h3><p>{workspace==='farmer'?'Goromonzi · 24 hectares · Maize':workspace==='program'?'2 sample farms across 2 districts':'3 sample farms across 3 districts'}</p></div></div>
     <div class="farm-list">{#each ownFarms as f}<button class="farm-row" onclick={()=>selected=f}><span><strong>{f.name}</strong><small>{f.district} · {f.area} ha · {f.crop}</small></span><span class:warning={f.status==='Needs review'} class="tag">{f.status}</span><span aria-hidden="true">↗</span></button>{/each}</div>
    </section><section class="panel attention"><p class="eyebrow">REQUIRES A CLOSER LOOK</p><h2>Your next actions</h2>{#each currentAlerts as alert}<article><span class="tiny-label">{alert.severity} · sample</span><h3>{alert.name}</h3><p>{alert.detail}</p><button class="text-button" onclick={()=>{acknowledged=[...acknowledged,alert.id];record('Sample alert acknowledged.');}} disabled={alert.status==='Acknowledged'}>{alert.status==='Acknowledged'?'Acknowledged ✓':'Acknowledge →'}</button></article>{/each}<a class="text-link" href={`/internal/${workspace}/${workspace==='organization'?'tasks':workspace==='program'?'evaluation':'alerts'}`}>View workspace activity ↗</a></section></div>
    <section class="panel trend-panel"><div class="panel-heading"><div><p class="eyebrow">BENEATH THE SURFACE</p><h2>Soil moisture history</h2></div><a class="text-link" href={`/internal/${workspace}/${workspace==='farmer'?'monitoring':workspace==='admin'?'nodes':'reports'}`}>Explore {workspace==='farmer'?'monitoring':workspace==='admin'?'nodes':'reports'} ↗</a></div><Chart/></section>
   {:else if section==='monitoring'}
    {#if data.bench}
      <section class="panel">
        <div class="panel-heading">
          <h2>MongoDB bench readings</h2>
          <button class="secondary" onclick={() => invalidateAll()}>Refresh readings</button>
        </div>
        {#if !data.bench.connected}
          <p>Local MongoDB is unavailable. Start the MongoDB server, then refresh.</p>
        {:else if data.bench.rows.length === 0}
          <p>MongoDB is connected. Waiting for the configured device’s first reading.</p>
        {:else}
          <p>Latest 20 records from the configured bench device. This stream can include synthetic test readings.</p>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Received (UTC)</th><th>Device</th><th>Relative moisture</th><th>Temperature</th><th>EC</th></tr></thead>
              <tbody>
                {#each data.bench.rows as reading (reading.id)}
                  <tr><td>{reading.receivedAt}</td><td>{reading.deviceId}</td><td>{reading.moisture}%</td><td>{reading.temperature === null ? 'Unavailable' : reading.temperature + ' °C'}</td><td>{reading.ec === null ? 'Unavailable' : reading.ec + ' mS/cm'}</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    {/if}
    <div class="toolbar"><label>Monitoring location<select bind:value={farmId}>{#each ownFarms as f}<option value={f.id}>{f.name} · Upper slope</option>{/each}</select></label><label>Measurement<select bind:value={metric}><option value="moisture">Moisture (%)</option><option value="temp">Temperature (°C)</option><option value="ec">EC (mS/cm)</option></select></label><label>History window<select bind:value={range}><option value="24h">24 hours</option><option value="7d">6 daily aggregates</option></select></label></div>
    <div class="metrics"><article><p>Soil moisture</p><strong>{farm.moisture}%</strong><small>Relative sample reading</small></article><article><p>Temperature</p><strong>{farm.temp}°C</strong><small>Sample soil temperature</small></article><article><p>EC</p><strong>{farm.ec}</strong><small>mS/cm · sample</small></article><article><p>Last sample</p><strong class="compact">08:30 CAT</strong><small>01 Nov 2026 · fixed fixture</small></article></div>
    <section class="panel"><div class="panel-heading"><h2>{metric==='moisture'?'Soil moisture':metric==='temp'?'Soil temperature':'Electrical conductivity'}</h2><span class="tag">Sample history</span></div><Chart {metric} {range}/><p class="muted">Moisture is illustrative relative moisture, not calibrated volumetric water content. Thresholds need soil, crop and probe calibration. Charts are demonstrations, not irrigation advice.</p></section>
   {:else if section==='imagery'}
    <section class="panel"><p class="eyebrow">FIELD OBSERVATIONS</p><h2>A closer look at the crop</h2><div class="imagery"><img src="/images/crop-fields.jpg" alt="Illustrative crop fields from the Talazo public website"/><div><span class="tag">Illustrative image</span><h3>North field · Maize</h3><p>This brand photograph demonstrates the imagery viewer. It is not a camera capture from this farm.</p><dl><dt>Capture time</dt><dd>Not available</dd><dt>Camera node</dt><dd>Not connected</dd><dt>Growth analysis</dt><dd>Not performed</dd></dl><button class="secondary" onclick={()=>selected={name:'Crop image preview',source:'Public-site brand photograph',capture:'Not a monitored capture',analysis:'No AI growth or yield inference'}} >View image details ↗</button></div></div></section>
   {:else if section==='sharing'}
    <section class="panel form-panel"><p class="eyebrow">YOUR FARM, YOUR PERMISSION</p><h2>Manage sample sharing consent</h2><p>Farm ownership stays with the grower. Each external organization needs a specific purpose, scope and expiry.</p><dl><dt>Farm</dt><dd>Demo � Mupfuti Farm</dd><dt>Recipient</dt><dd>Demo � Greenbelt Growers</dd><dt>Purpose</dt><dd>Season agronomy support</dd><dt>Scopes</dt><dd>Farm details and readings only � no crop imagery</dd><dt>Expiry</dt><dd>31 March 2027</dd><dt>Status</dt><dd>{sharingRevoked?'Revoked in this sample session':'Active sample consent'}</dd></dl><button class="primary" disabled={sharingRevoked} onclick={()=>{sharingRevoked=true;record('Sample consent revoked. This demonstration does not control a connected database.');}}>{sharingRevoked?'Sample consent revoked':'Revoke sample consent'}</button><p class="info">This sample card demonstrates the consent workflow. The demo workspace fixtures remain illustrative. Production revocation must be enforced by database policies and private image access.</p></section>
   {:else if section==='reports'}
    <div class="report-grid">{#each ['Season monitoring summary','Device availability','Farm portfolio register'] as report}<section class="panel"><p class="eyebrow">SAMPLE REPORT</p><h2>{report}</h2><p>Export the current workspace’s sample farm registry as a CSV. Sensor and yield reports require connected, validated observations.</p><button class="primary" onclick={exportRows}>Download sample register ↓</button></section>{/each}</div>
   {:else if section==='provisioning'}
    <section class="panel form-panel"><p class="eyebrow">DEVICE ONBOARDING</p><h2>Prepare a monitoring node</h2><p>Create a session-only sample provisioning record. This does not issue credentials or configure hardware.</p><form onsubmit={provision}><label>Sample device identifier<input required pattern="TZ-DEMO-[A-Z0-9-]+" maxlength="64" placeholder="TZ-DEMO-005" bind:value={deviceId}/><small>Use the TZ-DEMO- prefix.</small></label><label>Farm<input value="Demo · Mupfuti Farm" readonly/></label><label>Zone<select bind:value={zone}><option>Upper slope</option><option>Lower slope</option><option>East block</option></select></label><label>Connectivity<select bind:value={network}><option>Mobile</option><option>Farmhouse Wi-Fi</option></select></label><button class="primary">Create sample node</button></form></section><section class="panel"><h2>Provisioning queue</h2>{#if newDevices.length}{#each newDevices as d}<p>{d.id} · {d.zone} · {d.status}</p>{/each}{:else}<p>No sample nodes provisioned this session.</p>{/if}</section>
   {:else if section==='settings'}
    <section class="panel form-panel"><h2>Operational preferences</h2><p>Preview settings locally. No retention policy or notification service is running.</p><form onsubmit={e=>{e.preventDefault();record('Sample operational preferences saved for this session.');}}><label>Sample reading retention<select bind:value={retention}><option value="90">90 days</option><option value="365">365 days</option><option value="730">730 days</option></select></label><label class="checkbox"><input type="checkbox" bind:checked={digest}/>Enable sample daily operations digest</label><label>Reporting timezone<input readonly value="Africa/Harare · UTC+2"/></label><button class="primary">Save sample preferences</button></form></section>
   {:else}
    {#if section==='coverage'}<div class="coverage-strip">{#each ['Goromonzi','Marondera','Murehwa'] as district,i}<article><span class="district-symbol" aria-hidden="true">⌖</span><h2>{district}</h2><p>{i===2?'No program enrollment in this sample':'Sample program coverage'}</p><div class="progress"><span style={`width:${i===0?25:i===1?33:0}%`}></span></div></article>{/each}</div>{/if}
    {#if section==='users'}<p class="info">The workspace selector is a demo control. Production roles must be enforced by verified memberships and database policies. Farmer consent is required for external farm access.</p>{/if}
    {#if section==='evaluation'}<p class="info">Sample indicators describe enrollment and monitored area only. No yield, income or impact claim is inferred from soil readings.</p>{/if}
    <section class="panel table-panel"><div class="panel-heading"><div><p class="eyebrow">SAMPLE REGISTER</p><h2>{labels[section]}</h2></div><label class="search"><span class="sr-only">Search {labels[section]}</span><input type="search" placeholder="Search records…" bind:value={search}/></label></div><div class="table-scroll"><table><thead><tr>{#each columns as col}<th>{col.replaceAll('_',' ')}</th>{/each}<th>Action</th></tr></thead><tbody>{#each filtered as row}<tr>{#each columns as col}<td>{#if col==='status'}<span class="tag" class:warning={['Offline','Needs review','Open'].includes(String(row[col]))}>{row[col]}</span>{:else}{row[col]}{/if}</td>{/each}<td><button class="text-button" onclick={()=>openDetails(row)}>Details ↗</button>{#if section==='tasks'}<button class="text-button" disabled={row.status==='Complete'} onclick={()=>{done=[...done,String(row.id)];record('Sample task completed.');}}>Complete</button>{:else if section==='alerts'||section==='risks'}<button class="text-button" disabled={row.status==='Acknowledged'} onclick={()=>{acknowledged=[...acknowledged,String(row.id)];record('Sample alert acknowledged.');}}>Acknowledge</button>{/if}</td></tr>{:else}<tr><td colspan={columns.length+1}><div class="empty"><h3>No matching records</h3><p>Try another search or clear the filter.</p><button class="secondary" onclick={()=>search=''}>Clear search</button></div></td></tr>{/each}</tbody></table></div><p class="table-note">{filtered.length} of {rows.length} sample records · Select Details to inspect a record.</p></section>
   {/if}
   <footer><span>Talazo Agritech · Better decisions. Stronger roots.</span><span>Sample mode / v0.1</span></footer>
  </main>
 </div>
</div>
{#if selected}<dialog class="detail-dialog" use:showDialog onclose={()=>selected=null} oncancel={()=>selected=null} aria-labelledby="detail-title"><button class="close secondary" onclick={()=>selected=null} aria-label="Close details">Close �</button><p class="eyebrow">SAMPLE RECORD</p><h2 id="detail-title">{selected.name||selected.id}</h2><dl>{#each Object.entries(selected) as [key,value]}<div><dt>{key}</dt><dd>{String(value)}</dd></div>{/each}</dl>
{#if workspace==='admin'&&['customers','organizations','programs','users','farms','plans'].includes(section)}<form class="record-edit" onsubmit={e=>{e.preventDefault();saveRecord();}}><h3>Edit sample record</h3>{#if 'name' in selected}<label>Name<input required maxlength="100" bind:value={editName}/></label>{/if}{#if 'status' in selected}<label>Sample status<input required maxlength="60" bind:value={editStatus}/></label>{/if}{#if 'role' in selected}<label>Role<select bind:value={editRole}><option>Owner</option><option>Manager</option><option>Agronomist</option><option>Viewer</option></select></label>{/if}<button class="primary">Save sample changes</button></form>{/if}<p class="info">Session demonstration only. Production records will be restricted to your authorized tenant and consented farm scope.</p></dialog>{/if}
