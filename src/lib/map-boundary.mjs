/** @param {unknown} value @returns {value is {lat:number,lng:number}} */
export function validPoint(value){const p=/** @type {any} */(value);return !!p&&typeof p.lat==='number'&&typeof p.lng==='number'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;}
/** @param {{lat:number,lng:number}[]} points */
export function boundaryJSON(points){if(points.length<3)return '';if(points.length>500||!points.every(validPoint))throw Error('Use 3 to 500 valid corners.');const ring=points.map(p=>[p.lng,p.lat]);ring.push([...ring[0]]);return JSON.stringify({type:'Polygon',coordinates:[ring]});}
/** @param {string} text @returns {{lat:number,lng:number}[]} */
export function parseBoundary(text){
 const geo=JSON.parse(text),ring=geo?.coordinates?.[0];
 if(geo.type!=='Polygon'||geo.coordinates.length!==1||!Array.isArray(ring)||ring.length<4||ring.length>501)throw Error('Use a closed GeoJSON Polygon with 3 to 500 corners and no holes.');
 const points=ring.map((/** @type {unknown} */ row)=>{if(!Array.isArray(row)||row.length!==2)throw Error('Each corner needs longitude and latitude.');const p={lat:row[1],lng:row[0]};if(!validPoint(p))throw Error('Boundary coordinates are outside the valid range.');return p;});
 if(points[0].lat!==points.at(-1)?.lat||points[0].lng!==points.at(-1)?.lng)throw Error('The GeoJSON boundary must be closed.');return points.slice(0,-1);
}
/** Typed coordinates use latitude first, unlike GeoJSON. @param {string} text */
export function parseCorners(text){
 const rows=text.trim().split(/\n+/).map(row=>row.trim().split(/[\s,;]+/));
 if(rows.length<3||rows.length>501)throw Error('Enter 3 to 500 corners, one latitude, longitude pair per line.');
 const points=rows.map(row=>{if(row.length!==2||row.some(v=>!v.trim()))throw Error('Each line needs a latitude and longitude.');const p={lat:Number(row[0]),lng:Number(row[1])};if(!validPoint(p))throw Error('Enter valid decimal latitude and longitude.');return p;});
 if(points.length>3&&points[0].lat===points.at(-1)?.lat&&points[0].lng===points.at(-1)?.lng)points.pop();if(points.length>500)throw Error('Use at most 500 corners.');return points;
}
