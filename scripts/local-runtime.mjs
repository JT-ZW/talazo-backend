// Run the local web app and durable polling loop together; never deploys.
import {spawn} from 'node:child_process';import path from 'node:path';
const origin=new URL(process.env.ORIGIN||'http://127.0.0.1:5174');
if(!['127.0.0.1','localhost'].includes(origin.hostname)||origin.protocol!=='http:')throw Error('Local runtime requires a localhost HTTP ORIGIN.');
const children=[];let stopping=false;
function stop(){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
const web=spawn(process.execPath,[path.resolve('node_modules/vite/bin/vite.js'),'--host',origin.hostname,'--port',origin.port||'5174','--strictPort'],{stdio:'inherit',env:process.env});children.push(web);
web.on('exit',code=>{stop();process.exitCode=code||0;});
web.on('error',()=>{console.error('Local web process failed.');process.exitCode=1;stop();});
for(let i=0;i<60&&!stopping;i++){
 await new Promise(resolve=>setTimeout(resolve,1000));
 try{const response=await fetch(new URL('/login',origin),{signal:AbortSignal.timeout(2000)});if(response.ok&&!stopping){
  const worker=spawn(process.execPath,[path.resolve('scripts/satellite-worker.mjs')],{stdio:'inherit',env:process.env});children.push(worker);worker.on('exit',code=>{if(!stopping){console.error('Local worker stopped; restart the local runtime.');process.exitCode=code||1;stop();}});break;
 }}catch{}
 if(i===59){console.error('Local web readiness timed out.');process.exitCode=1;stop();}
}
