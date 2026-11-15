import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activeInsightZoneIds,isInsightPage} from '../src/lib/insight-pages.mjs';
test('crop pages activate only for accessible active mapped fields in the current environment',()=>{
 const farms=[{id:'farm-a'}];const zones=[{id:'a',farm_id:'farm-a'},{id:'b',farm_id:'missing-farm'}];
 for(const status of ['requested','registering','uncertain','awaiting','paused','error']){
  assert.deepEqual(activeInsightZoneIds(farms,zones,[{zone_id:'a',status,provider_id:'1',environment:'test'}],'test'),[]);
 }
 assert.deepEqual(activeInsightZoneIds(farms,zones,[{zone_id:'a',status:'active',provider_id:'1',environment:'test'},{zone_id:'b',status:'active',provider_id:'2',environment:'test'}],'test'),['a']);
 assert.deepEqual(activeInsightZoneIds(farms,zones,[{zone_id:'a',status:'active',provider_id:'1',environment:'live'}],'test'),[]);
 assert.deepEqual(activeInsightZoneIds(farms,zones,[{zone_id:'a',status:'active',provider_id:null,environment:'test'}],'test'),[]);
 for(const page of ['health','pests','weeds','nutrients','irrigation','yield'])assert.equal(isInsightPage(page),true);
 assert.equal(isInsightPage('unknown'),false);
});
