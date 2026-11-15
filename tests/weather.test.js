import {test} from 'node:test';
import assert from 'node:assert/strict';
import {celsius,weatherDays,weatherPoint} from '../src/lib/weather.mjs';
test('normal forecasts convert Kelvin and probability while preserving absent readings',()=>{
 const day={dt:1794614400,temp:{max:300.15,min:280.15},pop:0.42,weather:[{description:'light rain'}]};
 const [value]=weatherDays({normal:{daily:[day]}});
 assert.equal(value.max,27);assert.equal(value.min,7);assert.equal(value.probability,42);
 assert.equal(value.rain,null);assert.equal(value.wind,null);assert.equal(celsius(null),null);
 assert.equal(weatherDays({daily:[{...day,rain:0}]} )[0].rain,0);
 assert.deepEqual(weatherDays({error:'unavailable'}),[]);
});
test('weather location derives from saved field geometry with correct latitude order',()=>{
 assert.deepEqual(weatherPoint({coordinates:[[[31,-17],[32,-17],[32,-18],[31,-17]]]}),{Latitude:'-17.5',Longitude:'31.5'});
 assert.throws(()=>weatherPoint({coordinates:[[[200,-17],[31,-17],[31,-18],[200,-17]]]}));
});
