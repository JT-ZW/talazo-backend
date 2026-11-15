import {createServerClient} from '@supabase/ssr';
import {env} from '$env/dynamic/public';
/** Factory only; not called in sample mode. Never uses a service-role key.
 * @param {import('@sveltejs/kit').Cookies} cookies */
export function createSupabase(cookies){
 const key=env.PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.PUBLIC_SUPABASE_ANON_KEY;
 if(!env.PUBLIC_SUPABASE_URL||!key)throw new Error('Supabase is not configured');
 return createServerClient(env.PUBLIC_SUPABASE_URL,key,{
  cookies:{getAll:()=>cookies.getAll(),setAll:items=>items.forEach(({name,value,options})=>cookies.set(name,value,{...options,path:'/'}))}
 });
}
/** @param {ReturnType<typeof createSupabase>} client */
export async function verifiedIdentity(client){
 const {data,error}=await client.auth.getClaims();
 if(error||!data?.claims?.sub)throw new Error('Authentication required');
 return data.claims.sub;
}
