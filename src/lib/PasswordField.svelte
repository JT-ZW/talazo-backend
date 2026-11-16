<script lang="ts">
 import {onMount} from 'svelte';
 let {id,name,label,autocomplete='current-password',minlength,required=true}: {id:string;name:string;label:string;autocomplete?:'current-password'|'new-password';minlength?:number;required?:boolean}=$props();
 let visible=$state(false);
 let ready=$state(false);
 onMount(()=>{ready=true;});
</script>
<div class="p-field"><label for={id}>{label}</label><div class="password-control"><input {id} {name} type={visible?'text':'password'} {autocomplete} {minlength} {required}/><button type="button" disabled={!ready} aria-label={`${visible?'Hide':'Show'} ${label.toLowerCase()}`} aria-controls={id} aria-pressed={visible} onclick={()=>visible=!visible}>{visible?'Hide':'Show'}</button></div></div>
<style>.password-control{position:relative}.password-control input{padding-right:74px;width:100%}.password-control button{position:absolute;right:7px;top:50%;transform:translateY(-50%);background:transparent;border:0;border-radius:4px;color:#355c3f;font-size:12px;font-weight:600;padding:9px 10px;min-height:36px}.password-control button:hover{background:#e8eedf}.password-control button:focus-visible{outline:2px solid #9a752d;outline-offset:1px}</style>
