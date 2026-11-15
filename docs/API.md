# Talazo API contract · draft v1

Only `GET /api/v1/status` is implemented. All other `/api/v1/*` methods return 503 `INTEGRATION_NOT_ENABLED`; no real writes or ingestion occur. Types: `src/lib/contracts.ts`. SQL foundation: `supabase/migrations/001_foundation.sql` (not applied).

## Request boundaries

Future interactive endpoints use Supabase verified JWT claims with cookies, then resolve active database membership for the requested tenant. A tenant UUID in a URL is a requested scope, never proof of access. Organization/program IDs must belong to that tenant. Super-admin is a separate server-authorized, audited permission, never a workspace name or editable user metadata. Cross-tenant operations require explicit owner consent; program enrollment alone is insufficient.

Lists return `{ data: T[], next_cursor: string|null, mode: 'live' }`. Default 50, maximum 200 rows. Cursors encode stable `(created_at,id)` or `(recorded_at,id)` ordering and are signed. Errors: `{error:{code,message,request_id}}`; 400 validation, 401 unauthenticated, 403 unauthorized, 404 missing/inaccessible object, 409 conflict, 429 throttling, 503 disabled. Do not expose database errors. Writes require same-origin CSRF checks, validated JSON, an idempotency key and a transaction including audit entry.

| Endpoint | Methods | Boundary / purpose |
|---|---|---|
| `/tenants/:tenantId/farms` | GET, POST | Membership; owner/manager creates |
| `/tenants/:tenantId/farms/:farmId` | GET, PATCH | Owner tenant or consent for reads; owner/manager writes |
| `/tenants/:tenantId/farms/:farmId/fields` | GET, POST | Same farm boundary |
| `/tenants/:tenantId/fields/:fieldId/zones` | GET, POST | Validate field→farm→tenant |
| `/tenants/:tenantId/devices` | GET | Tenant or consented farm scopes only |
| `/tenants/:tenantId/devices/:id/readings?from=&to=&bucket=` | GET | readings consent; UTC ISO range, max 31 days per page; bounded 1h/1d aggregation |
| `/tenants/:tenantId/farms/:id/images` | GET | images consent; short-lived private signed URLs |
| `/tenants/:tenantId/organizations` | GET, POST | Tenant owner/manager |
| `/tenants/:tenantId/programs` | GET, POST | Government/organization owner or manager |
| `/tenants/:tenantId/programs/:id/enrollments` | GET, POST, PATCH | Program boundary plus exact farm consent |
| `/tenants/:tenantId/memberships` | GET, POST, PATCH | Owner administration; role escalation must be checked server-side |
| `/tenants/:tenantId/farms/:id/consents` | GET, POST, PATCH | Only owner tenant owner may grant/revoke, with purpose, scopes and expiry |
| `/tenants/:tenantId/alerts`, `/tasks`, `/reports` | GET, POST, PATCH | Scoped farm permissions; role-based changes |
| `/admin/customers`, `/organizations`, `/programs`, `/plans`, `/users`, `/farms`, `/devices`, `/audit`, `/settings` | GET, POST, PATCH | Verified platform administrator, MFA and immutable audit; no browser service key |
| `/ingestion/readings`, `/ingestion/images` | POST | Device-specific rotated credentials; no user/session keys |

## Device pipeline and connectivity

ESP32/mobile gateway → authenticated ingestion service → Supabase transaction → scoped repositories → frontend. Provisioning binds immutable hardware ID to tenant/farm/zone; store only hashed device credentials in a private schema. Per-device authorization, rate limits and a 64 KB body limit. Readings include `recorded_at`, `sequence`, nullable calibrated measurements and `quality`; service assigns `received_at`, tenant/farm and device IDs. Never trust client-provided ownership. Deduplicate `(device_id, recorded_at, sequence)`; preserve gaps, report clock skew, reject invalid units/ranges and quarantine questionable data. EC is mS/cm; relative moisture is distinct from calibrated volumetric moisture. Devices buffer offline readings, retry with backoff and retain sequence/timestamps; received_at must never replace observation time.

Farmhouse Wi-Fi and mobile links are explicit device properties. Offline status derives from last received heartbeat and configured cadence, not a hard-coded chart value. The present app has no background syncing or service worker. Do not imply it can operate without a network or actuate irrigation.

## Consent, geography and storage

An individual grower owns an individual tenant. Organizations and government programs have their own tenants; never transfer farm ownership on enrollment. Sharing is a farm-specific, revocable, expiring grant with scope (`farm`, `readings`, `images`, `reports`), purpose and grantor. Farm details need `farm`; readings need `readings`; an image grant is never implied. Revocation takes effect on the next database read and signed image URLs must have a short TTL (e.g. 60 seconds). Avoid long-lived aggregate caches; invalidate at revoke. Program reports must filter consent before aggregation, suppress small geographic groups and exclude personal details unless authorized. District reporting is implemented in the demo; interactive geographic maps and boundary polygons are future integration.

Images belong in a private bucket at `tenant/farm/device/capture-id.jpg`. Metadata uses database RLS; signed URLs must check it server-side. No bucket or storage policy is created by the draft migration, so image storage must remain disabled until private bucket policies and revoke tests are added.

## Database foundation limits

Composite tenant/farm foreign keys prevent attaching fields, zones, devices or readings to unrelated owners. RLS denies anonymous access and restricts SELECT to memberships or valid consent. Client writes are denied intentionally. Add transactional write RPCs for membership changes, consent authority, provisioning, alerts/tasks, subscription lifecycle, settings and append-only audit before enabling live mode. `enrollments` validates the consent tuple but its creation service must also check scopes, expiry and active status. Platform admin privileges have no client bypass in this foundation.

Required integration tests: two individual tenants, one organization and government tenant; anonymous and suspended users denied; every parent-ID swap denied; viewer writes denied; exact farm/scope consent only; revoke/expiry denies data and image URLs; enrollment cannot create consent; device cannot impersonate another farm; duplicate upload idempotency; immutable audited admin actions. Pure policy tests included now do not validate actual PostgreSQL RLS.

Supabase references: [SvelteKit SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security). Reviewed 01 November 2026.
