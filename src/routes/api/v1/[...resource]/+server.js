import {json} from '@sveltejs/kit';
function unavailable(){return json({error:{code:'INTEGRATION_NOT_ENABLED',message:'This service is currently unavailable.',request_id:crypto.randomUUID()}},{status:503});}
export const GET=unavailable;export const POST=unavailable;export const PATCH=unavailable;export const DELETE=unavailable;
