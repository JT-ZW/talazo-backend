# Satellite pilot — implementation and operation

Implemented 14 November 2026. Local application: http://127.0.0.1:5174. No public deployment was performed.

## Access

- `/login`: invitation-only application sign-in.
- `/admin/overview`: authenticated administrator operations.
- `/admin/users`: approve farmers; send through Supabase Auth email, optionally Resend, or generate a private single-use link. Existing approved users can receive a fresh access link. Suspended users must be reactivated first.
- `/admin/quota`: enter a paid monthly hectare quota and allocate total hectares to farmers. Values are stored as integer square metres. A configured quota is an administrator declaration, not a provider-verified subscription balance.
- `/admin/requests`: approve sample previews or live registrations, synchronize, pause, resume. Uncertain registration keeps capacity reserved; investigate with the provider before changing the database or resubmitting.
- `/portal/overview`, `/portal/farms`, `/portal/satellite`, `/portal/weather`, `/portal/analysis`, `/portal/account`: real authenticated farmer workflows. Former fixture workspace URLs redirect to sign-in. Internal hardware tools remain development-only.

The first administrator was prepared for the email explicitly supplied in the conversation. Its activation link is in `.admin-access-link.txt`, ignored by source control. Open that file locally, visit the link, continue, and choose your own password. Do not publish that file or link. `scripts/bootstrap-admin.mjs` regenerates the link if needed; regenerating invalidates previous links. The code never chooses the administrator's password.

## Farmer onboarding

1. Administrator opens Farmers & invitations, enters name/email, and chooses delivery.
2. Farmer follows the private link and sets a password. A mail security scanner cannot consume custom generated links merely by performing GET; the confirmation page requires Continue.
3. Administrator allocates hectares. Farm setup can happen before allocation, but monitoring approval cannot.
4. Farmer creates a farm, draws a growing-area polygon or enters GeoJSON, records crop/actual planting date/notes, and requests monitoring. Administrator can create a farmer-owned farm and use the farmer workspace to map its areas.
5. Administrator reviews the request. The database reserves capacity before the external operation. Duplicate approval cannot create a second registration claim.
6. Satellite observations are fetched into Supabase; the farmer reads their permitted data and generates dated image/PDF/advisory/GeoTIFF outputs. Sample results carry a prominent test-mode notice.

## Email and hosting configuration

Supabase native invitation email is implemented. Configure the application's actual URL in Supabase Auth → URL Configuration, including `/auth/landing`, and set server `ORIGIN` to that same public HTTPS origin. Configure custom SMTP for production delivery and review Auth email limits. Email submission success is not proof of delivery; real delivery was deliberately not tested by emailing disposable identities.

Default native invitation/recovery links land at `/auth/landing`; its browser handler explicitly installs the implicit token session into SSR cookies and removes URL fragments. Custom generated links use `/auth/confirm` with token-hash verification. Both flows lead to `/activate`; server-side identity/approval checks still apply. A partial native invitation failure remains fail-closed: if identity creation succeeds but approval fails, the user has no portal access until an administrator retries.

Disable public signup in Supabase Auth before launch. There is no public signup page, and unapproved Auth identities cannot access pilot records even if an identity is created externally. Configure verified production email rather than relying on development email delivery defaults. Optional Resend delivery uses `RESEND_API_KEY` and `INVITATION_FROM`.

## Database

Applied to the configured Supabase project:

- `supabase/pilot/002_satellite.sql`: isolated additive pilot tables and checked RPCs; preserves the original project tables/data.
- `supabase/pilot/003_monitoring_lifecycle.sql`: committed-area quota floor and pause/resume claim lifecycle.

Do not apply historical `supabase/migrations/001_foundation.sql`. Pilot tables use a `talazo_` prefix to avoid conflating the live schema with the old tenant draft. Existing `platform_admins` anchors administration; authenticated clients cannot mutate that role registry. RLS protects pilot records; mutations use checked security-definer functions with an empty search path. External workers use server credentials after validating the associated account.

