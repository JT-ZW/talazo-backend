import {test} from 'node:test';import assert from 'node:assert/strict';import {loadGoogleMaps} from '../src/lib/google-maps.ts';
test('authorization failure during SDK loading rejects pending requests and later retries',async()=>{
 const root=/** @type {any} */({dispatchEvent:()=>true});
 Object.defineProperty(globalThis,'window',{value:root,configurable:true});
 Object.defineProperty(globalThis,'document',{value:{createElement:()=>({dataset:{},remove(){}}),querySelector:()=>null,head:{append(){}}},configurable:true});
 try{const request=loadGoogleMaps('restricted-browser-key');root.gm_authFailure();await assert.rejects(request,/denied/);await assert.rejects(loadGoogleMaps('restricted-browser-key'),/denied/);}
 finally{Reflect.deleteProperty(globalThis,'window');Reflect.deleteProperty(globalThis,'document');}
});
