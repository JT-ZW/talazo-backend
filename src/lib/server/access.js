/** Pure policy reference, not a substitute for database RLS.
 * @param {{userId:string|null,tenantId:string,resourceTenantId:string,farmId:string,scope:string,memberships:Array<{userId:string,tenantId:string,status:string}>,consents:Array<{ownerTenantId:string,farmId:string,granteeTenantId:string,scopes:string[],expiresAt:string,revokedAt:string|null}>,now:number}} input */
export function canRead(input){
 if(!input.userId)return false;
 const member=input.memberships.some(m=>m.userId===input.userId&&m.tenantId===input.tenantId&&m.status==='active');
 if(!member)return false;
 if(input.resourceTenantId===input.tenantId)return true;
 return input.consents.some(c=>c.ownerTenantId===input.resourceTenantId&&c.farmId===input.farmId&&c.granteeTenantId===input.tenantId&&c.scopes.includes(input.scope)&&!c.revokedAt&&Date.parse(c.expiresAt)>input.now);
}
