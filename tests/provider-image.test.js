import {test} from 'node:test';import assert from 'node:assert/strict';import {verifyProviderImage} from '../src/lib/server/provider-image.mjs';
test('image links must return actual image content before being reported ready',async()=>{
 await verifyProviderImage('https://lh3.googleusercontent.com/field',async()=>new Response(null,{status:200,headers:{'Content-Type':'image/png'}}));
 await assert.rejects(verifyProviderImage('https://lh3.googleusercontent.com/field',async()=>new Response(null,{status:400})),/HTTP 400/);
 await assert.rejects(verifyProviderImage('https://lh3.googleusercontent.com/field',async()=>new Response(null,{status:200,headers:{'Content-Type':'text/html'}})),/did not return an image/);
});
test('image verification does not follow redirects to private or untrusted hosts',async()=>{
 let calls=0;
 await assert.rejects(verifyProviderImage('https://lh3.googleusercontent.com/field',async()=>{calls++;return new Response(null,{status:302,headers:{Location:'http://127.0.0.1/private'}});}),/not supported/);
 assert.equal(calls,1);
});
