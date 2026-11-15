import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseCorners,parseBoundary,boundaryJSON,validPoint} from '../src/lib/map-boundary.mjs';import {previewArea} from '../src/lib/area.mjs';
test('typed latitude/longitude converts to closed longitude/latitude GeoJSON without changing area',()=>{
 const points=parseCorners('-17.8000, 31.0500\n-17.8010, 31.0500\n-17.8010, 31.0510');const json=boundaryJSON(points);assert.deepEqual(JSON.parse(json).coordinates[0][0],[31.05,-17.8]);assert.deepEqual(parseBoundary(json),points);assert((previewArea(json)||0)>0);assert.equal(boundaryJSON(points.slice(0,2)),'');
});
test('corner import handles a repeated closing corner but rejects missing and out-of-range coordinates',()=>{
 assert.equal(parseCorners('-17,31\n-18,31\n-18,32\n-17,31').length,3);
 for(const text of ['-17,\n-18,31\n-18,32','-91,31\n-18,31\n-18,32','-17,181\n-18,31\n-18,32','-17,31'])assert.throws(()=>parseCorners(text));assert.equal(validPoint({lat:0,lng:0}),true);assert.equal(validPoint({lat:'0',lng:0}),false);
});
test('GeoJSON rejects open rings and holes instead of silently changing a field',()=>{
 const ring=[[31,-17],[31,-18],[32,-18],[31,-17]];
 assert.throws(()=>parseBoundary(JSON.stringify({type:'Polygon',coordinates:[ring.slice(0,3)]})));assert.throws(()=>parseBoundary(JSON.stringify({type:'Polygon',coordinates:[ring,ring]})));assert.throws(()=>parseBoundary(JSON.stringify({type:'Polygon',coordinates:[[[31,-17],[31,-18],[32,-18],[32,-17]]]})));
});
