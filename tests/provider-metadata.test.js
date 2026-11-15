import {test} from 'node:test';import assert from 'node:assert/strict';
import {providerField} from '../src/lib/server/provider-metadata.mjs';
/** @type {()=>any} */
const field=()=>({FieldID:'123',FieldDescription:'Example field',CropCode:'16',SowingDate:'1790812800',Coordinates:{P_1:{Longitude:'31',Latitude:'-17'},P_2:{Longitude:31.001,Latitude:-17},a:{Longitude:31,Latitude:-17.001}},Email:'private@example.invalid',FarmerPhoneNumber:'private',UID:'private',Weather:{private:true}});
test('provider metadata accepts documented/live coordinate shapes without copying contacts or accounts',()=>{
 const a=providerField({'123':field()},'123');assert.equal(a.sowing_date,'2026-10-01');assert.deepEqual(a.boundary.coordinates[0][0],[31,-17]);assert.deepEqual(a.boundary.coordinates[0].at(-1),[31,-17]);assert.equal(a.remote_state,'unknown');
 for(const key of ['Email','FarmerPhoneNumber','UID','Weather'])assert.equal(key in a,false);
 assert.equal(a.fingerprint,providerField(field(),'123').fingerprint);
});
test('provider identity, invalid dates and incomplete or out-of-range polygons fail closed',()=>{
 /** @type {((f:any)=>void)[]} */
 const changes=[f=>f.FieldID='456',f=>f.SowingDate='20260230',f=>f.SowingDate='20990101',f=>f.Coordinates.P_1.Longitude='',f=>f.Coordinates.P_1.Latitude=100,f=>f.Coordinates={},f=>f.SensedDays={'{SatelliteVisitDate}':'yes'}];
 for(const mutate of changes){const f=field();mutate(f);assert.throws(()=>providerField(f,'123'));}
});
test('only explicit provider pause/expiry flags establish those states',()=>{
 const f=field();f.Paused='yes';assert.equal(providerField(f,'123').remote_state,'paused');f.Expired='yes';assert.equal(providerField(f,'123').remote_state,'expired');f.Expired='no';f.Paused='no';assert.equal(providerField(f,'123').remote_state,'active');
});
