import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkLiveConnection,findRegisteredField,liveFieldEntries,fieldDetails} from '../src/lib/server/live-connection.mjs';
const zone={id:'zone-123',name:'North',boundary:{coordinates:[[[31,-17],[32,-17],[32,-18],[31,-17]]]}};
const metadata={FieldID:'123',Coordinates:{a:{Longitude:31,Latitude:-17},b:{Longitude:32,Latitude:-17},c:{Longitude:32,Latitude:-18}}};
test('live discovery verifies a uniquely named existing boundary and never submits a field',async()=>{
 const called=/** @type {string[]} */([]);const provider={call:async(/** @type {string} */endpoint)=>{called.push(endpoint);return endpoint==='getAllFieldIDs'?{'123':'Farm / North [Talazo zone-123]','456':'Unrelated field'}:{123:metadata};}};
 assert.equal(await findRegisteredField(provider,zone),'123');assert.deepEqual(called,['getAllFieldIDs','getFarmerData']);
});
test('discovery fails closed on duplicate names, missing fields, sample lists and wrong boundaries',async()=>{
 for(const fields of [{},{FieldID:'FieldName'},{123:'Talazo zone-123',456:'Talazo zone-123'}])await assert.rejects(findRegisteredField({call:async()=>fields},zone));
 await assert.rejects(findRegisteredField({call:async(/** @type {string} */endpoint)=>endpoint==='getAllFieldIDs'?{123:'Talazo zone-123'}:{123:{...metadata,Coordinates:{}}}},zone),/boundary/);
 assert.deepEqual(liveFieldEntries({}),[]);
});
test('health reports field access failure even when account usage succeeds',async()=>{
 const result=await checkLiveConnection({call:async(/** @type {string} */endpoint)=>{if(endpoint==='getAllFieldIDs')throw Error('Provider returned HTTP 500');return {remainingUnits:10};}});
 assert.equal(result[0].ok,true);assert.equal(result[1].ok,false);assert.match(result[1].message,/500/);
 const sample=await checkLiveConnection({call:async()=>({FieldID:'FieldName'})});assert.equal(sample[1].ok,false);
});
test('field details preserve the unique reconciliation marker without sharing login credentials',()=>{
 assert.deepEqual(fieldDetails(zone,{name:'Imla',district:'Mutasa'}),{FieldDescription:'Imla / North [Talazo zone-123]',FieldAddress:'Mutasa'});
});
