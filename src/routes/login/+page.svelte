<script lang="ts">
 import {enhance} from '$app/forms';import AuthShell from '$lib/AuthShell.svelte';
 import PasswordField from '$lib/PasswordField.svelte';import {feedbackForm} from '$lib/feedback';
 let {data,form}=$props();let busy=$state(false);
 const submit=feedbackForm({pending:'Signing you in',success:'You?re signed in. Welcome back.',onBusy:value=>busy=value});
</script>
<svelte:head><title>Sign in ? Talazo Agritech</title><meta name="robots" content="noindex"/></svelte:head>
<AuthShell><p class="p-kicker">WELCOME TO YOUR WORKSPACE</p><h2>Good to have you here.</h2><p>Sign in to follow your fields and growing season.</p>
{#if form?.message}<div class="p-auth-error" role="alert">{form.message}</div>{/if}
{#if !data.configured}<div class="p-auth-error">Supabase needs to be configured before sign-in is available.</div>{/if}
<form method="POST" use:enhance={submit} aria-busy={busy}><label class="p-field">Email address<input type="email" name="email" autocomplete="username" required/></label>
<PasswordField id="login-password" name="password" label="Password"/>
<button class="p-button" disabled={busy||!data.configured}>{busy?'Signing in?':'Sign in to Talazo ?'}</button></form>
<p class="p-auth-footer">Access is by invitation. To join Talazo or recover access, contact the team who registered you. Your administrator can send a fresh secure access link.</p></AuthShell>
