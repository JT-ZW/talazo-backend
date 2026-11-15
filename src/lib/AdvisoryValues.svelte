<script lang="ts">
 let {value,label=''}:{value:any,label?:string}=$props();
 const title=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
</script>
{#snippet render(item:any,depth:number)}
 {#if item===null||item===undefined||item===''}<span class="missing">Not provided</span>
 {:else if typeof item!=='object'}<p class="value">{String(item)}</p>
 {:else if Array.isArray(item)}{#if !item.length}<p class="missing">No entries returned by the provider.</p>{/if}{#each item as entry,i}<div class="entry">{#if typeof entry==='object'}<h4>Item {i+1}</h4>{/if}{@render render(entry,depth+1)}</div>{/each}
 {:else if depth<6}<dl>{#each Object.entries(item) as [key,entry]}<div class="fact"><dt>{title(key)}</dt><dd>{@render render(entry,depth+1)}</dd></div>{/each}</dl>
 {:else}<p>Further details available in the provider report.</p>{/if}
{/snippet}
<div class="advisory-values">{#if label}<h3>{label}</h3>{/if}{@render render(value,0)}</div>
<style>.value{white-space:pre-wrap;overflow-wrap:anywhere;margin:0;line-height:1.6}.missing{color:#758071;font-size:14px}dl{margin:0}.fact{padding:13px 0;border-bottom:1px solid #e4e9df}dt{font-size:12px;font-weight:700;color:#5a705d;margin-bottom:6px}dd{margin:0}dd dl{padding-left:16px;border-left:2px solid #dce8d4}.entry{margin:12px 0;padding:14px;background:#f5f7f0;border-radius:8px}h4{margin:0 0 12px;font-size:13px}</style>
