import {json} from '@sveltejs/kit';
import {identity} from '$lib/server/pilot';
import {reconcileProviderAccount} from '$lib/server/provider-account';
export async function POST(event:import('@sveltejs/kit').RequestEvent){
 if(event.request.headers.get('origin')!==event.url.origin)return json({message:'Same-origin request required.'},{status:403});
 await identity(event,true);
 try{const body=await event.request.json();return json(await reconcileProviderAccount(body?.force===true));}
 catch{return json({message:'Farmonaut account refresh failed. Existing fields and ownership have been retained.'},{status:503});}
}
