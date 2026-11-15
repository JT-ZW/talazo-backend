import {fail,redirect} from '@sveltejs/kit';
import {createSupabase} from '$lib/server/supabase';
import {env} from '$env/dynamic/public';
export const load=()=>({configured:Boolean(env.PUBLIC_SUPABASE_URL&&(env.PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.PUBLIC_SUPABASE_ANON_KEY))});
export const actions={default:async({request,cookies}:import('@sveltejs/kit').RequestEvent)=>{
 const f=await request.formData();const client=createSupabase(cookies);
 const {data,error}=await client.auth.signInWithPassword({email:String(f.get('email')||'').trim(),password:String(f.get('password')||'')});
 if(error)return fail(400,{message:'Sign-in failed. Check your email and password, or contact Talazo for an invitation.'});
 const role=await client.rpc('talazo_is_admin');
 const account=await client.from('talazo_accounts').select('status').eq('user_id',data.user.id).maybeSingle();
 if(role.error||(!role.data&&(account.error||!['approved','active'].includes(account.data?.status||'')))){
  await client.auth.signOut();
  return fail(403,{message:'Your account needs Talazo approval. Please contact your administrator.'});
 }
 redirect(303,role.data?'/admin/overview':'/portal/overview');
}};
