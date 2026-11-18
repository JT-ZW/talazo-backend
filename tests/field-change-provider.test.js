import {test} from 'node:test';import assert from 'node:assert/strict';import {synchronizeFieldChange} from '../src/lib/server/field-change-provider.mjs';
const boundary={type:'Polygon',coordinates:[[[31,-17],[31.001,-17],[31.001,-17.001],[31,-17.001],[31,-17]]]};
const old={boundary,crop_code:'16',sowing_date:'2026-10-01'},desired={boundary,crop_code:'6',sowing_date:'2026-10-10'};
function fake(fail=false){let crop='16',date='2026-10-01';const calls=/** @type {string[]} */([]);return {calls,async call(/** @type {string} */ name,/** @type {any} */ body){calls.push(name);if(name==='updateCropCode'){crop=body.CropCode;return 'changed';}if(name==='updateSowingDate'){if(fail)throw Error('timeout');date=new Date(Number(body.SowingDate)*1000).toISOString().slice(0,10);return 'changed';}return {FieldID:'1234',FieldDescription:'QA',CropCode:crop,SowingDate:date,Coordinates:Object.fromEntries(boundary.coordinates[0].slice(0,-1).map((p,i)=>[i,{Longitude:p[0],Latitude:p[1]}]))};}};}
test('field updates read back authoritative values and reconciliation issues no writes',async()=>{
 const p=fake(),change={provider_id:'1234',previous:old,desired};assert.equal((await synchronizeFieldChange(p,change)).crop_code,'6');assert.deepEqual(p.calls,['getFarmerData','updateCropCode','updateSowingDate','getFarmerData']);
 p.calls.length=0;await synchronizeFieldChange(p,change,true);assert.deepEqual(p.calls,['getFarmerData']);
});
test('a partial write is not blindly repeated during reconciliation',async()=>{
 const p=fake(true),change={provider_id:'1234',previous:old,desired};await assert.rejects(()=>synchronizeFieldChange(p,change),/timeout/);p.calls.length=0;await assert.rejects(()=>synchronizeFieldChange(p,change,true),/not confirmed/);assert.deepEqual(p.calls,['getFarmerData']);
});
