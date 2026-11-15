export type UUID = string;
export type Role = 'owner'|'manager'|'agronomist'|'viewer';
export type TenantKind = 'individual'|'organization'|'government';
export interface Tenant {id:UUID;name:string;kind:TenantKind;created_at:string}
export interface Organization {id:UUID;tenant_id:UUID;name:string;kind:'contract'|'government'}
export interface Membership {tenant_id:UUID;user_id:UUID;role:Role;status:'active'|'suspended'}
export interface Farm {id:UUID;tenant_id:UUID;name:string;district:string;area_ha:number|null;latitude:number|null;longitude:number|null}
export interface Field {id:UUID;tenant_id:UUID;farm_id:UUID;name:string;area_ha:number|null;crop:string|null}
export interface Zone {id:UUID;tenant_id:UUID;farm_id:UUID;field_id:UUID;name:string}
export interface Device {id:UUID;tenant_id:UUID;farm_id:UUID;zone_id:UUID;hardware_id:string;connectivity:'wifi'|'mobile';last_seen_at:string|null;provisioning_status:'pending'|'active'|'retired'}
export interface Reading {id:UUID;tenant_id:UUID;farm_id:UUID;device_id:UUID;recorded_at:string;received_at:string;sequence:number;moisture_relative_pct:number|null;temperature_c:number|null;ec_ms_cm:number|null;battery_pct:number|null;quality:'valid'|'uncalibrated'|'invalid'}
export interface CropImage {id:UUID;tenant_id:UUID;farm_id:UUID;device_id:UUID;captured_at:string;object_path:string;consent_required:boolean}
export interface Program {id:UUID;tenant_id:UUID;organization_id:UUID;name:string;district:string;target_beneficiaries:number;starts_on:string;ends_on:string|null}
export interface Enrollment {id:UUID;tenant_id:UUID;program_id:UUID;farm_id:UUID;farm_tenant_id:UUID;consent_id:UUID;status:'enrolled'|'withdrawn'}
export type ShareScope='farm'|'readings'|'images'|'reports';
export interface Consent {id:UUID;owner_tenant_id:UUID;farm_id:UUID;grantee_tenant_id:UUID;scopes:ShareScope[];purpose:string;granted_by:UUID;granted_at:string;expires_at:string;revoked_at:string|null}
export interface Page<T> {data:T[];next_cursor:string|null;mode:'sample'|'live'}
export interface ApiError {error:{code:string;message:string;request_id:string}}

export interface Plan {id:UUID;name:string;farm_limit:number|null;device_limit:number|null;features:string[]}
export interface Subscription {id:UUID;tenant_id:UUID;plan_id:UUID;status:'trial'|'active'|'past_due'|'cancelled';starts_at:string;ends_at:string|null;provider_reference:string|null}
export interface Alert {id:UUID;tenant_id:UUID;farm_id:UUID;device_id:UUID|null;kind:'threshold'|'device_offline'|'sensor_quality';severity:'info'|'review'|'urgent';status:'open'|'acknowledged'|'resolved';opened_at:string;acknowledged_by:UUID|null}
export interface AgronomistTask {id:UUID;tenant_id:UUID;farm_id:UUID;assignee_user_id:UUID;title:string;due_on:string;status:'todo'|'in_progress'|'complete';completed_at:string|null}
export interface AuditEvent {id:UUID;tenant_id:UUID;actor_user_id:UUID;action:string;resource_type:string;resource_id:UUID;request_id:string;created_at:string;reason:string|null}
export interface OperationalSetting {tenant_id:UUID;reading_retention_days:number;report_timezone:string;digest_enabled:boolean;updated_by:UUID;updated_at:string}
// Operational entities above are contracts only; their migrations/write services are pending.
