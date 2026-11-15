/** Only translate known provider codes; never expose request details or passwords.
 * @param {{code?:string,status?:number,reasons?:string[]}|null|undefined} error */
export function passwordError(error) {
 const code=error?.code;
 if(code==='same_password')return {alreadySaved:true,message:'This password is already saved. Opening your dashboard.'};
 if(code==='weak_password'){
  const exposed=error?.reasons?.includes('pwned');
  return {alreadySaved:false,message:exposed?'This password appears in known data breaches. Please choose a different, unique password.':'This password does not meet the account security requirements. Use a unique password of at least 12 characters with uppercase and lowercase letters, a number and a symbol.'};
 }
 if(['session_not_found','session_expired','refresh_token_not_found','refresh_token_already_used','bad_jwt','no_authorization','reauthentication_needed','reauthentication_not_valid'].includes(code||''))return {alreadySaved:false,message:'Your session needs to be renewed. Sign in again or ask Talazo for a fresh access link, then retry.'};
 if(code==='current_password_mismatch')return {alreadySaved:false,message:'Please sign in again with your current password before changing it.'};
 if(code==='over_request_rate_limit'||error?.status===429)return {alreadySaved:false,message:'Too many attempts. Please wait a little before trying again.'};
 if(error?.status&&error.status>=500)return {alreadySaved:false,message:'The account service is temporarily unavailable. Your password was not confirmed as saved. Please retry shortly.'};
 return {alreadySaved:false,message:'We could not confirm that your password was saved. Please retry. If this continues, contact Talazo for help.'};
}
