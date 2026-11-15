import {test} from 'node:test';import assert from 'node:assert/strict';
import {canRead} from '../src/lib/server/access.js';
const base={userId:'alice',tenantId:'org-a',resourceTenantId:'farmer-b',farmId:'farm-b',scope:'readings',memberships:[{userId:'alice',tenantId:'org-a',status:'active'}],consents:[],now:Date.parse('2026-11-01T00:00:00Z')};
const grant={ownerTenantId:'farmer-b',farmId:'farm-b',granteeTenantId:'org-a',scopes:['readings'],expiresAt:'2027-01-01T00:00:00Z',revokedAt:null};
test('anonymous, unrelated and suspended memberships are denied',()=>{assert.equal(canRead({...base,userId:null}),false);assert.equal(canRead({...base,memberships:[]}),false);assert.equal(canRead({...base,memberships:[{userId:'alice',tenantId:'org-a',status:'suspended'}]}),false);assert.equal(canRead(base),false);});
test('own tenant is readable to active members',()=>assert.equal(canRead({...base,resourceTenantId:'org-a'}),true));
test('cross-tenant reads need exact farm, recipient, owner and scope consent',()=>{assert.equal(canRead({...base,consents:[grant]}),true);for(const change of [{farmId:'other'},{granteeTenantId:'org-c'},{ownerTenantId:'wrong'},{scopes:['images']}])assert.equal(canRead({...base,consents:[{...grant,...change}]}),false);});
test('revoked and expired grants deny access immediately',()=>{assert.equal(canRead({...base,consents:[{...grant,revokedAt:'2026-10-31'}]}),false);assert.equal(canRead({...base,consents:[{...grant,expiresAt:'2026-11-01T00:00:00Z'}]}),false);});
