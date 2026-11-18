<script lang="ts">
 let {kind='cloud'}:{kind?:string}=$props();
</script>
<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
 {#if kind==='sun'}<circle cx="32" cy="32" r="12" fill="#e9bc55" stroke="#e9bc55"/><path d="M32 5v7m0 40v7M5 32h7m40 0h7M13 13l5 5m28 28 5 5M13 51l5-5m28-28 5-5" stroke="#d5a445"/>
 {:else if kind==='wind'}<path d="M8 24h34c13 0 13-17 2-17-6 0-8 4-8 7M5 34h44c12 0 12 17 1 17-5 0-8-4-8-7M12 44h15"/>
 {:else if kind==='drop'}<path d="M32 7C25 19 15 28 15 39a17 17 0 0 0 34 0C49 28 39 19 32 7Z" fill="currentColor" fill-opacity=".12"/><path d="M23 39c0 6 3 9 8 10"/>
 {:else}<path d="M17 40a11 11 0 1 1 3-21 16 16 0 0 1 30 5 8 8 0 0 1-1 16Z" fill="currentColor" fill-opacity=".12"/>
 {#if kind==='rain'}<path d="m21 47-4 8m17-8-4 8m17-8-4 8" stroke="#6ea9bf"/>{:else if kind==='storm'}<path d="m34 42-7 10h8l-5 9" stroke="#e9bc55"/>{:else if kind==='snow'}<path d="M23 47v12m-5-9 10 6m0-6-10 6m27-9v12m-5-9 10 6m0-6-10 6"/>{:else if kind==='mist'}<path d="M14 48h39M10 55h39"/>{/if}{/if}
</svg>
<style>svg{display:block;width:100%;height:100%}</style>
