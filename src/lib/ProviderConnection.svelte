<script lang="ts">
 import {onMount} from 'svelte';import {invalidateAll} from '$app/navigation';
 let {record}:{record:any}=$props();let status=$state('Checking for new Farmonaut observations…');
 onMount(()=>{let disposed=false;async function refresh(){if(document.hidden)return;try{const response=await fetch('/api/satellite/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({monitoring:record.id})});if(!response.ok)throw Error();const result=await response.json();if(disposed)return;status=result.refreshed?'Farmonaut observations updated.':'Connected · checking automatically for new observations';if(result.refreshed)await invalidateAll();}catch{if(!disposed)status='Automatic refresh is temporarily unavailable. Your saved observations remain visible.';}}void refresh();const timer=setInterval(refresh,120000);return()=>{disposed=true;clearInterval(timer);};});
</script>
<p class="connection" role="status"><span aria-hidden="true"></span>{status}</p>
<style>.connection{display:flex;align-items:center;gap:8px;font-size:11px;color:#61745e;margin:0 0 18px;line-height:1.6}.connection>span{width:6px;height:6px;flex-shrink:0;border-radius:50%;background:#6e9450}</style>
