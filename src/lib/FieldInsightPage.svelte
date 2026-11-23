<script lang="ts">
 import CropInsights from './CropInsights.svelte';
 import ImageExplorer from './ImageExplorer.svelte';
 import ProviderConnection from './ProviderConnection.svelte';
 import {datedAdvisory} from './advisory-model.mjs';
 import {defaultLayer} from './imagery.mjs';
 import {normalizeIndex,sensedMap} from './satellite.mjs';

 let {section,zone,farm,record,products,date,form,enhanced,busy}:{section:string;zone:any;farm:any;record:any;products:any;date:string;form?:any;enhanced:any;busy:boolean}=$props();
 const topics:Record<string,{lead:string;check:string;map:string}> = {
  pests:{lead:'Potential pests and diseases',check:'Scout the crop for visible symptoms and check which plants are affected. Use the advisory to guide inspection.',map:'Vegetation context'},
  weeds:{lead:'Potential weed pressure',check:'Walk the field edges and affected patches. Identify the plants and record the extent before deciding how to manage them.',map:'Vegetation context'},
  nutrients:{lead:'Nutrient guidance',check:'Review the suggested nutrients against crop stage, recent applications and soil or tissue tests.',map:'Red-edge vegetation context'},
  irrigation:{lead:'Irrigation outlook',check:'Check recent rain, the field forecast and soil moisture before using the suggested schedule.',map:'Canopy moisture context'},
  yield:{lead:'Yield and harvest outlook',check:'Review the estimate against crop stage, field observations and harvest records as the season progresses.',map:'Vegetation context'},
  soil:{lead:'Soil indicators',check:'Use these estimates to guide where you sample. Confirm soil properties with a field sample and laboratory results.',map:'Organic carbon context'}
 };
 let topic=$derived(topics[section]);
 let observations=$derived(sensedMap(products.getSensedDays?.value));
 let cloudy=$derived(observations[date]?.isCloudy===true);
 let recent=$state<any>(null);
 let advisoryState=$state<'loading'|'ready'|'unavailable'>('loading');
 let advisoryError=$state('');
 let showImagery=$state(false);
 let saved=$derived(form?.assetMonitoring===record.id&&form?.assetDate===date?form.advisoryProduct:null);
 let product=$derived(datedAdvisory(saved,date)?saved:datedAdvisory(recent,date)?recent:products.askJeevnAPI);
 let dateLabel=$derived(date?date.slice(6)+'/'+date.slice(4,6)+'/'+date.slice(0,4):'Awaiting observation');
 let ndmi=$derived(cloudy?null:normalizeIndex(products.getAllIndexValues?.value?.ndmi?.[date]));
 const link=(path:string)=>'/portal/'+path+'?'+new URLSearchParams({field:zone.id,...(date&&path!=='weather'?{date}:{})});

 $effect(()=>{
  const id=record.id,selected=date,layer=defaultLayer(section);
  recent=null;
  advisoryError='';
  if(!selected||cloudy||record.status!=='active'){
   advisoryState='unavailable';
   return;
  }
  const controller=new AbortController();
  const signal=controller.signal;
  advisoryState='loading';
  void (async()=>{
   try{
    for(let attempt=0;attempt<5;attempt++){
     const response=await fetch('/api/satellite/view',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({monitoring:id,date:selected,layer,image:false,advisory:true}),signal
     });
     if(!response.ok)throw Error('The dated advisory could not be loaded.');
     const result=(await response.json()).advisory;
     if(signal.aborted)return;
     if(result?.state==='pending'){
      await new Promise(resolve=>setTimeout(resolve,2000));
      if(signal.aborted)return;
      continue;
     }
     if(result?.state!=='ready'||!datedAdvisory(result.value,selected))throw Error(result?.error||'An advisory is unavailable for this observation.');
     recent=result.value;
     advisoryState='ready';
     return;
    }
    throw Error('The advisory is still processing. Try again shortly.');
   }catch(error){
    if(signal.aborted)return;
    advisoryState='unavailable';
    advisoryError=error instanceof Error?error.message:'The advisory could not be loaded.';
   }
  })();
  return()=>controller.abort();
 });
</script>

<section class="p-card topic-summary" aria-labelledby="topic-selected-field">
 <div><p class="p-kicker">{farm?.name}</p><h2 id="topic-selected-field">{zone.name}</h2><p>{zone.crop_entered_name||zone.crop_name} &middot; {dateLabel}</p></div>
 <span class="p-pill">{!date?'Awaiting observation':cloudy?'Cloud-affected':observations[date]?.isCloudy===false?'Clear optical observation':'Cloud quality unreported'}</span>
</section>

{#if cloudy}
 <section class="p-card"><h2>{topic.lead}</h2><p>Clouds affected this observation. Choose a clearer date to review satellite-based guidance.</p><a class="p-button subtle" href={link('satellite')}>Open satellite monitoring &nearr;</a></section>
{:else}
 <CropInsights {record} {date} {product} {enhanced} {busy} topicId={section} standalone
  heading={topic.lead} nextCheck={topic.check} loading={advisoryState==='loading'} loadError={advisoryError}/>
{/if}

{#if section==='irrigation'}
 <section class="p-card topic-support">
  <div><h2>Vegetation moisture</h2><p>NDMI for {dateLabel}: <strong>{ndmi?.toFixed(2)??'Unavailable'}</strong>. This index describes vegetation moisture from satellite imagery.</p></div>
  <a class="p-button subtle" href={link('weather')}>Check this field's forecast &nearr;</a>
 </section>
{/if}

<section class="p-card topic-support">
 <div><h2>{topic.map}</h2><p>View the dated layer alongside the saved field boundary.</p></div>
 <button type="button" class="p-button subtle" aria-expanded={showImagery} aria-controls="topic-imagery" onclick={()=>showImagery=!showImagery}>{showImagery?'Hide satellite imagery':'View satellite imagery'}</button>
</section>
<div id="topic-imagery">
 {#if showImagery}<ImageExplorer boundary={zone.boundary} {section} {record} {products} {date} contextOnly/>{/if}
</div>
<div class="topic-footer">
 <div><a class="p-button subtle" href={link('health')}>Crop health &nearr;</a><a class="p-button subtle" href={link('analysis')}>Analysis &amp; reports &nearr;</a></div>
 <ProviderConnection {record}/>
</div>

<style>
 .topic-summary,.topic-support{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px 20px}
 .p-card.topic-summary,.p-card.topic-support{padding-block:16px;margin-bottom:16px}
 .topic-summary h2,.topic-support h2{margin:0 0 5px}
 .topic-summary p,.topic-support p{margin:0}
 .topic-summary h2{overflow-wrap:anywhere}
 .topic-footer>div{display:flex;gap:10px;flex-wrap:wrap}
</style>
