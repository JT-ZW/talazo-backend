<script lang="ts">
 let {jobs=[]}:{jobs:any[]}=$props();
 const stamp=(v:string)=>v?new Date(v).toLocaleString('en-GB',{timeZone:'Africa/Harare'}):'Not yet';
</script>
<section class="p-card"><p class="p-kicker">BACKGROUND SYNCHRONIZATION</p><h2>Data delivery health</h2><p>Local automatic updates require the satellite worker to be running. Retrieval time is separate from the date of a satellite observation.</p>
 {#each jobs as job}<article><strong>{job.name}</strong><p>{job.outcome||'Waiting'} · consecutive failures: {job.failures}</p><p class="p-caption">Last attempt: {stamp(job.started_at)} · Last success: {stamp(job.succeeded_at)}</p>{#if job.lease_until&&Date.parse(job.lease_until)<Date.now()&&job.outcome==='running'}<p role="status">Previous run was interrupted. Its lease has expired and the next worker can recover it.</p>{/if}</article>{:else}<p role="status">No background jobs have run yet. Start the local worker to receive updates with all browser tabs closed.</p>{/each}
</section>
<style>article{border-top:1px solid #dce2d4;padding:18px 0}article p{margin:8px 0;line-height:1.6}</style>
