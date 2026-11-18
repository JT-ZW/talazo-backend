import {PNG} from 'pngjs';
/** @param {number} lat */
const mercator=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
/** @param {number} y */
const latitude=y=>(2*Math.atan(Math.exp(y))-Math.PI/2)*180/Math.PI;
/** @param {number} x @param {number} y @param {number[][]} ring */
export function insideField(x,y,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
/** Reject unrelated, unknown or rotated rasters rather than guessing alignment.
 * @param {ArrayBuffer} buffer @param {any} boundary */
export async function georasterOverlay(buffer,boundary){
 const {fromArrayBuffer}=await import('geotiff');
 const tiff=await fromArrayBuffer(buffer),image=await tiff.getImage();
 if(image.getWidth()*image.getHeight()>25000000)throw Error('GeoTIFF is too large for this viewer.');
 const keys=image.getGeoKeys()||{},directory=image.fileDirectory;
 const geographic=Number(keys.GeographicTypeGeoKey)===4326&&!keys.ProjectedCSTypeGeoKey;
 const projected=Number(keys.ProjectedCSTypeGeoKey)===3857;
 if(!geographic&&!projected)throw Error('This raster needs a supported reprojection before it can be mapped. Download its GeoTIFF for GIS review.');
 if(directory.hasTag('ModelTransformation'))throw Error('Rotated rasters require a separate reprojection.');
 const resolution=image.getResolution();if(resolution[0]<=0||resolution[1]>=0)throw Error('Raster orientation could not be verified.');
 const photo=Number(directory.getValue('PhotometricInterpretation'));
 if(![2,3].includes(photo))throw Error('The provider supplied a numeric raster without a verified colour scale. Its values will not be assigned invented colours.');
 const box=image.getBoundingBox();
 const bounds=geographic?{west:box[0],south:box[1],east:box[2],north:box[3]}:{west:box[0]/6378137*180/Math.PI,south:latitude(box[1]/6378137),east:box[2]/6378137*180/Math.PI,north:latitude(box[3]/6378137)};
 const ring=boundary?.coordinates?.[0];
 if(!Array.isArray(ring)||ring.length<4||!Object.values(bounds).every(Number.isFinite)||bounds.west>=bounds.east||bounds.south>=bounds.north||Math.abs(bounds.north)>85||Math.abs(bounds.south)>85)throw Error('Raster bounds could not be verified.');
 const west=Math.min(...ring.map(p=>p[0])),east=Math.max(...ring.map(p=>p[0])),south=Math.min(...ring.map(p=>p[1])),north=Math.max(...ring.map(p=>p[1]));
 const tolerance=0.00001;
 if(bounds.west>west+tolerance||bounds.east<east-tolerance||bounds.south>south+tolerance||bounds.north<north-tolerance||(bounds.east-bounds.west)>10*(east-west)||(bounds.north-bounds.south)>10*(north-south))throw Error('Raster bounds do not correspond to the selected field.');
 const width=Math.min(512,image.getWidth()),height=Math.min(512,image.getHeight());
 const rgb=await image.readRGB({width,height,interleave:true,enableAlpha:true});
 const channels=rgb.length/(width*height);
 if(!(rgb instanceof Uint8Array)||![3,4].includes(channels))throw Error('Unsupported provider colour encoding.');
 const png=new PNG({width,height});
 const top=mercator(bounds.north),bottom=mercator(bounds.south);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const lat=latitude(top-(y+.5)/height*(top-bottom)),lng=bounds.west+(x+.5)/width*(bounds.east-bounds.west);
  const sourceY=geographic?Math.min(height-1,Math.max(0,Math.floor((bounds.north-lat)/(bounds.north-bounds.south)*height))):y;
  const source=(sourceY*width+x)*channels,target=(y*width+x)*4;
  png.data[target]=rgb[source];png.data[target+1]=rgb[source+1];png.data[target+2]=rgb[source+2];png.data[target+3]=insideField(lng,lat,ring)?(channels===4?rgb[source+3]:255):0;
 }
 return {url:'data:image/png;base64,'+PNG.sync.write(png).toString('base64'),bounds,projection:'EPSG:3857',source:'Farmonaut GeoTIFF',width,height};
}
/** Known provider asset hosts only; bounded redirects, bytes and deadline.
 * @param {string} url @param {typeof fetch} [fetcher] */
export async function readProviderRaster(url,fetcher=fetch){
 let target=new URL(url);const signal=AbortSignal.timeout(20000);
 for(let hop=0;hop<4;hop++){
  if(target.protocol!=='https:'||target.username||target.password||!['storage.googleapis.com','farmonaut.com','www.farmonaut.com'].includes(target.hostname))throw Error('Unsupported provider raster host.');
  const response=await fetcher(target,{redirect:'manual',signal});
  if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');await response.body?.cancel();if(!location)throw Error('Invalid asset redirect');target=new URL(location,target);continue;}
  if(!response.ok||!response.body)throw Error('Provider GeoTIFF is not ready. Please retry later.');
  if(Number(response.headers.get('content-length'))>20000000){await response.body.cancel();throw Error('Raster exceeds the safe viewer size.');}
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>20000000)throw Error('Raster exceeds the safe viewer size.');chunks.push(item.value);}}finally{await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes.buffer;
 }
 throw Error('Provider asset redirect could not be verified.');
}
