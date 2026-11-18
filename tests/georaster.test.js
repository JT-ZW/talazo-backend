import {test} from 'node:test';import assert from 'node:assert/strict';import {writeArrayBuffer} from 'geotiff';import {georasterOverlay,insideField,readProviderRaster} from '../src/lib/server/georaster.mjs';import {PNG} from 'pngjs';
const boundary={type:'Polygon',coordinates:[[[31,-17],[31.001,-17],[31.001,-17.001],[31,-17.001],[31,-17]]]};
test('georeferenced colour raster retains real colours, orientation and bounds',async()=>{
 const buffer=await writeArrayBuffer(new Uint8Array([255,0,0,0,255,0,0,0,255,255,255,0]),{width:2,height:2,PhotometricInterpretation:2,SamplesPerPixel:3,BitsPerSample:[8,8,8],ModelPixelScale:[.0005,.0005,0],ModelTiepoint:[0,0,0,31,-17,0],GeographicTypeGeoKey:4326});
 const output=await georasterOverlay(buffer,boundary);assert.equal(output.bounds.west,31);assert.equal(output.bounds.north,-17);
 const png=PNG.sync.read(Buffer.from(output.url.split(',')[1],'base64'));assert.deepEqual([...png.data.slice(0,4)],[255,0,0,255]);
 await assert.rejects(()=>georasterOverlay(buffer,{type:'Polygon',coordinates:[[[32,-17],[32.001,-17],[32.001,-17.001],[32,-17.001],[32,-17]]]}),/bounds/);
 assert(insideField(31.0005,-17.0005,boundary.coordinates[0]));assert(!insideField(32,-17,boundary.coordinates[0]));
});
test('raster downloads reject private hosts and oversized responses',async()=>{
 await assert.rejects(()=>readProviderRaster('http://127.0.0.1/test'),/host/);
 await assert.rejects(()=>readProviderRaster('https://storage.googleapis.com/test',async()=>new Response('x',{headers:{'content-length':'20000001'}})),/size/);
});
