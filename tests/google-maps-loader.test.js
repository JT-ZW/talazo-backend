import {test} from 'node:test';import assert from 'node:assert/strict';
import {loadGoogleMaps} from '../src/lib/google-maps.ts';
test('Google Maps loader rejects server use and a missing key without issuing requests',async()=>{
 await assert.rejects(loadGoogleMaps('browser-key'),/browser/);
 Object.defineProperty(globalThis,'window',{value:{},configurable:true});
 try{await assert.rejects(loadGoogleMaps(''),/not configured/);}finally{Reflect.deleteProperty(globalThis,'window');}
});
test('one official SDK request serves concurrent maps, without the retired drawing library',async()=>{
 const root=/** @type {any} */({});const scripts=/** @type {any[]} */([]);
 Object.defineProperty(globalThis,'window',{value:root,configurable:true});
 Object.defineProperty(globalThis,'document',{value:{createElement:()=>({dataset:{},remove(){}}),querySelector:()=>null,head:{append:(/** @type {any} */ script)=>scripts.push(script)}},configurable:true});
 try{
  const first=loadGoogleMaps('restricted-browser-key'),second=loadGoogleMaps('restricted-browser-key');assert.equal(first,second);assert.equal(scripts.length,1);
  const url=new URL(scripts[0].src);assert.equal(url.origin,'https://maps.googleapis.com');assert.equal(url.pathname,'/maps/api/js');assert.equal(url.searchParams.get('key'),'restricted-browser-key');assert.equal(url.searchParams.get('libraries'),null);
  let imported=false;root.google={maps:{Map:class{},importLibrary:async(/** @type {string} */ library)=>{assert.equal(library,'maps');imported=true;}}};root.__talazoGoogleMapsReady();assert.equal(await first,root.google.maps);assert(imported);assert.equal(await loadGoogleMaps('restricted-browser-key'),root.google.maps);
  root.dispatchEvent=()=>true;root.gm_authFailure();await assert.rejects(loadGoogleMaps('restricted-browser-key'),/denied/);
 }finally{Reflect.deleteProperty(globalThis,'window');Reflect.deleteProperty(globalThis,'document');}
});
