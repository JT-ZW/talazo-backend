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
<dialog bind:this={dialog} class="process-dialog" aria-labelledby="process-title" aria-describedby="process-description" aria-busy={$processing!==null} oncancel={event=>event.preventDefault()}>
 <div class="process-spinner" aria-hidden="true"></div><p class="process-eyebrow">TALAZO / IN PROGRESS</p><h2 id="process-title">{$processing?.title||'Working on your request'}</h2><p id="process-description">{$processing?.detail||'Please keep this page open.'}</p>
</dialog>
<div class="toast-stack" aria-label="Process notifications">{#each $notifications as notification (notification.id)}<div class="process-toast" class:toast-error={notification.kind==='error'} role={notification.kind==='error'?'alert':'status'}><span class="toast-symbol" aria-hidden="true">{notification.kind==='error'?'!':'✓'}</span><div><strong>{notification.kind==='error'?'Action needed':'Completed'}</strong><p>{notification.message}</p></div><button type="button" aria-label="Dismiss notification" onclick={()=>dismiss(notification.id)}>×</button></div>{/each}</div>
<style>
 .process-dialog{border:1px solid #d8e0ce;border-radius:18px;padding:36px;max-width:440px;width:calc(100% - 40px);text-align:center;color:#153e30;background:#fffef8;box-shadow:0 30px 90px #103f3230}.process-dialog::backdrop{background:#0e3026a3;backdrop-filter:blur(3px)}.process-dialog h2{font-size:25px;line-height:1.3;margin-bottom:12px}.process-dialog p:last-child{font-size:13px;line-height:1.7;color:#617260;margin-bottom:0}.process-eyebrow{font-size:9px;letter-spacing:.17em;font-weight:700;color:#69814c;margin:20px 0 12px}.process-spinner{height:44px;width:44px;margin:0 auto;border:3px solid #e0e9d3;border-top-color:#547540;border-radius:50%;animation:spin 1s linear infinite}.toast-stack{position:fixed;right:24px;bottom:24px;z-index:2000;display:grid;gap:12px;width:min(440px,calc(100vw - 36px));pointer-events:none}.process-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:12px;padding:17px;background:#fffef8;color:#173f30;border:1px solid #b7cea1;border-left:4px solid #6d904c;border-radius:11px;box-shadow:0 12px 42px #153e3026;font-size:12px}.process-toast strong{display:block;font-size:12px;margin-bottom:5px}.process-toast p{margin:0;line-height:1.6;overflow-wrap:anywhere}.toast-symbol{width:25px;min-width:25px;height:25px;display:grid;place-items:center;border-radius:50%;background:#e6efd9;font-weight:700}.toast-error{border-color:#d6b09a;border-left-color:#a75b33}.toast-error .toast-symbol{background:#f8e6dc;color:#914423}.process-toast button{border:0;background:none;margin-left:auto;padding:0 3px;font-size:22px;line-height:1;color:#617260}.process-toast button:focus-visible{outline:3px solid #b37a19;outline-offset:3px}@keyframes spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.process-spinner{animation:none;border-top-color:#547540;border-bottom-color:#547540}}@media(max-width:600px){.toast-stack{right:18px;bottom:18px}.process-dialog{padding:28px 23px}}
</style>
