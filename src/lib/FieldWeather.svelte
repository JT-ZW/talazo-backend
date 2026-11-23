<script lang="ts">
 import {enhance} from '$app/forms';
 import BoundaryMap from './BoundaryMap.svelte';
 import {freshness} from './freshness.mjs';
 import {todayISO} from './calendar.mjs';
 import {onMount,tick} from 'svelte';
 let interactive=$state(false);onMount(()=>{interactive=true;});
 import {weatherDays,celsius,weatherKind,weatherPoint,finiteReading} from './weather.mjs';
 import WeatherIcon from './WeatherIcon.svelte';
 import WeatherPeriods from './WeatherPeriods.svelte';
 let view=$state('weekly'),selected=$state(''),locationOpen=$state(false);
 let locationDialog=$state<HTMLDialogElement>();
 let dailyStart=$state<HTMLElement>();
 let {zone,farm,fields,onFieldChange,cached,products,enhanced,busy}:{zone:any,farm:string,fields:{id:string;label:string}[],onFieldChange:(id:string)=>void,cached:any,products:any,enhanced:any,busy:boolean}=$props();
 let payload=$derived(cached?.data||products.getForecastWeather?.value);
 let days=$derived(weatherDays(payload));
 let current=$derived(payload?.normal?.current||payload?.current||products.getPresentWeather?.value?.normal?.current||products.getPresentWeather?.value?.current);
 let currentTemperature=$derived(current?celsius(current.temp):days[0]?.max??null);
 let retrieved=$derived(cached?.fetched_at||products.getForecastWeather?.fetchedAt);
 let limits=$derived(days.flatMap((d:any)=>[d.min,d.max]).filter((v:number|null):v is number=>v!==null));
 let low=$derived(limits.length?Math.min(...limits)-3:0),high=$derived(limits.length?Math.max(...limits)+3:1);
 const y=(v:number)=>140-(v-low)/(high-low)*105;
 const x=(i:number)=>35+i*80;
 const date=(dt:number,short=false)=>new Date(dt*1000).toLocaleDateString('en-GB',{weekday:'short',...(short?{}:{day:'numeric',month:'short'}),timeZone:'Africa/Harare'});
 const reading=(n:number|null)=>n===null?'Unavailable':`${Math.round(n)}\u00b0`;
 const amount=(n:number|null,unit:string)=>n===null?'Unavailable':`${n.toLocaleString('en',{maximumFractionDigits:2})}${unit}`;
 let rainTotal=$derived(days.reduce((sum:number,d:any)=>sum+(d.rain??0),0));
 const dayKey=(dt:number)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Harare'}).format(new Date(dt*1000));
 let forecastPoint=$derived.by(()=>{
  try{const point=weatherPoint(zone.boundary);return {lat:Number(point.Latitude),lng:Number(point.Longitude)};}catch{return undefined;}
 });
 let upcoming=$derived(days.filter(d=>dayKey(d.timestamp)>=todayISO()));
 let wettest=$derived(upcoming.reduce<(typeof days)[number]|undefined>((best,d)=>d.probability!==null&&d.probability>(best?.probability??0)?d:best,undefined));
 let forecastStatus=$derived(freshness(retrieved,null).state);
 let takeaway=$derived(!upcoming.length?'No upcoming forecast is available. Refresh to check for new readings.':
  forecastStatus!=='current'?'This forecast may be out of date. Refresh before planning field work.':
  wettest?'Highest rain chance: '+wettest.probability+'% on '+date(wettest.timestamp)+'.':
  upcoming.some(d=>d.probability===0)?'No rain is indicated on days with a reported rain chance.':'Rain chance is unavailable for the days ahead.');
 async function showLocation(){locationOpen=true;await tick();locationDialog?.showModal();}
 async function showDay(timestamp:number){selected=dayKey(timestamp);view='daily';await tick();dailyStart?.focus();}
 let rainComplete=$derived(days.every((d:any)=>d.rain!==null));
