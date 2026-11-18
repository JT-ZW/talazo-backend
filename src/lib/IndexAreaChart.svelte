<script lang="ts">
 import {indexDistribution} from './advisory-model.mjs';
 let {product,layer}:{product:any,layer:string}=$props();
 let bins=$derived(indexDistribution(product?.value?.bins,layer));
 let total=$derived(bins.reduce((n,b)=>n+b.area,0));
 const colors=['#9c3844','#bc5944','#d28a49','#d7ab55','#c6bf62','#a6b964','#7eaa5b','#55944c','#347d45','#1e623a'];
</script>
<section class="distribution" aria-label="Field area by index range">
 <div class="chart-heading"><div><p>INDEX DISTRIBUTION</p><h3>How the field varies</h3></div><span>{layer.toUpperCase()} · provider areas</span></div>
 {#if bins.length}<div class="bin-chart" aria-hidden="true">{#each bins as bin,i}<div><span style:height={Math.max(bin.percent,1)+'%'} style:background={colors[i]}></span><small>{(i/10).toFixed(1)}</small></div>{/each}</div>
 <details><summary>View exact areas & proportions</summary><table><thead><tr><th>Index range</th><th>Area (m²)</th><th>Share</th></tr></thead><tbody>{#each bins as bin}<tr><td>{bin.range}</td><td>{bin.area.toLocaleString('en')}</td><td>{bin.percent.toFixed(1)}%</td></tr>{/each}</tbody></table></details>
 <p class="chart-note">{total.toLocaleString('en')} m² classified from satellite data. Shares use the returned classified area; raster estimates can differ from your mapped area. Index ranges do not diagnose the cause of stress.</p>
 {:else}<p class="chart-note">{product?.state==='pending'?'Loading the provider’s area distribution…':product?.error||'No area distribution is available for this layer and observation.'}</p>{/if}
</section>
<style>.distribution{background:#fffef8;border:1px solid #dce3d3;border-radius:13px;padding:22px;margin-bottom:20px;color:#163f33}.chart-heading{display:flex;justify-content:space-between;align-items:start;gap:16px}.chart-heading p{font-size:9px;letter-spacing:.14em;color:#738168;margin:0 0 8px}.chart-heading h3{font-size:19px;font-weight:500;margin:0}.chart-heading>span{font-size:10px;color:#708165}.bin-chart{height:150px;display:flex;gap:7px;align-items:end;padding:20px 0 22px;border-bottom:1px solid #dce3d3;margin-bottom:15px}.bin-chart>div{flex:1;height:100%;position:relative;display:flex;align-items:end}.bin-chart span{width:100%;border-radius:3px 3px 0 0;min-height:2px}.bin-chart small{position:absolute;top:calc(100% + 5px);font-size:9px;color:#78866c;left:0}.chart-note{font-size:11px;line-height:1.8;color:#6a7962;margin:12px 0 0}summary{font-size:11px;font-weight:600;cursor:pointer}table{width:100%;font-size:11px;border-collapse:collapse;margin:15px 0}th,td{text-align:right;padding:8px 4px;border-bottom:1px solid #e5eadf}th:first-child,td:first-child{text-align:left}summary:focus-visible{outline:2px solid #b27d28;outline-offset:4px}</style>
