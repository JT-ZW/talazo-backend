<script>
 import {history,dailyHistory} from './catalog';
 /** @type {{metric?:'moisture'|'temp'|'ec',range?:string}} */
 let {metric='moisture',range='24h'}=$props();
 let values=$derived((range==='24h'?history:dailyHistory).map(r=>r[metric]));
 let low=$derived(Math.min(...values)-2),high=$derived(Math.max(...values)+2);
 let points=$derived(values.map((v,i)=>`${45+i*126},${175-(v-low)/(high-low)*135}`).join(' '));
</script>
<figure class="chart"><svg viewBox="0 0 720 220" role="img" aria-label={`Sample ${metric} trend. ${range==='24h'?'Six samples during 31 October 2026.':'Six daily sample aggregates, 26–31 October 2026.'}`}>
 {#each [0,1,2,3] as line}<line x1="45" x2="675" y1={40+line*45} y2={40+line*45} stroke="#dce3d7" stroke-dasharray="4 5"/><text x="0" y={45+line*45}>{(high-(high-low)*line/3).toFixed(1)}</text>{/each}
 <polygon points={`45,180 ${points} 675,180`} fill="#d8e9a2" opacity=".5"/>
 <polyline {points} fill="none" stroke="#176248" stroke-width="3" stroke-linejoin="round"/>
 {#each values as v,i}<circle cx={45+i*126} cy={175-(v-low)/(high-low)*135} r="4" fill="#176248"/><text x={45+i*126} y="210" text-anchor="middle">{range==='24h'?history[i].at:`${26+i} Oct`}</text>{/each}
 </svg><figcaption>Illustrative {range==='24h'?'24-hour readings · 31 Oct 2026':'daily aggregates · 26–31 Oct 2026'} · CAT (UTC+2). No live measurements.</figcaption></figure>
