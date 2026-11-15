import {test} from 'node:test';import assert from 'node:assert/strict';import {removeMapListeners} from '../src/lib/map-lifecycle.mjs';
test('partial Google initialization cannot crash cleanup or prevent remaining listeners being removed',()=>{
 let removed=0;assert.doesNotThrow(()=>removeMapListeners([undefined,null,{}, {remove(){throw Error('Partial SDK handle');}},{remove(){removed++;}}]));assert.equal(removed,1);
});
