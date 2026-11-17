# Farmonaut parity audit and delivery backlog

Reviewed 17 November 2026 against commit `0a0aa70`, the public [Farmonaut API reference](https://farmonaut.com/farmonaut-satellite-weather-api-developer-docs), the native-app screenshots supplied by the owner, and Talazo's [16 November validation record](RELEASE-CHECKS.md).

This is a source/documentation audit, not a new test of every native screen or account entitlement. No provider fields, subscription settings or webhooks were changed. Native screens not shown in the supplied evidence remain unreviewed. A listed endpoint, an implemented caller, a passing live test and a deployed service are different levels of evidence.

## Decision

Keep Talazo's own farmer identity, approvals, allocation controls and branded monitoring workspace. Complete the safe field lifecycle and automated data delivery first, then geospatial visualization and seasonal analysis. Treat exact native appearance as a separate objective from equivalent farmer outcomes. Do not use endpoint counts as a completion percentage.

The server currently allows 19 of the 42 documented endpoint names. Several remaining functions duplicate outcomes Talazo already provides locally. Some existing callers also need broader validation; adding the other names would not establish parity.

## Farmer experience checklist

Status: **verified** means the recorded live/browser tests covered the stated scope; **partial** means code exists but the complete outcome is missing or unverified; **missing** means no complete application flow was found; **confirm** requires provider evidence/access.

| Farmer/admin outcome | Current evidence | Gap and next action | Priority |
| --- | --- | --- | --- |
| Invitation, approval, password activation and login | Verified with disposable identities | Verify real invitation/recovery delivery; complete administrator MFA | P0 |
| Only the correct farmer's data is visible | Verified HTTP/RLS denial tests | Extend isolation regression tests to each new endpoint, worker and export | Every change |
| Several farms/fields under one farmer | Farm/field records and setup flow exist | Exercise a realistic multi-field portfolio without paid duplicate registrations | P0 |
| Draw/import a boundary on Google Maps | Verified modes, drawing, coordinate import and area preview | Add broader polygon import/edit usability fixtures as required | P1 |
| Registration within allocated hectares | Transactional checks and live registration previously verified | Reconcile externally consumed capacity; quotas are declared in Talazo, not automatically verified subscription balances | P0 |
| Both-way field access | Verified inbound inventory; mapped metadata reconciliation | Native field discovery stays admin-only until an owner is explicitly assigned; Test Farm remains unassigned | Preserve |
| Change season crop or planting date | Free-text crop classification and initial registration exist | Add a reviewed change workflow; synchronize provider changes and invalidate old products | P0 |
| Edit a registered boundary | Incoming geometry changes require review | Add outbound editing with quota reservation and uncertain-write recovery | P1 |
| Pause/resume connected monitoring | Callers and confirmation handling exist | Complete the write-lifecycle test on a designated disposable provider field; do not exercise it on an active farmer field | P1 |
| Archive, restore and expiry handling | No complete outbound lifecycle | Preserve local history and reserved capacity until provider outcome is confirmed | P1 |
| Dated optical/radar imagery | Verified five image layers on one approved field | All ten selectable layers need a live compatibility matrix; missing products must stay explicit | P0 |
| Historical trend and image comparison | Trend and comparison UI exist | Only one date was available in the recorded test; validate two genuine observations and history backfill | P1 |
| Heatmap over the actual map | Provider raster viewer and separate boundary map | Build verified georeferencing; validate CRS, bounds, orientation, transparency and clipping before overlay | P1 |
| Cloud and observation quality | Some quality context exists | Unify failed/usable/cloud-affected dates and radar fallback across dashboard and topic views | P0 |
| Crop health and index distributions | Verified dated percentages and area bins | Keep raster classified area distinct from mapped area; add explicit freshness throughout | P0 |
| Pest/disease and weed information | Verified structured risk cards and suggestions | These are predicted field-level risks; exact spatial hotspots remain unconfirmed | Confirm |
| Nutrients and irrigation | Verified advisory retrieval and strict unit/date parsing | Broaden crops/units/zero-value tests; recommendations are not laboratory readings or measured soil moisture | P1 |
| Yield and soil information | Verified advisory topics and pages | Validate units, harvest dates and estimates against additional crops; no independent yield ground-truth validation | P1 |
| Crop/water inspection flags | Text references already displayed in Analysis | Confirm grid orientation/geometry; do not convert cell references to arbitrary polygons | P1 / confirm |
| Current weather and field forecast | Current caller exists; seven-day forecast verified | Add historical weather, rainfall context and field-specific current-condition validation | P1 |
| Reports and downloads | PDF/advisory links verified | Verify download content, GeoTIFF output and branding/languages; links alone do not prove all formats work | P1 |
| Automatic updates without an open browser | Protected endpoint and local worker exist | Deploy a durable scheduler, track last success/failures and prove recovery after downtime | P0 |
| Stress notifications | Process toasts exist; agronomic alert delivery is missing | Add persistent alert rules, consent/preferences, outbox, deduplication, retries and delivery history | P0 |
| Field scouting and action feedback | Local field activities exist | Add located observations/photos/tasks and completion history if required; no provider task sync established | P2 |
| Traceability and sustainable sourcing | Boundary/owner/activity records are a foundation | Define evidence and provenance exports; no verified compliance workflow or certification exists | P2 |
| Organization portal | Independent-farmer pilot is the current scope | Design organization membership and consent before multi-farmer delegated access | Later |
| Native 3D, animated hotspots, countdowns and gamification | Screenshots only | Provider confirmation or separate Talazo design; decorative elements must not imply unavailable measurements | P2 / confirm |

## Public endpoint coverage

Endpoint identifiers below come from the API reference. **Caller** means an implemented Talazo caller, not complete live validation. **Absent** means absent from the server adapter allowlist. **Alternative** identifies an existing local/batch path, not a claim that its output is identical.

| Endpoint | Talazo source assessment |
| --- | --- |
| `submitField` | Caller; reviewed registration and uncertain-result reconciliation |
| `getFarmerData` | Caller; identity/boundary checks and minimized inbound metadata |
| `getAllFieldIDs` | Caller; verified admin inventory and ownership assignment boundary |
| `getFieldAreaByBoundaryPoints` | Absent; alternative PostGIS/local area calculation |
| `change_field_data` | Caller; current UI sends description/address only |
| `modifyFieldPoints` | Absent |
| `updateCropCode` | Absent; local classification is not a complete season-update workflow |
| `updateSowingDate` | Absent |
| `deleteField` | Absent |
| `getAllDeletedFields` | Absent |
| `restoreDeletedFields` | Absent |
| `getExpiredFarms` | Absent |
| `getSensedDays` | Caller; available optical dates and cached visit metadata |
| `getSARDays` | Caller; independent radar dates |
| `pauseFieldMonitoring` | Caller; production write test still outstanding |
| `resumeFieldMonitoring` | Caller; production write test still outstanding |
| `addMonthsToFarm` | Absent; confirm applicability to this subscription before considering |
| `requestPreviousSatelliteData` | Absent |
| `requestBulkHistoricalSatelliteData` | Absent |
| `getFieldImage` | Caller; five layers live-verified, ten selectable |
| `generate_geotif_file` | Caller; report/download path, not a verified map overlay |
| `getIndexValue` | Absent; alternative batch index retrieval |
| `getIndexValuesBasedOnSenseddays` | Absent; alternative all-index retrieval |
| `getAllIndexValues` | Caller; dashboard/analysis/trend source |
| `getFieldIndexBreakdown` | Caller; verified chart/bins |
| `getFieldIndexAreaImage` | Absent; alternative local distribution chart |
| `getPresentWeather` | Caller; cached observation product |
| `getForecastWeather` | Caller; cached observation product |
| `getForecastWeatherFromLatLong` | Caller; live forecast verified |
| `getHistoricalFieldWeather` | Absent |
| `getPastWeatherGraph` | Absent |
| `getFieldReport` | Caller; live report link verified |
| `addReportLanguage` | Absent |
| `removeReportLanguage` | Absent |
| `askJeevnAPI` | Caller; dated structured topics verified |
| `getAdvisoryReport` | Caller; live report link verified |
| `getDatabase` | Absent |
| `submitOrUpdateFarmPolygon` | Absent; local fields are not provider child-polygons |
| `getPolygonFarmerData` | Absent |
| `deleteFarmPolygons` | Absent |
| `getMyUsage` | Caller; connection check is not subscription capacity verification |
| `setup_webhook` | Absent; polling code exists |

Source pointers: [adapter](../src/lib/server/farmonaut.mjs), [actions](../src/lib/server/portal.ts), [observation sync](../src/lib/server/pilot.ts), [product cache](../src/lib/server/products.ts), [inventory sync](../src/lib/server/provider-account.ts), [scheduled endpoint](../src/routes/api/satellite/sync/+server.ts), [imagery options](../src/lib/imagery.mjs), [workspace](MONITORING-WORKSPACE.md).

## Provider facts requiring attention

The reference describes GeoTIFF georeferencing, optional visit alert arrays, history requests and webhook registration. Child polygons require selected enterprise access. Embedded drawing/viewing is an add-on with a separate iframe key. Branding needs provider coordination. None establishes access to the complete native 3D/advisory interface. [Official reference](https://farmonaut.com/farmonaut-satellite-weather-api-developer-docs).

The documented webhook registration does not establish an authenticated event contract for Talazo. Treat callbacks as untrusted hints until signature/replay rules are confirmed; re-fetch authorized field data server-side. Do not grant access from a callback-supplied owner or field ID.

Likewise, field-wide predictions, raster pixels, numeric index bins and inspection references are separate data products. Confirm the missing spatial contract before displaying native-style pest locations or nutrient prescription polygons. A plain image URL is not sufficient evidence of geographic alignment.

## Delivery sequence and acceptance criteria

### A. Reliable production foundation — P0

1. Deploy the existing polling job on the chosen host with server-only credentials, concurrency limits, bounded retries and job health reporting. Address the current single-request batch/runtime limit before scaling beyond the pilot.
2. Surface observation date, retrieval time, stale/error states and cloud quality consistently. Record new-observation events without creating duplicate farmer alerts.
3. Verify invitation/recovery delivery, administrator MFA, restore procedures and monitoring in the actual deployment.

Exit: updates arrive with all browsers closed; an interrupted run resumes safely; wrong-owner access fails; unavailable data preserves the last dated result; support can identify the failing field/product without seeing credentials. New observation date and retrieval date remain distinct.

### B. Safe field and season changes — P0/P1

Create a pending change record containing actor, owner, previous/new values, capacity delta and expected provider identity. Reserve additional capacity transactionally before sending a boundary change. Keep uncertain provider writes pending; reconcile with read-back rather than blindly retrying. Confirm ownership and approved status again before committing. Clear incompatible observations/products only after a confirmed change, while retaining an audit trail.

Exit: crop/date edits agree on both sides; geometry changes cannot exceed quota; timeout/retry creates neither duplicate fields nor released capacity; stale refreshes cannot restore previous-season advice. Destructive lifecycle tests use a separately designated disposable field and its paid allowance.

### C. Accurate map-based monitoring — P1

Start with one verified optical layer and one radar layer. Validate georeferenced output using asymmetric reference points, then align with the Google boundary map. Keep layer/sensor/date/units explicit. Add remaining layers only after their schema and entitlement are verified. Show inspection flags without inventing exact coordinates until the provider confirms their spatial definition.

Exit: independently checked alignment on multiple differently shaped fields; correct optical/radar dates; no overlay outside the intended field; unavailable layer fallback; mobile controls and attribution work. Test comparison with two genuine observations.

### D. Decisions, history and reporting — P1

Add controlled historical requests after cost confirmation, seasonal trends, weather history, report languages and provenance-rich exports. Preserve the provider's returned units and explanations. Connect scouting actions to the selected field/observation and retain who confirmed them.

Exit: multi-crop and multi-date fixtures pass; missing values remain missing; estimates stay labelled; exported reports match the selected owner, field and date. A treatment suggestion is not recorded as an application until the farmer confirms an activity.

### E. Spatial advice and native extras — conditional

Implement spatial risk/prescription views only after receiving verified geometry, semantics, confidence and usage rights. Evaluate embedding on a segregated test account before exposing any key to a farmer. If these data are unavailable, keep the current honest advisory sidebar and build independent analytics only as a separately scoped, validated product.

Exit: demonstrated tenant isolation and licensed feature access, with documented field/date correspondence. Native-only screens not covered by the API remain explicitly out of parity scope.

## Questions for Farmonaut — draft, not sent

1. Which public and additional endpoints are enabled for our paid production subscription? Can you provide an entitlement matrix, versioned schema and representative production responses for each advisory topic?
2. Can Talazo create customer identities and redistribute outputs under Talazo branding? What attribution, logo, retention, caching, downloadable report and derived-product conditions apply?
3. What dataset drives the native pest/weed hotspots, nutrient zones, confidence badges and yield-zone percentages? Are geometries/tiles available with CRS, units, confidence, observation dates and schema definitions?
4. How are `cropRedZones` and `irrigationRedZones` numbered and oriented? Are they fixed grid identifiers or actual spatial geometries? Please provide an asymmetric example with coordinates.
5. How should we georeference returned PNGs and GeoTIFFs? Please confirm bounds, CRS, nodata/alpha treatment, pixel alignment, URL expiry and whether all enabled layers support GeoTIFF generation.
6. For webhooks, what are the exact payload/version, authentication/signature, retry, duplicate-event and replay rules? Can separate environments subscribe without overwriting each other?
7. Which history requests consume additional allowance, how are limits reported, and how can subscription hectare/parcel/visit capacity be queried? Does native-account activity reduce the same allowance as Talazo activity?
8. What are the effects of crop/date/boundary edits on existing products and billing? How do we detect processing completion, failed recalculation, expiry and restoration reliably?
9. Are child polygons available on our plan, and do they inherit monitoring/billing? Can farmer-managed zones map to them without duplicate registrations?
10. Does the optional embedded viewer include the newer 3D/advisory UI? Can its key be field-scoped, short-lived, domain-restricted and revoked? Can a user alter a URL to access other fields in the shared account?
11. Which native field-walk/tasks/feedback and traceability functions have supported APIs? Please distinguish evidence exports from any compliance or certification service.

## Scope and next development task

Begin with A, then the season-change workflow in B. Investigate C in parallel only as read-only geospatial validation. Provider replies determine E; they do not need to block improvements to Talazo's scheduler, freshness, safe edits or notifications.

Hardware remains outside this satellite-first pilot. Organization onboarding remains a later milestone. This audit adds a reviewed backlog; it does not alter live fields, activate add-ons or send the provider questions.
