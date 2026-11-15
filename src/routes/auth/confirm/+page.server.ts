import {fail,redirect} from '@sveltejs/kit';
import {createSupabase} from '$lib/server/supabase';
export const load=({url}:import('@sveltejs/kit').RequestEvent)=>({token:url.searchParams.get('token_hash')||'',type:url.searchParams.get('type')||''});
export const actions={default:async({request,cookies}:import('@sveltejs/kit').RequestEvent)=>{
 const f=await request.formData();const type=String(f.get('type'));
 if(!['invite','magiclink','recovery'].includes(type))return fail(400,{message:'Invalid invitation. Ask Talazo for a new link.'});
 const client=createSupabase(cookies);
 const result=await client.auth.verifyOtp({token_hash:String(f.get('token')),type:type as 'invite'|'magiclink'|'recovery'});
 if(result.error)return fail(400,{message:'This link has expired or has already been used. Ask Talazo for a new access link.'});
 redirect(303,'/activate');
}};
