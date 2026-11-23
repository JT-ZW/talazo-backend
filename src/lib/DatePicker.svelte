<script lang="ts">
 import {onMount,tick} from 'svelte';
 import {calendarDays,shiftMonth,todayISO,validDate} from './calendar.mjs';
 let {name,value=$bindable(''),label='Choose a date',required=false,min='',max='',mode='date'}:{name:string,value?:string,label?:string,required?:boolean,min?:string,max?:string,mode?:'date'|'month'}=$props();
 let root:HTMLDivElement,input:HTMLInputElement,trigger:HTMLButtonElement;
 let open=$state(false),month=$state(todayISO().slice(0,7)),above=$state(false);
 let days=$derived(calendarDays(month));
 let year=$derived(Number(month.slice(0,4))),monthIndex=$derived(Number(month.slice(5,7))-1);
 const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const uid=$props.id();
 const allowed=(v:string)=>!v||((!min||v>=min)&&(!max||v<=max));
 $effect(()=>{if(input){const valid=!value||(mode==='month'?/^\d{4}-\d{2}$/.test(value)&&Number(value.slice(5))>=1&&Number(value.slice(5))<=12:validDate(value));input.setCustomValidity(!valid?'Enter a valid '+(mode==='month'?'month as YYYY-MM.':'date as YYYY-MM-DD.'):value&&!allowed(value)?'Choose a date within the allowed range.':'');}});
 async function toggle(){open=!open;if(open){month=(value||max||todayISO()).slice(0,7);above=window.innerHeight-root.getBoundingClientRect().bottom<370&&root.getBoundingClientRect().top>370;await tick();root.querySelector<HTMLButtonElement>('[data-date="'+(validDate(value)?value:todayISO())+'"]')?.focus();}}
 function select(v:string){if(!allowed(v))return;value=v;open=false;trigger?.focus();}
 function dismissOnEscape(e:KeyboardEvent){
  if(e.key!=='Escape'||!open)return false;
  e.preventDefault();
  open=false;
  trigger.focus();
  return true;
 }
 async function keys(e:KeyboardEvent,date:string){
  if(dismissOnEscape(e))return;
  let target=date;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){
   e.preventDefault();const d=new Date(date+'T12:00:00Z'),weekDay=(d.getUTCDay()+6)%7;
   d.setUTCDate(d.getUTCDate()+({ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-weekDay,End:6-weekDay} as Record<string,number>)[e.key]);target=d.toISOString().slice(0,10);
  }else if(e.key==='PageUp'||e.key==='PageDown'){e.preventDefault();target=shiftMonth(date.slice(0,7),e.key==='PageUp'?-1:1)+'-01';}else return;
  if(!allowed(target))return;month=target.slice(0,7);await tick();root.querySelector<HTMLButtonElement>('[data-date="'+target+'"]')?.focus();
 }
 onMount(()=>{const form=input.form;const reset=()=>{value='';open=false;};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);});
