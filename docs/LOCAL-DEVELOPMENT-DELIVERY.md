# Local satellite release work — 18 November 2026

This milestone runs locally. No Vercel project, public deployment, DNS record, paid add-on or live provider field edit was created. Vercel is the intended later hosting target.

## Run web and automatic synchronization together

With the existing local `.env` configured, stop an older Talazo dev process on port 5174, then run:

```powershell
npm.cmd run dev:local
```

This starts Vite at the localhost `ORIGIN` and a separate polling loop. It refuses a public origin and a busy web port. Ctrl+C stops both children. Keep that terminal running for automatic data updates; this is not an installed Windows service. To run components separately, use `npm.cmd run dev` and `npm.cmd run satellite:worker` in separate terminals. A single-cycle diagnostic is `node --env-file=.env scripts/satellite-worker.mjs --once`.

Each field job handles one due field. Shared database leases prevent duplicate workers from processing it concurrently. Failed attempts use exponential backoff; interrupted attempts recover after lease expiry. Successful observations retain a six-hour refresh interval. Inventory is a separate bounded job. Administration → Integration health shows attempts, last successful runs and failures. A successful retrieval does not mean a newer satellite acquisition exists.

The scheduled endpoint accepts authenticated GET or POST. Future Vercel Cron can use `CRON_SECRET`; local workers use `SATELLITE_JOB_SECRET`. Secrets stay server-side. Choose actual cron frequency and function duration against the hosting plan when deployment begins; no schedule has been provisioned by this code.

## Farmer and administrator workflows

### Field and season changes

My farms → Field & season changes lets a farmer request a crop, planting-date or boundary change. Names remain free text, with a catalog code/canonical name retained for reporting and the entered wording preserved. Current monitoring remains unchanged while a request is pending.

Administration → Integration health shows requests. Approval rechecks ownership, current state, overlap, farmer allocation and the declared monthly quota. It reserves the maximum previous/requested area before issuing provider writes. The same provider field is updated; a replacement is not registered. The server verifies provider metadata before and after changes.

An uncertain provider outcome remains reserved. Use **Verify provider result** for read-only reconciliation; it does not replay a write. The monitoring row stays locked in `registering` while a change is applying or uncertain, intentionally preventing inbound reconciliation from silently overwriting partial changes. If read-back still differs, investigate the existing provider field; do not create another registration.

Completion archives the previous setup and observation snapshot, clears incompatible cached observations/products/weather and waits for fresh monitoring. Concurrent changes on the same farm are serialized/reviewed; overlap is checked again before completion. A saved provider planting date cannot currently be cleared; it can be replaced with a valid past date.

### Mapped imagery

Monitoring and topic viewers include an optional **Mapped imagery on Google Maps** panel. It starts with the actual saved boundary and requests a georeferenced raster on demand. Supported north-up WGS84/Web-Mercator colour/palette rasters are converted to a bounded PNG, reprojected into map row coordinates and clipped to the field. Source alpha is preserved. Opacity and map styles are adjustable.

Unknown CRS, rotation, unrelated bounds, excessive sizes and numeric-only rasters without a verified colour scale are rejected. The normal dated provider image viewer continues to work. Raster parsing/alignment is fixture-tested; actual Farmonaut GeoTIFF retrieval timed out during this milestone, so live overlay compatibility and multi-field alignment remain unverified. No arbitrary pest/nutrient hotspots are drawn.

### History and exports

An administrator can explicitly request a single historical date after checking provider visit allowance. Duplicate requests are blocked. Unknown responses are retained as uncertain rather than automatically resubmitted; refreshes mark requests available when the date actually appears. No paid historical request was issued as a test.

Analysis provides an authenticated observation CSV, containing field/crop, observation date, index, normalized clipped provider value, source, retrieval time and environment. Formula-like strings are escaped. It is an observation record, not a compliance certificate. Existing PDF/advisory/GeoTIFF report controls remain available. Comparison still needs two actual observations; no artificial history is generated.

### In-app alerts

Account & support lets each approved user enable in-app NDVI-drop alerts and choose a decrease threshold. Alerts require two usable dated observations; cloud-affected and absent values are excluded. A zero reading remains a real zero. Field/date/rule deduplication prevents repeated refreshes creating duplicate alerts. Farmers can mark alerts reviewed.

The owner confirmed there is currently no SMS service or verified email sender. Stress notifications are therefore in-app only. No external messages are sent. Invitations still support private activation links; external delivery must be configured/tested before public onboarding.

## Database and verification

Final checks passed: 48 unit tests, Svelte checks with zero errors/warnings, production build, 18-page Chrome review with zero uncaught errors, disposable account isolation, and the sample approval/archive/alert/export workflow. Hosted migrations 012–016 were applied; database lease, quota, ownership and mutation guards were verified with rollback fixtures. No paid field edit or historical request was performed.

The app now uses SvelteKit 3, Vite 8 and Node 24. The production dependency audit reports zero vulnerabilities. The full development audit retains eight high findings from the transitive picomatch advisory [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), for which no patched version was published at review time. Recheck upstream before deployment; a forced audit fix would downgrade the compatible framework toolchain.

Additive migrations `012`–`016` add job health/leases, field changes, georeferenced cache products, alert/history records and tightened crop/concurrency guards. New tables use owner/admin RLS, SELECT-only authenticated grants and checked mutation functions. Worker completion functions are service-only. Existing farm ownership, approval and quota controls remain authoritative in Talazo.

Repeatable checks:

- `scripts/test-sync-jobs.mjs`: job/field leases, interrupted-run recovery, retry delay and role denial; rollback-only fixtures.
- `scripts/test-field-changes.mjs`: owner request, catalog validation, duplicates, admin claim, reserved capacity, uncertain completion, stale token and cross-user denial; rollback-only fixtures.
- `scripts/test-release-data.mjs`: raster sensor/date access, alert preferences/acknowledgement and history approval/deduplication; rollback-only fixtures.
- `scripts/test-local-release-flow.mjs`: sample-mode local server at `ORIGIN`; disposable farmer request, denied farmer approval, admin completion, prior-season archive, cleared stale products, alert opt-in and scoped CSV. Never run this as a live-provider write test.
- Unit tests cover provider write/read-back sequencing and no-write reconciliation, georeferenced colour/bounds fixtures, safe raster fetches, stress comparisons, freshness and CSV escaping.

`npm run check`, `npm run build` and the isolated browser suite remain required after changes. Live field edits require a designated test field/allowance; sample flow success does not establish every paid write response. Real notification delivery, verified live geospatial alignment, public-host configuration, administrator MFA, backup restore and monitoring remain release gates.
