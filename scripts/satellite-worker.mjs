// Separate worker process. Requires the app to be running at ORIGIN.
const origin=new URL(process.env.ORIGIN||'http://127.0.0.1:5174').origin;
const secret=process.env.SATELLITE_JOB_SECRET;
if(!secret)throw new Error('Configure SATELLITE_JOB_SECRET before starting the worker.');
let stopping=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;});
while(!stopping){
 try{
  const r=await fetch(origin+'/api/satellite/sync',{method:'POST',headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(120000)});
  console.log(JSON.stringify({time:new Date().toISOString(),status:r.status,...(r.ok?await r.json():{})}));
 }catch{console.log(JSON.stringify({time:new Date().toISOString(),error:'Synchronization request failed; retrying later'}));}
 // Short interruptible waits keep graceful shutdown responsive.
 for(let i=0;i<360&&!stopping;i++)await new Promise(resolve=>setTimeout(resolve,10000));
}
