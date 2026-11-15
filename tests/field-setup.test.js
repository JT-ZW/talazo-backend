import {test} from 'node:test';
import assert from 'node:assert/strict';
import {standardCrop} from '../src/lib/crops.mjs';
import {previewArea} from '../src/lib/area.mjs';
test('farmer wording is preserved while known crop aliases use one standard',()=>{
 assert.deepEqual(standardCrop('  SOYA   beans  '),{entered:'SOYA beans',code:'11',name:'Soybean',review:false});
 assert.equal(standardCrop('corn').code,'6');assert.equal(standardCrop('groundnuts').name,'Groundnut');
 assert.equal(standardCrop('millet').review,true);assert.equal(standardCrop('Unknown crop variety').code,'999');
 assert.equal(standardCrop('Maize variety X',[{code:'6',name:'Maize',aliases:['maize variety x']}]).review,false);
});
test('live polygon area is orientation independent and invalid drawings have no estimate',()=>{
 const ring=[[31,-17],[31.001,-17],[31.001,-17.001],[31,-17.001],[31,-17]];
 const polygon={type:'Polygon',coordinates:[ring]};const area=previewArea(polygon);
 const reversed=previewArea({type:'Polygon',coordinates:[[...ring].reverse()]});
 if(area===null||reversed===null)throw new Error('Valid geometry must have an area estimate');
 assert(area>11000&&area<12500);assert(Math.abs(area-reversed)<0.01);
 assert.equal(previewArea('not json'),null);
 assert.equal(previewArea({type:'Polygon',coordinates:[[[31,-17],[32,-18],[31,-18],[32,-17],[31,-17]]]}),null);
 assert.equal(previewArea({type:'Polygon',coordinates:[[[31,-17],[32,-17],[32,-18]]]}),null);
});
