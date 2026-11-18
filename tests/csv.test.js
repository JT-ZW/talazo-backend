import {test} from 'node:test';import assert from 'node:assert/strict';import {csv,csvCell} from '../src/lib/csv.mjs';
test('CSV exports escape delimiters, quotes and spreadsheet formulas',()=>{assert.equal(csvCell('Field "A", north'),'"Field ""A"", north"');assert.equal(csvCell(' =1+1'),'"\' =1+1"');assert.equal(csv([[0,null]]),'"0",""');});
