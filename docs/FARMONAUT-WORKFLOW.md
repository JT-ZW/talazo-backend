# Talazo independent-farmer workflow

Design recorded 14 November 2026. This is an implementation specification, not a live feature announcement. Existing routes remain previews. No provider calls or account invitations were sent during this design pass.

## Configuration

Add to the local, ignored `.env`:

```dotenv
FARMONAUT_API_KEY=your_key_here
FARMONAUT_TEST_MODE=true
```

Both are server-only. The second variable is Talazo's proposed integration switch, not a Farmonaut environment variable. Future adapter code must read it explicitly, default to test mode when missing, reject invalid values, and send the matching boolean on every request. These values are documented now; no adapter is wired yet. Never spread arbitrary browser request bodies into provider requests, where they could override this setting. Restart the development server after editing environment configuration.

Do not put the key into chat, source files, PUBLIC_ variables, a customer form, an iframe, logs or analytics. Store production values in hosting secrets. Do not change test mode to live until isolated end-to-end checks and a real-area registration are authorized. A test response is not evidence of observation quality, real processing latency or plan entitlement.

## API review and design consequences

Reviewed the published endpoint catalogue, reference sections, object formats, guides and reference-code lists. No endpoint was executed and no key entitlement was verified. Source: [Farmonaut reference](https://farmonaut.com/farmonaut-satellite-weather-api-developer-docs).

Provider-specific constraints: requests use POST/JSON and bearer authentication; testing returns samples. Creation is not deduplicated. Boundaries use longitude first. Sowing-date formats differ by endpoint. Index strings are scaled and negative values are clipped; preserve originals. Some errors arrive with HTTP 200. Custom polygons require enterprise access; grid alerts are not farmer-drawn zones. Usage reporting is legacy-specific. Webhook authenticity, quotas and branding permissions need confirmation.

## Account and access model — Talazo design

Use one provider account behind a server-only adapter. Supabase is the authority for identity, approval, ownership, grants and customer history. Never use a provider account owner name or email to infer a Talazo farmer's identity.

For this pilot, no public self-registration. The public entry offers sign-in and information on requesting access outside the app. Disable Supabase public signup as well as omitting signup UI; hiding a button alone is insufficient. Existing authenticated users without an active approval record must also be denied. Enforce this in server services and RLS, including private assets and background-job permissions.

Account lifecycle:

`draft → approved → invitation_ready → invited → active → suspended`

`rejected` applies to a draft/request. Invitation expiry is tracked separately from approval. Suspension retains ownership and history, denies access immediately, and cancels queued customer actions. Decide separately whether already-paid monitoring continues or pauses; suspension must not silently delete remote fields.

Platform administration is a trusted database role assignment, never editable profile metadata. Bootstrap the first administrator through a trusted database operation after policy review. Subsequent privileged changes require a verified administrator, audit trail and role checks. Do not bootstrap from an arbitrary first login or an email address supplied by the browser. Require MFA for administration before production.

## Super-admin user journey — Talazo design

1. Sign in to `/admin/users` through verified admin-only routing. The current preview's admin route restrictions need replacing with actual authorization, not removing outright.
2. Create a farmer draft: name, email, optional phone, preferred language, support notes and pilot allowance. Normalize email; check for an existing identity before creating another.
3. Review and approve. Record who approved, when, and why. Default to farmer role. Approval does not grant administration.
4. Create an invitation using the server-side Supabase administration API. Generate an activation link and show a reviewable invitation preview. Send only after the administrator chooses Send invitation. Store delivery status and allow controlled resend. Do not choose or email a reusable password.
5. Farmer follows the link and sets their password. Treat link expiry and approval expiry separately. Reconcile approval/profile/auth creation failures so no partial operation accidentally grants access.
6. User detail shows invitation, activation and suspension status; owned farms; monitoring allowance; last activity; and sanitized integration errors. Resend, suspend and reactivate are explicit audited operations.
7. Admin can assist with farm setup on behalf of the farmer. Record the acting administrator and actual farmer owner separately. Never silently transfer ownership.

Do not send invitations or create real identities as a side effect of viewing a preview. Supabase auth identity, profile and approval creation span multiple operations: maintain an onboarding operation ID and recoverable state rather than assume one database transaction covers all of them.

## Farmer journey — Talazo design

### Activate and start

Approved invitation → password setup → sign-in → profile/contact confirmation → empty overview with a single primary action, Add your first farm. Support password reset, expired links, invitation resend through support, sign-out, and a clear suspended-account screen.

### Create a farm and management zones

Capture farm name, district, country, location and optional overall perimeter. A pin is a navigation aid. Create one or more named growing areas beneath the farm, each with a drawn boundary, soil/irrigation/drainage notes and a crop-season record. Avoid a mandatory extra field layer in the current farm → zone database structure. In the UI use “Fields & zones” with an explanation that each zone is a managed growing area.

Let farmers save incomplete drafts. Validate coordinate ranges, geometry, containment where an overall farm boundary exists, overlap, area, multipolygons, holes and provider support before registration. Do not silently drop holes or merge disconnected areas. Show a drawing review and calculated hectares. Keep planned future sowing dates locally; they are not ready for submission as an actual planting date.

### Request monitoring

Farmer selects which growing areas need independent observations and sees the monitored area and remaining Talazo allowance. Save a request for admin review during the pilot. This is a separate cost control from user approval; user approval does not permit unlimited registrations against the shared provider account.

Map each approved monitored zone to one external field unless enterprise polygon support has been explicitly enabled and tested. Local-only zones remain usable for notes but must not display parent-level observations as independent zone measurements. Store the mapping, environment, boundary version, crop and season used for registration.

Registration lifecycle:

`draft → awaiting_admin → queued → registering → awaiting_observation → active`

Additional states: `registration_uncertain`, `action_required`, `paused`, `expired`, `archived`. Test and live records are isolated. A sample result never advances a real monitoring request to active.

Persist a registration operation before calling the provider and lock repeated submissions. On a timeout after a create request, enter registration_uncertain and reconcile; do not blindly retry a potentially successful creation. Account-wide provider field discovery is available only to administrators; existing personal-account fields must never be auto-assigned to a Talazo farmer. Import requires an explicit ownership decision.

### Monitor

Overview shows owned farms, monitoring state, last usable observation and next action. A monitored-area page has a map, date selector, imagery layer selector, legend and observation details. Trends compare compatible products and boundary versions. Weather has its own timestamp and forecast status. Distinguish cloudy, missing, processing, paused, expired and failed states; do not substitute fabricated values.

Primary navigation: Overview · My farms · Satellite monitoring · Weather · Reports · Account & support. Hardware and organization workflows are deferred from primary navigation for this release. Keep satellite-estimated moisture distinct from ground measurements. Provider-generated reports and advisory are labelled; advice is informational and contextual, not an automatic farm operation.

English is the pilot report default. Only expose additional report languages after actual entitlement and output checks; UI localization and provider report-language support are different features.

### Continue a season

Crop rotation creates a new Talazo season and queues provider-setting updates while retaining earlier history. Editing a boundary creates a new version and an explicit monitoring change request. Historical retrieval requires admin review of scope and cost. Archive locally before considering provider deletion; show the effect on continuing monitoring. Never confuse account suspension with field deletion.

## Synchronization and security — Talazo design

Start with a background polling job and manual admin refresh with cooldown. Use webhooks later as a refresh signal after confirming verification and delivery behavior; do not trust a webhook as observation truth. Fetch canonical results with our server credential and only for recognized mappings. Rate-limit the receiver, bound payload sizes, deduplicate events, and avoid unauthenticated events triggering expensive arbitrary account scans.

Every customer action accepts a Talazo resource ID. Resolve the permitted provider ID server-side after identity, active approval and ownership checks. Never expose generic provider proxying or account-wide listings to farmers. Credentials, account email and unrelated account fields must not appear in customer responses.

Store source payloads privately with limited retention. Normalize measurements into a documented internal representation, retain scale/quality metadata and distinguish date-only observations from exact timestamps. Cache per environment/resource/date/product/version. Filter all histories, exports and assets with the same ownership rules. Handle HTTP and body-level errors, timeouts, schema changes, rate limits and partial availability. Retry reads with bounded backoff; reconcile uncertain writes.

Admin operations view shows queued jobs, failed jobs, uncertain registrations, stale fields, last success, observed usage, configured plan caps and per-farmer allocations. Do not present a locally estimated quota as a provider-reported balance. Reserve capacity transactionally before registration; release only after failure is reconciled.

## Database work required — Talazo design

Review RLS definitions before writing migrations. Add approval/account lifecycle records, invitation operations, per-farmer allowances, zone characteristics, provider mappings, boundary versions, environment-separated observations and registration/sync jobs. Extend satellite records for product, original scale, processing version, imagery assets and quality. Existing farms.owner_id and platform_admins remain the ownership/admin anchors. Do not apply the historical tenant migration to the inspected live schema.

## Release acceptance — Talazo design

- Unapproved, suspended and unrelated users cannot access farms, observations, exports or assets, even with a known UUID or a still-valid session.
- Admin can approve a farmer and prepare an invitation; unauthorized users cannot call the account-creation service.
- Farmer activates an approved account, creates a farm/zone/season, saves drafts and submits a bounded monitoring request.
- Admin approval results in one reconciled provider mapping despite double-clicks, network timeouts and worker retries.
- Test output is visibly sample-only and never mixed with real observations.
- New observations populate the right account with usable dates, legends and honest unavailable states. Existing personal provider fields remain private.
- Suspension, expiry, missing imagery, provider outage, invitation expiry, password reset and boundary changes have tested recovery paths.
- Backup restore, audit trails, deployment rollback and operational ownership are verified before customer launch.

## Endpoint disposition

Identifiers below are a coverage checklist, not a generic proxy allowlist. Exact request and response contracts must be tested per endpoint before enabling it.

| Surface | Reviewed endpoints | Talazo exposure |
|---|---|---|
| Field creation/read | submitField, getFarmerData, getFieldAreaByBoundaryPoints | Approved registration worker; scoped farmer reads |
| Field editing | change_field_data, modifyFieldPoints, updateCropCode, updateSowingDate | Validated owner requests and background reconciliation |
| Inventory/lifecycle | getAllFieldIDs, deleteField, getAllDeletedFields, restoreDeletedFields, getExpiredFarms | Admin reconciliation/recovery; no account-wide farmer access |
| Observation dates | getSensedDays, getSARDays | Scoped synchronization |
| Monitoring controls | pauseFieldMonitoring, resumeFieldMonitoring, addMonthsToFarm | Admin/cost-controlled operations; last endpoint only if applicable |
| Backfill | requestPreviousSatelliteData, requestBulkHistoricalSatelliteData | Admin-approved jobs |
| Assets | getFieldImage, generate_geotif_file | Scoped imagery and controlled downloads |
| Indices | getIndexValue, getIndexValuesBasedOnSenseddays, getAllIndexValues, getFieldIndexBreakdown, getFieldIndexAreaImage | Cached monitoring/trends |
| Weather | getPresentWeather, getForecastWeather, getForecastWeatherFromLatLong, getHistoricalFieldWeather, getPastWeatherGraph | Farm-scoped context |
| Reports | getFieldReport, addReportLanguage, removeReportLanguage | Scoped output; supported preferences only |
| Advisory | askJeevnAPI, getAdvisoryReport, getDatabase | Later controlled feature after agronomic review |
| Enterprise sub-areas | submitOrUpdateFarmPolygon, getPolygonFarmerData, deleteFarmPolygons | Disabled pending entitlement |
| Operations | getMyUsage, setup_webhook | Admin/worker only |

Open questions for the provider: test-key restrictions; production request limits; subscription usage reporting; map asset georeferencing/expiry/retention; webhook authentication and retries; crop-code support; polygon entitlement; and the previously identified branding/reseller agreement. Do not infer that a successful sample response resolves any of these.
