# Farmonaut and Talazo synchronization

## Systems of record

Talazo owns farmer approval, identity, farm ownership, hectare allocation and field activity records. Farmonaut owns its provider field ID, supplied crop/planting metadata, imagery, observations, forecasts and advisory output. Sharing a provider account does not grant every farmer access to all its fields.

Talazo-created registrations and supported pause/resume/detail updates still go to Farmonaut. Inbound reconciliation discovers fields created in Farmonaut and checks metadata changes for connected fields. No discovery call submits a new paid field or assigns ownership automatically.

## Administrator workflow

Open **Administration → Integration health → Your Farmonaut account fields**. The account is checked on opening the administrator overview/integration page and every five minutes while visible; **Refresh from Farmonaut** requests an earlier check, subject to a shared 30-second minimum. Results are stored in an admin-only inventory.

- **Unassigned**: choose the Talazo farm and approved owner, review the boundary and import the existing field. It reuses the provider ID, validates geometry/overlap/current allocation and creates no second provider registration. Create a Talazo farm first if necessary.
- **Connected**: names, crops and planting dates are reconciled from verified provider metadata. A local display label is preserved when remote metadata has not changed. Ownership is never inferred from the provider account's email/name.
- **Boundary review**: geometry changes put monitoring into a review state, preserving its hectare reservation. Inspect the provider boundary and apply reviewed changes; the database recalculates area and checks allocation and overlaps. Crop/date/geometry changes invalidate stale cached products.
- **Absent**: only a successful complete provider list can establish that a field is missing. Local records are retained and require administrator reconciliation. Missing data is not treated as permission to delete records or release capacity.
- **Unavailable**: failed/placeholder/malformed provider responses retain the last good snapshot and expose a diagnostic. Unknown pause/expiry flags remain unknown rather than being inferred.

Metadata reads are bounded to six fields per account pass, prioritizing fields lacking metadata then least-recently checked fields. The inventory supports up to 500 provider fields; larger accounts need a paginated reconciliation worker. A shared database lease prevents concurrent account scans. Exact provider contact details, account identifiers and phone numbers are not copied into the inventory.

## Farmer and background refresh

Opening a connected farmer dashboard or monitoring page checks for updates through the authenticated field refresh endpoint. The server verifies only that accessible mapped field's metadata before refreshing its observations; it never returns the full account inventory to a farmer. Existing refresh throttles and product caches still apply, so this is periodic synchronization rather than an instant push mirror.

The protected scheduled endpoint also runs account discovery before the existing observation queue. The worker polls every five minutes; observation retrieval retains its existing age/allocation checks. Run or deploy the worker to synchronize when no browser is open. Source code alone does not provision a hosting scheduler.

API coverage is limited to the documented endpoints integrated by Talazo. Provider contacts, billing, proprietary UI effects and unsupported external edits are not a universal bidirectional replica of the native Farmonaut app.

## Validation

`010_provider_reconciliation.sql` adds admin-only inventory/state tables, a service-only refresh lease and an admin/service reconciliation RPC. The RPC enforces owner approval, duplicate provider mappings, valid polygons, crop classification, quota/allocation checks and explicit geometry acceptance.

- `npm test` includes live-shape parsing, identity checks, contact minimization, invalid dates/geometry, placeholder rejection and explicit pause/expiry handling.
- `scripts/test-provider-reconciliation.mjs` tests imports, deduplication, metadata changes, cache invalidation, boundary review and quotas plus inventory isolation/tamper denial inside a rolled-back transaction. It makes no provider calls.
- `scripts/test-provider-account.mjs` uses a disposable administrator to read the live inventory and verify admin-only and same-origin controls. It does not import, assign or modify any actual provider field.
