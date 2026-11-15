import {fail,redirect} from '@sveltejs/kit';
import {identity} from '$lib/server/pilot';
import {passwordError} from '$lib/auth-errors.mjs';
export const load=async(event:import('@sveltejs/kit').RequestEvent)=>{const a=await identity(event);return {email:a.user.email};};
export const actions={default:async(event:import('@sveltejs/kit').RequestEvent)=>{
 const a=await identity(event);const f=await event.request.formData();const password=String(f.get('password')||'');
 if(password.length<12||password!==f.get('confirmation'))return fail(400,{message:'Use at least 12 characters and make sure both passwords match.'});
 const result=await a.client.auth.updateUser({password});
 if(result.error){
  const feedback=passwordError(result.error);
  if(!feedback.alreadySaved)return fail(400,{message:feedback.message});
  if(event.request.headers.get('accept')?.includes('application/json'))return {message:feedback.message,redirectTo:a.isAdmin?'/admin/overview':'/portal/overview'};
 }else if(event.request.headers.get('accept')?.includes('application/json'))return {message:'Your password is saved. Welcome to your dashboard.',redirectTo:a.isAdmin?'/admin/overview':'/portal/overview'};
 redirect(303,a.isAdmin?'/admin/overview':'/portal/overview');
}};
