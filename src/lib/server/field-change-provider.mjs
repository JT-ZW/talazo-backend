import {providerField} from './provider-metadata.mjs';import {matchesRegisteredBoundary} from './farmonaut.mjs';
/** @param {any} field @param {any} target */
function matches(field,target){return field.crop_code===target.crop_code&&field.sowing_date===target.sowing_date&&matchesRegisteredBoundary({FieldID:field.provider_id,Coordinates:Object.fromEntries(field.boundary.coordinates[0].slice(0,-1).map((/** @type {number[]} */ point,/** @type {number} */ i)=>[String(i),{Longitude:point[0],Latitude:point[1]}]))},field.provider_id,target.boundary.coordinates[0].slice(0,-1));}
/** Reads verify the provider outcome; reconciliation never repeats a write.
 * @param {any} client @param {any} change @param {boolean} [reconcile] */
export async function synchronizeFieldChange(client,change,reconcile=false){
 const read=async()=>providerField(await client.call('getFarmerData',{FieldID:change.provider_id}),change.provider_id);
 let field=await read();
 if(matches(field,change.desired))return field;
 if(reconcile)throw Error('Provider has not confirmed every requested change.');
 if(!matches(field,change.previous))throw Error('Provider changed since this request; reconcile before writing.');
 if(change.previous.crop_code!==change.desired.crop_code)await client.call('updateCropCode',{FieldID:change.provider_id,CropCode:change.desired.crop_code});
 if(change.previous.sowing_date!==change.desired.sowing_date&&change.desired.sowing_date)await client.call('updateSowingDate',{FieldID:change.provider_id,SowingDate:String(Date.parse(change.desired.sowing_date+'T00:00:00Z')/1000)});
 if(JSON.stringify(change.previous.boundary)!==JSON.stringify(change.desired.boundary))await client.call('modifyFieldPoints',{FieldID:change.provider_id,Points:change.desired.boundary.coordinates[0].slice(0,-1)});
 field=await read();if(!matches(field,change.desired))throw Error('Provider read-back does not match the approved change.');return field;
}
