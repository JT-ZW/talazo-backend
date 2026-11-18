<script lang="ts">
 import {onMount} from 'svelte';import {goto} from '$app/navigation';
 import {createBrowserClient} from '@supabase/ssr';import * as env from '$app/env/public';
 import AuthShell from '#lib/AuthShell.svelte';
 let message=$state('Confirming your secure access link…');
 onMount(()=>{
  async function activate(){
   const key=env.PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.PUBLIC_SUPABASE_ANON_KEY;
   if(!env.PUBLIC_SUPABASE_URL||!key){message='Account access is not configured. Please contact Talazo.';return;}
   // Native invitations return implicit tokens; the SSR client otherwise uses
   // PKCE. Install the returned session explicitly, then remove URL secrets.
   const fragment=new URLSearchParams(window.location.hash.slice(1));
   const access_token=fragment.get('access_token');const refresh_token=fragment.get('refresh_token');
   window.history.replaceState(null,'',window.location.pathname);
   const client=createBrowserClient(env.PUBLIC_SUPABASE_URL,key,{auth:{detectSessionInUrl:false}});
   const {data,error}=access_token&&refresh_token?await client.auth.setSession({access_token,refresh_token}):await client.auth.getSession();
   if(error||!data.session){message='This link has expired or could not be confirmed. Ask Talazo for a fresh access link.';return;}
   await goto('/activate',{replaceState:true,invalidateAll:true});
  }
  activate().catch(()=>message='The access link could not be confirmed. Please contact Talazo.');
 });
</script>
<svelte:head><title>Confirming access · Talazo</title><meta name="robots" content="noindex,nofollow"/></svelte:head>
<AuthShell><p class="p-kicker">SECURE ACCOUNT ACCESS</p><h2>Welcome to Talazo.</h2><p role="status">{message}</p><a href="/login">Return to sign-in</a></AuthShell>
