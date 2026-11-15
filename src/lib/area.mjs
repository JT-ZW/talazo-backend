/** Approximate spherical polygon area in square metres. PostGIS supplies the
 * authoritative ellipsoidal area on save. @param {unknown} value */
export function previewArea(value) {
 try {
  const shape=typeof value==='string'?JSON.parse(value):value;
  const polygon=/** @type {any} */(shape);
  if(polygon?.type!=='Polygon'||polygon.coordinates?.length!==1)return null;
  const ring=polygon.coordinates[0];
  if(!Array.isArray(ring)||ring.length<4||ring.length>501||ring.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>90))return null;
  const last=ring.at(-1);if(ring[0][0]!==last[0]||ring[0][1]!==last[1])return null;
  const cross=(/** @type {number[]} */ a,/** @type {number[]} */ b,/** @type {number[]} */ c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  // Crossing segments produce invalid drawn polygons, not a misleading area.
  for(let i=0;i<ring.length-1;i++)for(let j=i+2;j<ring.length-1;j++){
   if(i===0&&j===ring.length-2)continue;
   if(cross(ring[i],ring[i+1],ring[j])*cross(ring[i],ring[i+1],ring[j+1])<0&&cross(ring[j],ring[j+1],ring[i])*cross(ring[j],ring[j+1],ring[i+1])<0)return null;
  }
  const rad=Math.PI/180;let sum=0;
  for(let i=0;i<ring.length-1;i++){
   let delta=(ring[i+1][0]-ring[i][0])*rad;
   if(delta>Math.PI)delta-=2*Math.PI;if(delta< -Math.PI)delta+=2*Math.PI;
   sum+=delta*(2+Math.sin(ring[i][1]*rad)+Math.sin(ring[i+1][1]*rad));
  }
  const area=Math.abs(sum)*6371008.8**2/2;
  return area>0&&Number.isFinite(area)?area:null;
 }catch{return null;}
}
