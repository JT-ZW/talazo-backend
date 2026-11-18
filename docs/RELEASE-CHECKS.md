# Validation and release checks

## Reviewed on 16 November 2026

The paid live integration passed an existing approved field refresh, dated NDVI imagery, area breakdowns, structured pest/weed/fertilizer/irrigation/soil/growth-and-yield advisories, NDRE/NDMI/SOC/radar-moisture images and PDF/advisory report links. Eight monitoring pages rendered, cached reads were reused, and unrelated-user and unavailable-date requests were denied. These checks did not register or change a paid provider field. The available observation was 13 November; a refresh is not evidence of a newer satellite acquisition.

Live account discovery returned two fields with no metadata issues. One remains unassigned and admin-only as requested. A separate live weather test retrieved seven daily forecasts and verified unrelated-user denial.

Hosted rollback tests passed spatial/overlap validation, quota reservation, duplicate registration prevention, suspension, RLS/admin escalation denial, provider metadata reconciliation and stale-observation rejection. Disposable HTTP checks passed activation/password validation, login/logout, field setup/request/activity, cross-user isolation, forged metadata, direct-write denial and CSRF checks.

A browser review caught an early click before the password visibility toggle was hydrated. The toggle now remains disabled until its handler is ready. The production-build Chrome rerun passed six admin and twelve farmer pages, all map modes, coordinate import/area preview, drawing/finish, themed calendar, desktop/tablet/mobile overflow checks, mobile navigation and logout, with zero uncaught errors. Desktop dashboard and mobile pest screenshots were visually inspected. Test the production bundle separately from a running development build to avoid hot-reload navigation interference.

All 41 unit tests, Svelte checks (zero errors/warnings), and the production build passed. Local browser captures stay ignored. The release requirements below remain open; these results do not establish full native Farmonaut feature parity, verified email/SMS delivery, or a deployed background scheduler.

## Reviewed on 15 November 2026

The unit suite passed 38 tests. The hosted password, ownership/isolation and rollback-only quota/spatial checks passed. Browser-only desktop, tablet and mobile captures were reviewed; field selection, image-viewer contrast and inherited crop-sidebar/topic-navigation styles were corrected. The mobile navigation now has an explicit close control and Escape dismissal. No real administrator credentials/session or paid field boundary was changed.

The final isolated Chrome run passed six administrator pages, twelve farmer pages, password visibility toggles, image load/zoom, all four map modes, boundary coordinate import, area preview, four-corner drawing/finish, themed calendar open/Escape/Today, mobile menu dismissal/navigation and logout, with zero uncaught page errors. Responsive dashboard checks passed at 1440, 1024 and 390 pixels. Type checks reported no errors or warnings, and the production build passed. Browser screenshots and private live diagnostics remain local and are not committed.

## Repeatable checks

Inbound provider field discovery/reconciliation is described in [provider synchronization](PROVIDER-SYNCHRONIZATION.md). Its live account test leaves unassigned fields unassigned; database import/update tests use rolled-back fixtures only.

- `npm test`: parsing, access models, date/sensor isolation, image validation, Google Maps lifecycle, crop names, area calculation, provider failures and explicit monitoring confirmations.
- `npm run check` and `npm run build`: Svelte/TypeScript verification and the Node production bundle.
- `node --env-file=.env scripts/test-hosted-pilot.mjs`: PostGIS boundaries, overlap, quotas, registration claims, RLS, suspension and admin escalation; all database changes roll back.
- `node --env-file=.env scripts/test-password-flow.mjs`: disposable invitation activation and password validation. No real administrator session is regenerated.
- `node --env-file=.env scripts/test-account-isolation.mjs`: disposable users, farm/field/request/activity flow, login/logout, unapproved/suspended access, seven-table RLS isolation, forged metadata, direct writes, CSRF and administrator pages. Fixtures are removed.
- `node --env-file=.env scripts/test-browser.mjs`: isolated installed-Chrome desktop/tablet/mobile checks, page navigation, password toggles, actual imagery, image zoom, Google Maps modes, coordinate import, area preview, drawing and logout. Captures stay under ignored `test-results/`; the test does not save a field or submit a paid registration.
- `node --env-file=.env scripts/test-live-monitoring.mjs`: authorized existing field selected through local `TALAZO_QA_ZONE_ID`. Checks provider imagery, distributions, advisory topics, cache reuse, date/ownership denial and report links. Does not create or alter provider fields.
- `node --env-file=.env scripts/test-live-weather.mjs`: same approved live-zone selection; validates a real forecast and unrelated-user denial with a disposable identity. No provider field writes or emails. Supports a separate local production server through `ORIGIN`.
- `node scripts/check-source-secrets.mjs`: tracked-file checks against credential patterns and, when available locally, actual `.env` credentials. Values are never printed.

Historical test scripts that accept a real administrator email can invalidate its access links; do not run them as ordinary QA. Never run production write-lifecycle tests on a farmer's active field merely to exercise a button.

## Before public release

Configure the deployed HTTPS origin, Auth redirect allowlist, verified SMTP, administrator MFA, Google Maps browser restrictions, backup restore and error/uptime monitoring. Verify invitation/recovery delivery using an authorized recipient. Deploy and monitor the satellite scheduler or verified webhook; a script in source control is not a deployed scheduler.

SMS/email stress notifications, delivery retries/consent and the complete provider write lifecycle remain unverified release work. Two-observation comparison needs multiple actual observation dates. Provider estimates require field validation; passing software checks does not validate agronomic ground truth or imply complete Farmonaut feature parity.
# Reviewed on 18 November 2026

Local satellite development results and remaining limits are recorded in [local development delivery](LOCAL-DEVELOPMENT-DELIVERY.md). The final production bundle passed 48 unit tests, zero-error/zero-warning Svelte checks, a build, 18 browser pages with zero uncaught errors, disposable account isolation and the sample field-change approval/archive/alert/export flow. Migrations 012–016 are applied. Live worker field/inventory reads succeeded. Actual GeoTIFF retrieval timed out; live overlay alignment remains unverified. Paid field edits and historical requests were not exercised against active farms. External stress delivery remains off because no SMS provider or verified sender is configured.

Production dependencies audit clean. Development-only transitive picomatch advisories remain without an upstream patch; see the linked delivery note. Vercel deployment is deferred.
