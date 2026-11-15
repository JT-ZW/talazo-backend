import {farmonaut} from '../src/lib/server/farmonaut.mjs';
try {
 const client=farmonaut({key:process.env.FARMONAUT_API_KEY||'',testMode:'true'});
 const value=await client.call('getMyUsage');
 console.log(JSON.stringify({connected:true,testMode:true,responseType:typeof value,fields:value&&typeof value==='object'?Object.keys(value):[],note:'Sample response only; does not verify live entitlement or quota.'},null,2));
} catch(e) {console.error(JSON.stringify({connected:false,error:e.message}));process.exitCode=1;}