</script>
<section class="p-card weather-intro">
 <div>
  <p class="p-kicker">{farm}</p><h2>{zone.name}</h2>
  <p>{retrieved?'Forecast retrieved '+new Date(retrieved).toLocaleString('en-GB',{timeZone:'Africa/Harare'})+' CAT':'Forecast retrieval time unavailable'}</p>
 </div>
 <div class="weather-actions">
  {#if fields.length>1}<label class="p-field" for="weather-field-select">Field<select id="weather-field-select" value={zone.id} onchange={e=>onFieldChange(e.currentTarget.value)}>{#each fields as field}<option value={field.id}>{field.label}</option>{/each}</select></label>{/if}
  {#if forecastPoint}<button type="button" class="p-button subtle" onclick={showLocation}>View forecast location</button>{/if}
  <form method="POST" action="?/weather" use:enhance={enhanced}><input type="hidden" name="zone" value={zone.id}/><button class="p-button" disabled={busy}>{busy?'Refreshing forecast...':days.length?'Refresh forecast':'Load field forecast'}</button></form>
 </div>
</section>
<dialog class="farm-dialog" bind:this={locationDialog} aria-labelledby="forecast-location" onclose={()=>locationOpen=false}>
 {#if locationOpen&&forecastPoint}
  <div class="farm-dialog-heading"><h2 id="forecast-location">Forecast location</h2><button type="button" class="p-button subtle" onclick={()=>locationDialog?.close()}>Close</button></div>
  <p>{zone.name} / {farm} &middot; {forecastPoint.lat.toFixed(5)}, {forecastPoint.lng.toFixed(5)}</p>
  <p>The white marker shows the point used for this field forecast.</p>
  <BoundaryMap value={JSON.stringify(zone.boundary)} editable={false} referencePoint={forecastPoint}/>
 {/if}
</dialog>
{#if days.length}
 <div class="weather-views" role="group" aria-label="Forecast view">{#each [["daily","Daily"],["weekly","Weekly"],["monthly","Monthly"]] as [id,label]}<button type="button" disabled={!interactive} class:chosen={view===id} aria-pressed={view===id} onclick={()=>view=id}>{label}</button>{/each}</div>
 {#if view!=='weekly'}<div bind:this={dailyStart} tabindex="-1"><WeatherPeriods {days} {payload} {view} bind:selected/></div>{/if}
 {#if view==='weekly'}
 <section class="weather-board" aria-label="Weather overview"><div class="weather-now"><p class="p-kicker">{current?'CURRENT CONDITIONS':'FIRST FORECAST DAY'}</p><div class="now-reading"><strong>{reading(currentTemperature)}{#if currentTemperature!==null}<small>C</small>{/if}</strong><div class="hero-icon"><WeatherIcon kind={current?weatherKind(current.weather?.[0]):days[0].icon}/></div></div><h3>{current?.weather?.[0]?.description||days[0].description}</h3><p>{zone.name} <span> / {date(current?.dt||days[0].timestamp)}</span></p><div class="rain-summary"><span class="mini-icon"><WeatherIcon kind="drop"/></span><div><strong>{rainComplete?amount(rainTotal,' mm'):'Unavailable'}</strong><small>Forecast rainfall across {days.length} days</small></div></div><p class="planning">{takeaway}</p>{#if current}<p class="conditions">Wind {amount(finiteReading(current.wind_speed,0),' m/s')} &middot; Humidity {amount(finiteReading(current.humidity,0,100),'%')}</p>{/if}</div>
 <div class="weather-chart"><div class="chart-heading"><p class="p-kicker">THE WEEK AHEAD / °C</p><span><i></i>High <i class="low"></i>Low</span></div><svg viewBox="0 0 550 185" role="img" aria-label="Daily high and low temperature forecast. Exact values are listed below.">{#each [45,90,140] as line}<path d={`M20 ${line}H535`} stroke="#ffffff18"/>{/each}{#each ['max','min'] as key}{#each days as d,i}{@const v=d[key as 'max'|'min']}{@const prev=i?days[i-1][key as 'max'|'min']:null}{#if i&&v!==null&&prev!==null}<line x1={x(i-1)} y1={y(prev)} x2={x(i)} y2={y(v)} stroke={key==='max'?'#d7e99b':'#83bac6'} stroke-width="2.5" stroke-dasharray={key==='min'?'4 5':undefined}/>{/if}{#if v!==null}<circle cx={x(i)} cy={y(v)} r="3.5" fill={key==='max'?'#d7e99b':'#83bac6'}/><text x={x(i)} y={y(v)+(key==='max'?-12:20)} text-anchor="middle">{Math.round(v)}°</text>{/if}{/each}{/each}{#each days as d,i}<text x={x(i)} y="180" text-anchor="middle">{date(d.timestamp,true)}</text>{/each}</svg><p class="retrieved">{date(days[0].timestamp)} &ndash; {date(days[days.length-1].timestamp)} &middot; CAT</p></div></section>
 <div class="forecast-heading"><h2>Your daily forecast</h2><p>Temperature, rainfall and field conditions at a glance.</p></div>
 <div class="weather-days">{#each days as day,i}<article class="forecast-day" class:first={i===0}><div class="day-heading"><p class="p-kicker">{date(day.timestamp)}</p>{#if i===0}<span>First day</span>{/if}</div><div class="day-icon"><WeatherIcon kind={day.icon}/></div><h3>{day.description}</h3><div class="temps"><strong>{reading(day.max)}</strong><span>{reading(day.min)}<small>High / low °C</small></span></div><dl>{#each [['Chance of rain',day.probability,'%', 'drop'],['Rainfall',day.rain,' mm','rain'],['Wind',day.wind,' m/s','wind'],['Humidity',day.humidity,'%', 'drop']] as [label,value,unit,icon]}<div><dt><span class="metric-icon"><WeatherIcon kind={String(icon)}/></span>{label}</dt><dd>{amount(value as number|null,String(unit))}</dd></div>{/each}</dl><div class="rain-track" aria-hidden="true"><span style:width={`${day.probability??0}%`}></span></div><button type="button" class="p-button subtle day-detail" onclick={()=>showDay(day.timestamp)}>View daily detail <span class="sr-only">for {date(day.timestamp)}</span></button></article>{/each}</div>
 {/if}
 <p class="weather-note">Forecasts are estimates and can vary across your farm. Rainfall is shown as 0 mm when the weather feed omits the optional rain amount; missing or invalid measurements remain unavailable.</p>
{:else}<section class="p-card p-empty"><div class="empty-icon"><WeatherIcon kind="sun"/></div><h2>Your forecast starts with this field.</h2><p>Load the forecast above. Weather is available before satellite monitoring is approved.</p></section>{/if}
<style>
.weather-views{display:flex;gap:6px;margin-bottom:22px;padding:5px;border:1px solid #dce4d3;border-radius:10px;width:fit-content;background:#eef2e5}.weather-views button{border:0;border-radius:7px;padding:12px 24px;background:transparent;color:#214c38;font:inherit;font-size:13px;font-weight:600}.weather-views button.chosen{background:#174a38;color:#fff}

.weather-intro{display:flex;align-items:center;justify-content:space-between;gap:24px}.weather-intro p{margin-bottom:0}.weather-board{display:grid;grid-template-columns:minmax(250px,1fr) minmax(0,1.7fr);gap:40px;padding:32px;background:#123f33;color:#f7faee;border-radius:18px;margin-bottom:32px}.weather-board .p-kicker{color:#c9dcae}.now-reading{display:flex;align-items:center;gap:24px}.now-reading>strong{font-size:76px;font-weight:500;line-height:1.2;letter-spacing:-4px}.now-reading strong:has(small){font-size:clamp(50px,7vw,76px)}.now-reading strong:not(:has(small)){font-size:24px;letter-spacing:0}.now-reading small{font-size:24px;letter-spacing:0}.hero-icon{width:88px;height:88px;color:#c6dadd}.weather-now h3{text-transform:capitalize;font-size:21px;margin:10px 0}.weather-now>p:not(.p-kicker){font-size:13px}.weather-now>p span{color:#c1d0c3}.rain-summary{display:flex;gap:12px;border-top:1px solid #ffffff25;padding-top:18px;margin-top:24px}.rain-summary strong{font-size:21px}.rain-summary small{display:block;color:#c1d0c3;font-size:11px;margin-top:4px}.mini-icon{width:36px;height:36px;color:#93c1cd}.weather-chart{align-self:center;min-width:0}.chart-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.chart-heading>span{display:flex;align-items:center;gap:8px;font-size:11px;white-space:nowrap}.chart-heading i{width:14px;height:3px;background:#d7e99b}.chart-heading i.low{background:#83bac6}.weather-chart svg{display:block;width:100%;overflow:visible}.weather-chart text{fill:#eff5df;font-size:11px}.retrieved{font-size:10px;color:#c1d0c3;margin:18px 0 0}.forecast-heading{display:flex;gap:20px;justify-content:space-between;align-items:baseline;margin-bottom:18px}.forecast-heading h2{font-size:24px;margin:0}.forecast-heading p{font-size:13px;color:#687865;margin:0}.weather-days{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:14px}.forecast-day{min-width:0;background:#fffef9;border:1px solid #dce4d3;border-radius:14px;padding:22px}.forecast-day.first{background:#edf2e3;border-color:#c2d3af}.day-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:26px}.day-heading .p-kicker{font-size:10px;letter-spacing:.12em;margin:0}.day-heading>span{font-size:9px;white-space:nowrap;color:#436444}.day-icon{width:64px;height:64px;color:#77989a;margin:18px 0 10px}.forecast-day h3{font-size:17px;text-transform:capitalize;margin:0;min-height:48px;line-height:1.4}.temps{display:flex;align-items:center;gap:14px;padding:16px 0 22px}.temps strong{font-size:40px;letter-spacing:-2px;font-weight:500;line-height:1.1}.temps>span{font-size:18px;color:#687865}.temps small{display:block;font-size:9px;margin-top:3px}dl{margin:0;border-top:1px solid #dce4d3}dl>div{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;min-height:44px;border-bottom:1px solid #e8ecdf}dt{margin:0;display:flex;align-items:center;gap:7px;font-size:11px;color:#63745e;white-space:nowrap}dd{margin:0;text-align:right;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;align-self:center}.metric-icon{display:block;width:18px;height:18px;color:#77989a;flex-shrink:0}.rain-track{height:4px;background:#dfe7d7;border-radius:4px;margin-top:18px;overflow:hidden}.rain-track span{display:block;height:100%;background:#6c9caf}.weather-note{font-size:11px!important;color:#687865;margin:20px 0!important;line-height:1.7}.empty-icon{width:64px;height:64px;margin:0 auto 18px}@media(min-width:1800px){.weather-days{grid-template-columns:repeat(7,minmax(0,1fr))}.forecast-day{padding:18px}dt{font-size:10px}}@media(max-width:900px){.weather-board{grid-template-columns:1fr;gap:28px}.weather-intro{align-items:start;flex-direction:column}.weather-now{max-width:440px}.forecast-heading{display:block}.forecast-heading p{margin-top:8px}}@media(max-width:540px){.weather-board{padding:22px}.now-reading>strong{font-size:64px}.weather-days{grid-template-columns:1fr}.forecast-day{padding:22px}.day-icon{float:right;margin:15px 0}.forecast-day h3{padding-top:22px;min-height:48px}.temps{padding-top:10px}.chart-heading{flex-wrap:wrap}.weather-chart text{font-size:12px}}
 .p-card.weather-intro{padding-block:16px;margin-bottom:14px;flex-wrap:wrap}
 .weather-intro h2{margin:0 0 4px}.weather-intro .p-kicker{margin-bottom:5px!important}
 .weather-intro p:last-child{font-size:13px;color:#506852}
 .weather-actions{display:flex;flex-wrap:wrap;align-items:end;gap:8px}
 .weather-actions .p-field{margin:0;min-width:0}
 .weather-actions .p-button{min-height:44px}
 .weather-views{margin-bottom:14px}
 .planning{margin:14px 0 0;color:#e5edca;font-size:15px!important;font-weight:700}
 .conditions{margin:8px 0 0;color:#d5e2d3}
 .day-detail{width:100%;margin-top:14px}
 @media(max-width:540px){
  .weather-intro{gap:12px}
  .weather-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}
  .weather-actions .p-field{grid-column:1/-1}
  .weather-actions .p-button{width:100%;height:100%;padding-inline:8px}
  .weather-views button{padding:10px 16px}
 }
 </style>
