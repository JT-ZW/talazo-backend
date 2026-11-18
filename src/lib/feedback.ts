import {writable} from 'svelte/store';
import {goto} from '$app/navigation';
import type {SubmitFunction} from '$app/forms';
export const processing=writable<{title:string;detail:string}|null>(null);
export const notifications=writable<Array<{id:number;kind:'success'|'error';message:string}>>([]);
let nextId=0;
export function notify(message:string,kind:'success'|'error'='success') {
 const id=++nextId;
 notifications.update(items=>[...items.slice(-2),{id,kind,message}]);
 if(kind==='success')setTimeout(()=>dismiss(id),6500);
}
export const dismiss=(id:number)=>notifications.update(items=>items.filter(item=>item.id!==id));
const progress:Record<string,string>={connection:'Checking production connection',discover:'Finding your existing Farmonaut field',reconcile:'Verifying the saved field boundary',details:'Updating field details in Farmonaut',weather:'Loading field forecast',activity:'Saving field activity',quota:'Saving monthly quota',allocation:'Saving farmer allocation',invite:'Preparing farmer access',status:'Updating account access',farm:'Saving your farm',zone:'Saving your growing area',request:'Submitting monitoring request',register:'Preparing satellite monitoring',sync:'Refreshing satellite observations',pause:'Pausing monitoring',report:'Preparing your report',signout:'Signing out'};
export function feedbackForm(options:{pending?:string;success?:string;onBusy?:(busy:boolean)=>void;onSuccess?:(form:HTMLFormElement)=>void;resetOnSuccess?:boolean}={}):SubmitFunction {
 return ({action,formElement})=>{
  const operation=action.search.replace(/^\?\//,'');
  processing.set({title:options.pending||progress[operation]||'Saving your changes',detail:'Please keep this page open while we finish.'});
  options.onBusy?.(true);
  return async({result,update})=>{
   processing.set(null);
   try{
    if(result.type==='success'){
     const payload=result.data as {message?:string;redirectTo?:string}|undefined;
     if(options.resetOnSuccess)formElement.reset();
     await update({reset:false});
     options.onSuccess?.(formElement);
     notify(payload?.message||options.success||'Your changes were saved successfully.');
     if(payload?.redirectTo?.startsWith('/')&&!payload.redirectTo.startsWith('//'))await goto(payload.redirectTo,{invalidateAll:true});
    }else if(result.type==='failure'){
     await update({reset:false});
     notify((result.data as {message?:string}|undefined)?.message||'The request could not be completed. Please review the form and retry.','error');
    }else if(result.type==='redirect'){
     const expired=result.location.startsWith('/login')&&operation!=='signout'&&action.pathname!=='/login';
     notify(expired?'Your session has ended. Please sign in again.':options.success||'Process completed successfully.',expired?'error':'success');
     await update();
    }else{
     notify('The request could not be completed. Please retry or contact Talazo.','error');
     await update();
    }
   }catch{
    notify('The connection was interrupted. Check the result before submitting again.','error');
   }finally{options.onBusy?.(false);processing.set(null);}
  };
 };
}
