<script lang="ts">
 let {series={}}: {series?:Record<string,unknown>}=$props();
 let points=$derived(Object.entries(series).filter(([date,value])=>/^\d{8}$/.test(date)&&value!==null&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=100).sort(([a],[b])=>a.localeCompare(b)));
 let path=$derived(points.map(([,v],i)=>`${points.length===1?300:40+i*520/(points.length-1)},${160-Number(v)*1.3}`).join(' '));
</script>
{#if points.length}
 <svg viewBox="0 0 600 205" role="img" aria-label="Vegetation index observations over time; values are listed below"><line x1="40" y1="160" x2="560" y2="160" stroke="#dce2d4"/><line x1="40" y1="95" x2="560" y2="95" stroke="#e9eee4"/><line x1="40" y1="30" x2="560" y2="30" stroke="#e9eee4"/><text x="0" y="35">1.0</text><text x="0" y="100">0.5</text><text x="0" y="165">0.0</text><polyline points={path} fill="none" stroke="#517743" stroke-width="3"/>{#each points as [date,v],i}<circle cx={points.length===1?300:40+i*520/(points.length-1)} cy={160-Number(v)*1.3} r="4" fill="#517743"><title>{date}: {Number(v)/100}</title></circle>{/each}</svg>
 <details><summary>View observation values</summary><dl>{#each points as [date,v]}<div><dt>{date.slice(0,4)}-{date.slice(4,6)}-{date.slice(6)}</dt><dd>{(Number(v)/100).toFixed(2)}</dd></div>{/each}</dl></details>
{:else}<div class="p-empty compact"><h3>A trend starts with observations.</h3><p>There are no index values available for this growing area yet.</p></div>{/if}
<style>svg{width:100%;max-height:270px}text{font-size:12px;fill:#647366}details{font-size:12px}dl>div{display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #e9eee4}dd{margin:0}</style>