</script>
<svelte:window onpointerdown={e=>{if(open&&root&&!root.contains(e.target as Node))open=false;}} onkeydown={dismissOnEscape}/>
<div class="date-picker" bind:this={root}>
 <div class="date-input"><input bind:this={input} {name} bind:value {required} aria-label={label} placeholder={mode==='month'?'YYYY-MM':'YYYY-MM-DD'} pattern={mode==='month'?'[0-9]{4}-[0-9]{2}':'[0-9]{4}-[0-9]{2}-[0-9]{2}'} autocomplete="off"/><button bind:this={trigger} type="button" class="calendar-toggle" aria-label={`Open calendar: ${label}`} aria-expanded={open} aria-controls={uid} onclick={toggle}><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 11h18m-13 4h2m4 0h2m-8 3h2"/></svg></button></div>
 {#if open}<div id={uid} class="calendar" class:above role="dialog" aria-label={label}>
  <header><button type="button" aria-label="Previous month" onclick={()=>month=shiftMonth(month,-1)}>‹</button><div class="month-select"><select aria-label="Calendar month" value={monthIndex} onchange={e=>month=year+'-'+String(Number(e.currentTarget.value)+1).padStart(2,'0')}>{#each months as m,i}<option value={i}>{m}</option>{/each}</select><select aria-label="Calendar year" value={year} onchange={e=>month=e.currentTarget.value+'-'+String(monthIndex+1).padStart(2,'0')}>{#each Array.from({length:131},(_,i)=>Number(todayISO().slice(0,4))-110+i) as y}<option value={y}>{y}</option>{/each}</select></div><button type="button" aria-label="Next month" onclick={()=>month=shiftMonth(month,1)}>›</button></header>
  {#if mode==='month'}<div class="month-grid">{#each months as m,i}{@const date=year+'-'+String(i+1).padStart(2,'0')}<button type="button" class:selected={date===value} disabled={!allowed(date)} onclick={()=>select(date)}>{m.slice(0,3)}</button>{/each}</div>
  {:else}<div class="weekdays" aria-hidden="true">{#each ['Mo','Tu','We','Th','Fr','Sa','Su'] as d}<span>{d}</span>{/each}</div><div class="day-grid" role="group" aria-label="Days of the month">{#each days as d}<button type="button" data-date={d} class:outside={!d.startsWith(month)} class:today={d===todayISO()} class:selected={d===value} aria-label={new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{dateStyle:'full',timeZone:'Africa/Harare'})} aria-pressed={d===value} disabled={!allowed(d)} onkeydown={e=>keys(e,d)} onclick={()=>select(d)}>{Number(d.slice(8))}</button>{/each}</div>{/if}
  <footer><button type="button" onclick={()=>select('')}>Clear</button><span>{mode==='date'?'Dates in YYYY-MM-DD':'Billing month'}</span><button type="button" disabled={!allowed(todayISO().slice(0,mode==='month'?7:10))} onclick={()=>select(todayISO().slice(0,mode==='month'?7:10))}>Today</button></footer>
 </div>{/if}
</div>
<style>
 .date-picker{position:relative;min-width:0}.date-input{position:relative}.date-input input{padding-right:48px!important}.calendar-toggle{position:absolute;right:5px;top:5px;bottom:5px;width:38px;display:grid;place-items:center;border:0;border-radius:6px;color:#244e39;background:transparent;cursor:pointer}.calendar-toggle:hover{background:#e8efdc}.calendar{position:absolute;z-index:60;right:0;top:calc(100% + 8px);width:320px;max-width:calc(100vw - 52px);padding:15px;border:1px solid #c9d5ba;border-radius:14px;background:#fffef7;box-shadow:0 18px 55px #123f3230;color:#143f32}.calendar.above{top:auto;bottom:calc(100% + 8px)}header{height:auto;min-height:0;padding:0 0 14px;background:#fffef7;display:flex;align-items:center;justify-content:space-between;gap:6px;padding-bottom:14px}.calendar button{font:500 13px 'DM Sans',sans-serif;cursor:pointer;border:0;color:inherit;background:transparent;border-radius:7px;min-height:34px}.calendar button:hover:not(:disabled){background:#e8efdc}.calendar button:focus-visible,.calendar-toggle:focus-visible{outline:3px solid #ae781a;outline-offset:2px}.calendar button:disabled{opacity:.32;cursor:not-allowed}header>button{width:30px;font-size:25px}.month-select{display:flex;gap:5px}.month-select select{font:600 12px 'DM Sans',sans-serif;width:auto!important;min-height:34px!important;padding:5px!important;border:0!important;background:transparent!important}.weekdays,.day-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.weekdays{font-size:10px;letter-spacing:.05em;text-align:center;color:#6f7c64;margin-bottom:9px}.day-grid button{aspect-ratio:1}.day-grid button.outside{color:#849078}.day-grid button.today{box-shadow:inset 0 0 0 1px #8aa864}.calendar button.selected{background:#194a38!important;color:white!important;font-weight:700}.month-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.month-grid button{min-height:45px}footer{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e1e7d9;margin-top:13px;padding-top:10px;gap:4px}footer span{font-size:9px;color:#78836c}footer button{font-size:11px!important;color:#315c3b!important;padding:4px 8px}@media(max-width:600px){.calendar{right:0}}
</style>
