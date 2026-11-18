import {test} from 'node:test';
import assert from 'node:assert/strict';
import {celsius,weatherDays,weatherPoint} from '../src/lib/weather.mjs';
test('normal forecasts convert Kelvin and probability while preserving absent readings',()=>{
 const day={dt:1794614400,temp:{max:300.15,min:280.15},pop:0.42,weather:[{description:'light rain'}]};
 const [value]=weatherDays({normal:{daily:[day]}});
 assert.equal(value.max,27);assert.equal(value.min,7);assert.equal(value.probability,42);
 assert.equal(value.rain,0);assert.equal(value.wind,null);assert.equal(celsius(null),null);
 assert.equal(weatherDays({daily:[{...day,rain:0}]} )[0].rain,0);
 assert.deepEqual(weatherDays({error:'unavailable'}),[]);
});
test('weather location derives from saved field geometry with correct latitude order',()=>{
 assert.deepEqual(weatherPoint({coordinates:[[[31,-17],[32,-17],[32,-18],[31,-17]]]}),{Latitude:'-17.5',Longitude:'31.5'});
 assert.throws(()=>weatherPoint({coordinates:[[[200,-17],[31,-17],[31,-18],[200,-17]]]}));
});

test('zero readings survive normalization and malformed values remain unavailable',()=>{
 const row={dt:1794614400,temp:{max:273.15,min:273.15},rain:0,pop:0,humidity:0,wind_speed:0,weather:[{id:800}]};
 const [d]=weatherDays({normal:{daily:[row]}});assert.equal(d.max,0);assert.equal(d.min,0);assert.equal(d.rain,0);assert.equal(d.probability,0);assert.equal(d.humidity,0);assert.equal(d.wind,0);assert.equal(d.icon,'sun');
 for(const value of [null,'',NaN,-1])assert.equal(weatherDays({daily:[{...row,rain:value}]} )[0].rain,null);
 assert.equal(weatherDays({daily:[{...row,weather:[{id:501}]}]})[0].icon,'rain');
});