Capacity updates serialize on the monthly quota row. Allocation totals cannot exceed the quota; allowances cannot be reduced below committed monitored area. New-month quotas cannot be below currently committed area. Registration locks both quota and request, counts each zone once, and rejects duplicate/in-progress claims. Pausing releases committed area only after provider confirmation (or explicitly local sample pause). Reducing the monthly quota also requires reducing existing farmer allowances. Old-month allocations are retained as ledger history; a new current-month allocation is required for new claims and scheduled refreshes.

## Farmonaut behavior verified

The saved key successfully returned non-billable test responses. Numeric index responses matched the index/date map; sensed days were a flat date map rather than the documented wrapper, so the parser supports both. Test-mode `submitField` returned placeholder text rather than a FieldID. Consequently, test mode does not create a remote field: it uses an isolated sample-only mapping for sample reads. Test/live mappings never mix. No live field was registered and no real-farm accuracy or commercial entitlement was established.

Live registration requires switching `FARMONAUT_TEST_MODE=false` explicitly after validating actual entitlement, provider commercial terms, imagery assets, and a controlled real-area test. A missing or invalid live create response becomes `uncertain`; no automatic blind retry occurs. Live pause/resume and every report product still need live-provider validation. There is no claim that the trial proves those production operations.

Imagery is presented as a dated provider output, separately from the OpenStreetMap reference boundary map; PNG georeferencing is not assumed. Asset links open over HTTPS after scoped authorization. Their expiry/retention and sharing rights need provider confirmation. No provider key is included in the browser bundle. Report defaults are English; UI translations and additional provider report languages are not yet implemented. Provider parcel and visit limits are separate from Talazo's hectare controls.

## Background synchronization

A private `SATELLITE_JOB_SECRET` has been configured locally. Run the app and, in a separate process:

```powershell
npm.cmd run satellite:worker
```

The worker calls `POST /api/satellite/sync` hourly; each eligible field has a six-hour freshness cooldown. Configure a persistent worker or hosting scheduler when deployed. The endpoint requires the private bearer secret, processes up to 20 oldest eligible records, skips accounts without a current allocation, and never exposes provider responses in scheduler logs. No persistent operating-system task or public deployment was installed. Admin manual refresh is available.

## Verification

- Type checking: zero errors/warnings.
- Ten Node tests: provider test-mode enforcement, body-level errors, timeout semantics, normalization and observed response shapes, plus existing reference policies.
- Disposable local PostgreSQL: simultaneous allocations against one cap; only one could succeed, plus role/ownership/suspension checks.
- Hosted rollback-only tests: actual PostGIS area and overlap validation, hectare limits, committed-area protection, new-month quota floor, duplicate claims, RLS isolation, admin escalation denial and suspension. Test data rolled back.
- HTTP authentication: all admin/farmer routes render under a verified session and deny unauthenticated admin access. Client HTML does not contain the provider key.
- Complete disposable flow: invitation link → approved account → quota → farm/polygon → monitoring request → sample synchronization → populated dashboard/weather/analysis → suspension. Fixture identity and records removed afterward; audit events retained.
- Production build completed. Rendered desktop/mobile visual QA could not be performed: the computer-use service stopped because it could not reliably identify the Chrome URL. No alternative browser automation was attempted.

## Remaining launch work

### Password and process feedback follow-up

Password forms now have independent Show/Hide controls. A repeated submission of an already-saved password is handled as a completed save, rather than a generic failure. Known password-policy, expired-session, rate-limit and service errors have specific messages. Passwords are never logged or echoed in action responses. A disposable identity verified first save, repeated same-password save, mismatch rejection and minimum length without changing the administrator's password or session.

The root layout now provides a focus-trapped native progress dialog and dismissible success/error notifications. Enhanced authentication and portal forms use the shared feedback handler, prevent duplicate submissions while processing, retain invalid form input and carry success feedback through dashboard navigation. The changes are type/build checked; rendered browser interaction verification remains unavailable as noted above.

Public HTTPS deployment; real email delivery and redirect checks; scheduler deployment; visual/keyboard/mobile interaction QA; MFA for administrators; live imagery/report/pause-resume validation; private asset retention policy; backup/restore exercise; provider agreement; and load/operational checks. The result is a functioning test-mode pilot, not a completed production release. Boundary/crop editing and multi-season history UI are follow-up work; existing growing areas cannot currently be edited in place. Uncertain registrations require support reconciliation rather than a risky resubmit button.
