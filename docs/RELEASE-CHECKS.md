# Validation and release checks

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
- `node scripts/check-source-secrets.mjs`: tracked-file checks against credential patterns and, when available locally, actual `.env` credentials. Values are never printed.

Historical test scripts that accept a real administrator email can invalidate its access links; do not run them as ordinary QA. Never run production write-lifecycle tests on a farmer's active field merely to exercise a button.

## Before public release

Configure the deployed HTTPS origin, Auth redirect allowlist, verified SMTP, administrator MFA, Google Maps browser restrictions, backup restore and error/uptime monitoring. Verify invitation/recovery delivery using an authorized recipient. Deploy and monitor the satellite scheduler or verified webhook; a script in source control is not a deployed scheduler.

SMS/email stress notifications, delivery retries/consent and the complete provider write lifecycle remain unverified release work. Two-observation comparison needs multiple actual observation dates. Provider estimates require field validation; passing software checks does not validate agronomic ground truth or imply complete Farmonaut feature parity.
