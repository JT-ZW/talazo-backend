<script lang="ts">
 import {enhance} from '$app/forms';
 import {tick} from 'svelte';
 import {feedbackForm} from './feedback';
 import {supportCategories,supportStatuses,type SupportRequest} from './support';
 let {data,form}:{data:any;form?:any}=$props();
 let requests=$derived(((data.supportRequests||[]) as SupportRequest[]).slice().sort((a,b)=>b.created_at.localeCompare(a.created_at)));
 let status=$state('actionable');
 let visible=$derived(data.admin?requests.filter(row=>status==='all'||(status==='actionable'?row.status!=='resolved':row.status===status)):requests);
 let dialog=$state<HTMLDialogElement>();
 let mode=$state<'new'|'view'|null>(null),selected=$state<SupportRequest>();
 let previousForm=$state.raw<any>();
 let busy=$state(false);
 const save=feedbackForm({onBusy:value=>busy=value,onSuccess:()=>dialog?.close()});
 async function open(next:'new'|'view',row?:SupportRequest){
  previousForm=form;
  selected=row;
  mode=next;
  await tick();
  dialog?.showModal();
 }
 const date=(value:string)=>new Date(value).toLocaleDateString('en-GB',{timeZone:'Africa/Harare',day:'numeric',month:'short',year:'numeric'});
 const person=(id:string)=>data.users?.find((user:any)=>user.user_id===id);
</script>
<section class="p-card support-panel" id="support-requests">
 <div class="p-section-heading"><div><h2>{data.admin?'Support inbox':'Support requests'}</h2><p>{data.admin?'Review requests and post a reply visible to the requester.':'Send a request to Talazo and check replies here.'}</p></div>
 {#if !data.admin&&data.supportAvailable}<button type="button" class="p-button" onclick={()=>void open('new')}>New support request</button>{/if}</div>
 {#if !data.supportAvailable}
  <p>The support inbox is unavailable. {data.admin?'Apply the support database migration to enable it.':'Contact the Talazo coordinator who invited you for help.'}</p>
 {:else}
  {#if data.admin}
   <div class="p-page-tabs" role="group" aria-label="Filter support requests">{#each [['actionable','Needs attention'],['resolved','Resolved'],['all','All requests']] as [id,label]}<button type="button" aria-pressed={status===id} onclick={()=>status=id}>{label}</button>{/each}</div>
  {/if}
  <ul class="support-list">
   {#each visible as row (row.id)}
    <li><div><strong>{row.subject}</strong><p>{supportCategories[row.category]} &middot; {date(row.created_at)}{#if data.admin&&person(row.requester)} &middot; {person(row.requester).name}{/if}</p></div><div><span class="p-pill">{supportStatuses[row.status]}</span><button type="button" class="p-button subtle" onclick={()=>void open('view',row)}>View request<span class="sr-only"> {row.subject}</span></button></div></li>
   {:else}
    <li><p>{data.admin?'No requests in this view.':'You haven’t sent a support request yet.'}</p></li>
   {/each}
  </ul>
 {/if}
</section>

<dialog class="farm-dialog" aria-labelledby="support-dialog-heading" bind:this={dialog} onclose={()=>mode=null}>
 {#if mode}
  <div class="farm-dialog-heading"><h2 id="support-dialog-heading">{mode==='new'?'New support request':selected?.subject}</h2><button type="button" class="p-button subtle" onclick={()=>dialog?.close()}>Close</button></div>
  {#if form!==previousForm&&form?.message}<p class="p-feedback" role="status">{form.message}</p>{/if}
  {#if mode==='new'}
   <form method="POST" action="?/supportRequest" use:enhance={save}>
    <label class="p-field">Category<select name="category" required><option value="">Choose a category</option>{#each Object.entries(supportCategories) as [id,label]}<option value={id}>{label}</option>{/each}</select></label>
    <label class="p-field">Subject<input name="subject" maxlength="120" required/></label>
    <label class="p-field">How can we help?<textarea name="message" rows="4" maxlength="2000" required placeholder="Include the field name, observation date or error message if relevant."></textarea></label>
    <button class="p-button" disabled={busy}>Send request</button>
   </form>
  {:else if selected}
   <p>{supportCategories[selected.category]} &middot; {date(selected.created_at)} &middot; {supportStatuses[selected.status]}</p>
   {#if data.admin&&person(selected.requester)}<p>{person(selected.requester).name} &middot; {person(selected.requester).email}</p>{/if}
   <p class="support-message">{selected.message}</p>
   {#if data.admin}
    <form method="POST" action="?/supportReply" use:enhance={save}>
     <input type="hidden" name="request" value={selected.id}/>
     <label class="p-field">Status<select name="status" value={selected.status}>{#each Object.entries(supportStatuses) as [id,label]}<option value={id}>{label}</option>{/each}</select></label>
     <label class="p-field">Reply to requester<textarea name="reply" rows="4" maxlength="2000" value={selected.reply}></textarea></label>
     <button class="p-button" disabled={busy}>Save support update</button>
    </form>
   {:else}
    <h3>Talazo reply</h3><p class="support-message">{selected.reply||'No reply has been posted yet.'}</p>
   {/if}
  {/if}
 {/if}
</dialog>

<style>
 .support-panel h2,.support-panel .p-section-heading p{margin:0 0 4px}
 .support-list{list-style:none;padding:0;margin:12px 0 0}
 .support-list li{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;border-top:1px solid #d8e2d3;padding:14px 0}
 .support-list li:last-child{padding-bottom:0}
 .support-list li>div{min-width:0;overflow-wrap:anywhere}
 .support-list li>div:last-child{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
 .support-list p{margin:3px 0 0;color:#506852;font-size:14px}
 .support-message{white-space:pre-wrap;overflow-wrap:anywhere}
</style>
