import {test} from 'node:test';import assert from 'node:assert/strict';import {ndviDrop} from '../src/lib/alerts.mjs';
test('drop alerts require two usable dated observations and retain real zero values',()=>{
 const p=/** @type {any} */({getSensedDays:{value:{20261113:'yes',20261108:'yes'}},getAllIndexValues:{value:{ndvi:{20261113:'0',20261108:'60'}}}});
 const alert=ndviDrop(p,.15);assert(alert);assert.equal(alert.current,0);assert.equal(alert.previous,.6);
 p.getSensedDays.value['20261113']={isCloudy:true};assert.equal(ndviDrop(p,.15),null);
 assert.equal(ndviDrop({},.15),null);
});
