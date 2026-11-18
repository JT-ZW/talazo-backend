# Talazo pre-deployment review — 18 November 2026

**Decision: proceed to a protected pilot preview after configuring its hosting. Do not treat this as full public-production approval or native-provider feature parity. No deployment was created during this review.**

## Verified

| Area | Evidence | Result |
| --- | --- | --- |
| Unit suite | 49 tests | Pass |
| Type checks | Zero errors, zero warnings | Pass |
| Standalone production build | Node 24 build | Pass |
| Vercel output | Official adapter 7.0.4; Linux CI builds both targets | Pass in CI |
| Dependency audit | Production and complete graph, including development tools | Zero known vulnerabilities at review time |
| Source and browser credentials | Tracked-file scan; generated browser bundle compared with local private credentials | No private credential match |
| Authentication | Disposable password activation, repeated save, mismatch/minimum length, login/logout | Pass |
| Access control | Cross-user reads, suspended/unapproved accounts, forged admin metadata, direct writes, quota escalation and cross-origin forms | Denied as expected |
| Database rules | Rollback-only PostGIS area/overlap, quota/reservation, duplicate claim, RLS and role checks | Pass |
| Sync and mutations | Rollback-only job/field leases, backoff, expired lease recovery, checked field changes and stale tokens | Pass |
| Alerts/history | Owner preferences, acknowledgement, cross-user denial, history approval and deduplication | Pass |
| Sample end-to-end | Farmer change request, denied farmer approval, admin completion, archived prior observations, cleared stale products and scoped CSV | Pass; no paid provider writes |
| Browser | Six admin and twelve farmer pages; desktop/tablet/mobile; drawing/import/area; navigation, alert confirmation and logout | Pass, zero uncaught errors |
| Forecast views | Daily unavailable-hourly state, weekly data, calendar actual-date coverage and month navigation | Pass |
| Maps | Real Google satellite tiles, saved field outline, map modes and original-image switch | Pass; not proof of a working crop overlay |
| Live integration | NDVI, NDRE, NDMI, SOC and radar imagery; index area breakdowns; structured health/pest/weed/fertilizer/irrigation/soil/yield advice | Available on the existing approved field |
| Live reports/weather | PDF generation; seven daily forecasts; cached reads, invalid-date and unrelated-user denial | Pass |

Linux build evidence: https://github.com/JT-ZW/talazo-backend/actions/runs/44380250695 (commit `8dc0c89`). The complete Vercel build could not finish on this Windows host because creating the adapter's function symlinks requires a Windows privilege not available to the process. The same build completed on the Linux CI runner; no adapter internals were patched or checks bypassed.

## Fixes from this review

- Added official Vercel output selection when `VERCEL=1`, retaining the standalone Node adapter for localhost. The Vercel function runtime is Node 24 with a 240-second maximum duration; verify the chosen hosting plan supports that configuration.
- Added both Node and Vercel builds to CI and excluded local `.vercel/` artifacts from Git.
- Made the browser alert-save check wait for page interactivity. A focused POST check confirmed HTTP 200 and the actual save confirmation; the full browser rerun then passed.
- Made disposable password QA accept a local `ORIGIN` so it can test the production bundle rather than a development server.
- Tightened the live-monitoring release script: an unavailable report or area breakdown now fails that check instead of allowing imagery success to conceal a partial integration failure.

## Open gates

### Provider-dependent monitoring

1. **Geographic crop overlays are not verified.** The last GeoTIFF diagnostic returned HTTP 200 with an empty object instead of the documented raster URL. The UI displays the actual saved boundary and retains the original image separately; it does not invent spatial patches. See [forecast and mapped monitoring](FORECAST-AND-MAPPED-MONITORING.md) for evidence and a support draft.
2. **The interactive advisory report currently fails:** the live `getAdvisoryReport` request returned HTTP 500 during this audit. Structured crop advice and PDF generation succeeded. Resolve this with the provider or explicitly exclude that feature from the pilot offering.
3. **Hourly and full-month weather are unavailable in the current feed.** Daily and monthly interfaces disclose the actual seven-day coverage; no synthetic forecasts are produced.
4. Paid crop/date/boundary/pause/resume mutations and historical backfill were not exercised against real active fields in this audit. The checked lifecycle passes sample/mocked/rollback tests, but a designated live test field is still needed before promising every paid write path.
5. Confirm white-label rights and applicable attribution before public launch. Provider-generated documents, references and export provenance remain original.

### Security and operations

- **Administrator MFA:** the real administrator had zero verified MFA factors at review. Enrollment and application enforcement of the required assurance level remain launch work. No MFA requirement was switched on automatically, avoiding an administrator lockout.
- Set the final HTTPS origin and server/public environment variables in the hosting project. Update Supabase Site URL and allowed authentication redirects, and Google Maps browser-key referrer/API restrictions for the actual preview/production domains. Local success does not verify hosted authentication or map access.
- Configure and monitor a hosting scheduler. The local polling process is not a deployed service. The authenticated `/api/satellite/sync` endpoint handles one due field per field job and inventory separately; choose a cadence and capacity that cover all pilot fields within their refresh window. Keep `CRON_SECRET` server-only and verify unauthenticated calls remain denied on the hosted app.
- External email/SMS stress delivery is off. The current supported pilot uses private invitation links and in-app alerts. Verified SMTP/sender configuration and authorized-recipient invitation/recovery delivery tests are still needed for automated email onboarding.
- Perform a database backup restore exercise and configure error/uptime monitoring and operator alerts. Neither restoration nor hosted monitoring was established by localhost tests.
- Keep preview access restricted, use a designated test farmer and verify hosted login, ownership, invitations, imagery, weather, CSV/PDF and a scheduled refresh before inviting pilot farmers.

## Handling of real data

Existing farmer passwords/sessions were not reset. No real farm boundary/crop, paid registration, monitoring pause, backfill or external message was issued as QA. Authentication and browser checks used disposable identities and removed their fixtures. Database guard tests rolled back. Live calls refreshed ordinary read caches and generated the requested report reads. The unassigned provider field remains admin-only.
