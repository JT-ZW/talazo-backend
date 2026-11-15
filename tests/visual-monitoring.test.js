import {test} from 'node:test';import assert from 'node:assert/strict';
import {calendarDays,shiftMonth,validDate,todayISO} from '../src/lib/calendar.mjs';
import {imageDates,defaultLayer,imageContext} from '../src/lib/imagery.mjs';
import {matchesRegisteredBoundary} from '../src/lib/server/farmonaut.mjs';
test('calendar validates real dates and handles leap years and year transitions',()=>{
 assert.equal(validDate('2024-02-29'),true);assert.equal(validDate('2026-02-29'),false);assert.equal(validDate('2026-13-01'),false);
 const days=calendarDays('2026-11');assert.equal(days.length,42);assert.equal(days[0],'2026-10-26');assert(days.includes('2026-11-30'));
 assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2026-01',-1),'2025-12');assert.match(todayISO(),/^\d{4}-\d{2}-\d{2}$/);
});
test('image observation dates distinguish radar and optical and ignore placeholders',()=>{
 assert.deepEqual(imageDates({SARDays:{'20261114':'yes','{RadarVisitDate}':'yes'}},true),['20261114']);
 assert.deepEqual(imageDates({SensedDays:{'20261110':{},'20261114':{}}}),['20261114','20261110']);
 assert.equal(defaultLayer('nutrients'),'ndre');assert.equal(defaultLayer('irrigation'),'ndmi');assert.match(imageContext('pests'),/does not locate/);
});
test('live mappings require matching real provider identity and submitted boundary',()=>{
 const points=[[31,-17],[31.001,-17],[31.001,-17.001]];
 const field={FieldID:'123456789',Coordinates:Object.fromEntries(points.map(([Longitude,Latitude],i)=>[i,{Longitude,Latitude}]))};
 assert(matchesRegisteredBoundary({'123456789':field},'123456789',points));
 assert.equal(matchesRegisteredBoundary({'123456789':{...field,SensedDays:{'{SatelliteVisitDate}':'yes'}}},'123456789',points),false);
 assert.equal(matchesRegisteredBoundary({'123456789':field},'123456789',[[30,-17],[30.001,-17],[30,-17.001]]),false);
 assert.equal(matchesRegisteredBoundary({'123456789':{...field,FieldID:'other'}},'123456789',points),false);
});
