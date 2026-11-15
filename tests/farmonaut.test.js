import {test} from 'node:test';
import assert from 'node:assert/strict';
import {farmonaut,ProviderError} from '../src/lib/server/farmonaut.mjs';
import {normalizeIndex,sensedMap} from '../src/lib/satellite.mjs';
test('provider test mode cannot be overridden by a browser-shaped payload',async()=>{
 let submitted={isTesting:false};
 const client=farmonaut({key:'test-private-key',fetcher:async(url,options)=>{submitted=JSON.parse(String(options?.body));assert.equal(new Headers(options?.headers).get('Authorization'),'Bearer test-private-key');return new Response(JSON.stringify({FieldID:'1'}));}});
 await client.call('submitField',{isTesting:false});assert.equal(submitted.isTesting,true);
});
test('provider body errors and invalid JSON fail closed',async()=>{
 for(const body of ['{"error":"invalid api key"}','"Field is Paused"','not json']){
  const client=farmonaut({key:'private',fetcher:async()=>new Response(body)});
  await assert.rejects(client.call('getSensedDays'),ProviderError);
 }
});
test('transport failures preserve uncertain-write semantics without exposing credentials',async()=>{
 const client=farmonaut({key:'never-print-this',fetcher:async()=>{throw new Error('network');}});
 await assert.rejects(client.call('submitField'),e=>e instanceof ProviderError&&e.uncertain&&!e.message.includes('never-print-this'));
});
test('invalid configuration and unsupported operations do not issue requests',async()=>{
 assert.throws(()=>farmonaut({key:'x',testMode:'yes'}),ProviderError);
 await assert.rejects(farmonaut({key:'x'}).call('deleteEveryField'),ProviderError);
});
test('index normalization preserves missing values and rejects invalid measurements',()=>{
 assert.equal(normalizeIndex('45'),0.45);assert.equal(normalizeIndex('0'),0);
 for(const value of [null,undefined,'','invalid',101,-1])assert.equal(normalizeIndex(value),null);
});
test('sensed-day parser supports documented and observed sample response shapes',()=>{
 const dates={'20261114':{isCloudy:false}};
 assert.deepEqual(sensedMap(dates),dates);assert.deepEqual(sensedMap({SensedDays:dates}),dates);
 assert.deepEqual(sensedMap({message:'Unavailable'}),{});assert.deepEqual(sensedMap(null),{});
});
