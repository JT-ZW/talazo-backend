<script lang="ts">
 import {enhance} from '$app/forms';import AuthShell from '$lib/AuthShell.svelte';
 import PasswordField from '$lib/PasswordField.svelte';import {feedbackForm} from '$lib/feedback';
 let {data,form}=$props();let busy=$state(false);
 const submit=feedbackForm({pending:'Saving your password',success:'Your password is saved.',onBusy:value=>busy=value,resetOnSuccess:true});
</script>
<svelte:head><title>Set your password ? Talazo</title><meta name="robots" content="noindex,nofollow"/></svelte:head>
<AuthShell><p class="p-kicker">MAKE YOURSELF AT HOME</p><h2>Secure your dashboard.</h2><p>Choose a password for {data.email}.</p>
{#if form?.message && !form?.redirectTo}<div class="p-auth-error" role="alert">{form.message}</div>{/if}
<form method="POST" use:enhance={submit} aria-busy={busy}>
<PasswordField id="new-password" name="password" label="New password" autocomplete="new-password" minlength={12}/>
<PasswordField id="confirm-password" name="confirmation" label="Confirm password" autocomplete="new-password" minlength={12}/>
<button class="p-button" disabled={busy}>{busy?'Saving password?':'Save password & open dashboard ?'}</button></form>
<p class="p-auth-footer">Use at least 12 characters. A memorable phrase works well.</p></AuthShell>
