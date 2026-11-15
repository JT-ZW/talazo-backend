import {test} from 'node:test';import assert from 'node:assert/strict';
import {datedAdvisory,healthShares,riskItems,nutrientItems,irrigationDays,indexDistribution,numberValue} from '../src/lib/advisory-model.mjs';
test('advice must match both requested and actual provider observation dates',()=>{
 const p={requestedDate:'20261113',value:{SensedDay:'20261112',advisory:{}}};assert.equal(datedAdvisory(p,'20261113'),null);p.value.SensedDay='20261113';assert(datedAdvisory(p,'20261113'));assert.equal(datedAdvisory(p,'20261114'),null);
});
test('health and risk percentages preserve supplied zero and never infer absent probabilities',()=>{
 assert.equal(healthShares({green:'0.00%'}).find(v=>v.key==='green')?.percent,0);assert.equal(healthShares({})[0].percent,null);
 const risks=riskItems({Weed:{potential_weeds:[{weed_name:'Black jack',probability:'high'}]}},'weeds');assert.equal(risks[0].probability,null);assert.equal(risks[0].level,'high');
});
test('nutrient doses preserve formulation units and irrigation days preserve zero and dates',()=>{
 const nutrient=nutrientItems({N:{application_rate:'33.8',source_of_N:'Ammonium nitrate'},application_rate_units:'kg/acre'})[0];assert.equal(nutrient.rate,33.8);assert.equal(nutrient.unit,'kg/acre');assert.equal(nutrient.source,'Ammonium nitrate');
 const days=irrigationDays({'20261114':{quantity:'0',time_range:', '},quantity_units:'mm'});assert.equal(days[0].quantity,0);assert.equal(days[0].time,null);assert.equal(days[0].unit,'mm');assert.equal(numberValue('Not available'),null);
});
test('index area proportions derive only from ten nonnegative provider bins',()=>{
 const bins=indexDistribution({ndvi:['5','1357','93',0,0,0,0,0,0,0]},'ndvi');assert.equal(bins[1].area,1357);assert(Math.abs(bins.reduce((n,b)=>n+b.percent,0)-100)<.00001);assert.deepEqual(indexDistribution({ndvi:[-1,1]},'ndvi'),[]);assert.deepEqual(indexDistribution({ndvi:Array(10).fill(null)},'ndvi'),[]);
});
