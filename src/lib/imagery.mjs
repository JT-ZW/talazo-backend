export const imageLayers=[['ndvi','Vegetation / NDVI'],['tci','True colour'],['ndmi','Canopy moisture / NDMI'],['ndre','Red edge / NDRE'],['ndwi','Water index / NDWI'],['evi','Enhanced vegetation / EVI'],['savi','Soil-adjusted / SAVI'],['rvi','Radar vegetation / RVI'],['rsm','Radar moisture / RSM'],['soc','Organic carbon / SOC']];
/** @param {any} value @param {boolean} [radar] */
export function imageDates(value,radar=false){const v=value?.[radar?'SARDays':'SensedDays']||value;return v&&typeof v==='object'?Object.keys(v).filter(k=>/^\d{8}$/.test(k)).sort().reverse():[];}
/** @param {string} topic */
export const defaultLayer=topic=>topic==='soil'?'soc':topic==='nutrients'?'ndre':topic==='irrigation'?'ndmi':'ndvi';
/** @param {string} topic */
export const imageContext=topic=>({pests:'Vegetation context for scouting. This layer does not locate or identify pests.',weeds:'Vegetation context for scouting. This layer is not a confirmed weed map.',nutrients:'Red-edge vegetation context. This layer does not measure soil N, P or K.',irrigation:'Satellite moisture context, not a measured soil-moisture percentage or irrigation prescription.',yield:'Vegetation context for the yield advisory, not a pixel-level harvest forecast.'}[topic]||'Dated provider imagery. Review field conditions and observation quality alongside the colours.');
