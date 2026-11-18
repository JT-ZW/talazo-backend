// Local persistent worker. Hosted environments call the same bounded endpoints.
const origin=new URL(process.env.ORIGIN||'http://127.0.0.1:5174').origin;
const secret=process.env.SATELLITE_JOB_SECRET;
if(!secret)throw new Error('Configure SATELLITE_JOB_SECRET before starting the worker.');
let stopping=false,round=0;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;});
async function run(kind){
 try{
  const r=await fetch(origin+'/api/satellite/sync?kind='+kind,{method:'POST',headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(240000)});
  console.log(JSON.stringify({time:new Date().toISOString(),kind,status:r.status,...(r.ok?await r.json():{})}));
 }catch{console.log(JSON.stringify({time:new Date().toISOString(),kind,error:'Synchronization request failed; retrying later'}));}
}
while(!stopping){
 await run('fields');
 if(round++%5===0&&!stopping)await run('inventory');
 if(process.argv.includes('--once'))break;
 for(let i=0;i<6&&!stopping;i++)await new Promise(resolve=>setTimeout(resolve,10000));
}
