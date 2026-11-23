<script lang="ts">
 import {onDestroy} from 'svelte';
 import {processing,notifications,dismiss} from './feedback';
 let dialog=$state<HTMLDialogElement>();
 let previousFocus:HTMLElement|null=null;
 $effect(()=>{
  if(!dialog)return;
  if($processing&&!dialog.open){previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;dialog.showModal();}
  else if(!$processing&&dialog.open){dialog.close();if(previousFocus?.isConnected)previousFocus.focus();previousFocus=null;}
 });
 onDestroy(()=>dialog?.close());
</script>
<dialog bind:this={dialog} class="process-dialog" class:auth-process={$processing?.branded} aria-labelledby="process-title" aria-describedby={$processing?.branded?undefined:'process-description'} oncancel={event=>event.preventDefault()}>
 {#if $processing?.branded}
  <div class="auth-process-content">
   <img class="auth-process-logo" src="/images/talazo-logo-cropped.png" width="394" height="141" alt="Talazo Agritech"/>
   <h2 id="process-title">{$processing.title}…</h2>
   <div class="auth-process-track" aria-hidden="true"></div>
  </div>
 {:else}
  <div class="process-spinner" aria-hidden="true"></div><p class="process-eyebrow">TALAZO / IN PROGRESS</p><h2 id="process-title">{$processing?.title||'Working on your request'}</h2><p id="process-description">{$processing?.detail||'Please keep this page open.'}</p>
 {/if}
</dialog>
<div class="toast-stack" aria-label="Process notifications">
 {#each $notifications as notification (notification.id)}
  <div class="process-toast" class:toast-error={notification.kind==='error'}>
   <span class="toast-symbol" aria-hidden="true">{#if notification.kind==='error'}!{:else}&#10003;{/if}</span>
   <div class="toast-copy" role={notification.kind==='error'?'alert':'status'}>
    <strong>{notification.kind==='error'?'Action needed':'Completed'}</strong>
    <p>{notification.message}</p>
   </div>
   <button type="button" aria-label="Dismiss notification" onclick={()=>dismiss(notification.id)}>&times;</button>
  </div>
 {/each}
</div>
<style>
 .process-dialog{border:1px solid #d8e0ce;border-radius:18px;padding:36px;max-width:440px;width:calc(100% - 40px);text-align:center;color:#153e30;background:#fffef8;box-shadow:0 30px 90px #103f3230}.process-dialog::backdrop{background:#0e3026a3;backdrop-filter:blur(3px)}.process-dialog h2{font-size:25px;line-height:1.3;margin-bottom:12px}.process-dialog p:last-child{font-size:13px;line-height:1.7;color:#617260;margin-bottom:0}.process-eyebrow{font-size:9px;letter-spacing:.17em;font-weight:700;color:#69814c;margin:20px 0 12px}.process-spinner{height:44px;width:44px;margin:0 auto;border:3px solid #e0e9d3;border-top-color:#547540;border-radius:50%;animation:spin 1s linear infinite}.toast-stack {
  position:fixed;
  inset-inline-end:max(20px,env(safe-area-inset-right));
  bottom:max(20px,env(safe-area-inset-bottom));
  z-index:2000;
  display:grid;
  gap:10px;
  width:min(27rem,calc(100% - max(20px,env(safe-area-inset-right)) - 20px));
  pointer-events:none;
 }
 .process-toast {
  pointer-events:auto;
  display:grid;
  grid-template-columns:auto minmax(0,1fr) auto;
  align-items:start;
  gap:12px;
  padding:16px;
  border-radius:14px;
  background:#103f32;
  color:#fffef8;
  box-shadow:0 8px 12px #103f321a,0 18px 42px #103f3233;
  animation:toast-enter 200ms ease-out both;
 }
 .toast-error{background:#4f2b20;box-shadow:0 8px 12px #4f2b201a,0 18px 42px #4f2b2033}
 .toast-symbol {
  display:grid;
  place-items:center;
  width:36px;
  height:36px;
  border-radius:10px;
  background:#d8e9a2;
  color:#103f32;
  font-size:20px;
  font-weight:700;
 }
 .toast-error .toast-symbol{background:#f6d5ae;color:#4f2b20}
 .toast-copy{padding-block:1px}
 .toast-copy strong{display:block;font-family:Manrope,sans-serif;font-size:1rem;font-weight:700;margin-bottom:4px}
 .toast-copy p{margin:0;font-size:.9375rem;line-height:1.55;overflow-wrap:anywhere}
 .process-toast button {
  width:44px;
  height:44px;
  margin:-4px -4px 0 0;
  padding:0;
  border:0;
  border-radius:9px;
  background:transparent;
  color:inherit;
  font-size:24px;
  line-height:1;
 }
 .process-toast button:hover{background:#ffffff20}
 .process-toast button:focus-visible{outline:2px solid #fffef8;outline-offset:0}
 @keyframes toast-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
 @media(prefers-reduced-motion:reduce){.process-toast{animation:none}}
 @keyframes spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.process-spinner{animation:none;border-top-color:#547540;border-bottom-color:#547540}}@media(max-width:600px){.process-dialog{padding:28px 23px}}
 .process-dialog.auth-process {
  position:fixed;
  inset:0;
  width:100%;
  height:100%;
  max-width:none;
  max-height:none;
  margin:0;
  padding:24px;
  border:0;
  border-radius:0;
  background:transparent;
  box-shadow:none;
  overscroll-behavior:contain;
 }
 .auth-process[open]{display:grid;place-items:center;animation:auth-appear 180ms ease-out}
 .auth-process::backdrop{background:rgb(255 254 248 / 94%);backdrop-filter:none}
 :global(html:has(.auth-process[open])){overflow:hidden}
 .auth-process-content{display:grid;justify-items:center;gap:20px}
 .auth-process-logo {
  display:block;
  width:clamp(208px,42vw,394px);
  max-width:100%;
  height:auto;
  animation:auth-logo-breathe 2s ease-in-out infinite;
 }
 .auth-process h2{margin:0;font-size:clamp(15px,2vw,19px);font-weight:600;letter-spacing:0}
 .auth-process-track{width:72px;height:3px;overflow:hidden;border-radius:999px;background:#dce7d1}
 .auth-process-track::after {
  content:'';
  display:block;
  width:48%;
  height:100%;
  border-radius:inherit;
  background:#547540;
  animation:auth-progress 1.35s ease-in-out infinite alternate;
 }
 @keyframes auth-appear{from{opacity:0}to{opacity:1}}
 @keyframes auth-logo-breathe{0%,100%{transform:scale(.96);opacity:.85}50%{transform:scale(1);opacity:1}}
 @keyframes auth-progress{from{transform:translateX(0)}to{transform:translateX(108%)}}
 @media(prefers-reduced-motion:reduce){
  .auth-process[open],.auth-process-logo,.auth-process-track::after{animation:none}
  .auth-process-track::after{transform:translateX(54%)}
 }
</style>
