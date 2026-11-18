import {test} from 'node:test';import assert from 'node:assert/strict';import {freshness} from '../src/lib/freshness.mjs';
test('retrieval freshness distinguishes missing, stale and failed updates without inventing an acquisition date',()=>{
 const now=Date.parse('2026-11-18T12:00:00Z');
 assert.equal(freshness(null,null,now).state,'waiting');
 assert.equal(freshness('invalid',null,now).state,'waiting');
 assert.equal(freshness('2026-11-18T11:00:00Z',null,now).state,'current');
 assert.equal(freshness('2026-11-17T11:00:00Z',null,now).state,'stale');
 assert.equal(freshness('2026-11-18T11:00:00Z','failed',now).state,'warning');
});
