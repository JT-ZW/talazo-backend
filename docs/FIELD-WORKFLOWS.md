# Farmer field workflow — 14 November 2026

## API-connected visual explorer and themed calendars

Native date/month popups have been replaced with a Talazo calendar for planting dates, field activities and paid-month selection. The component uses forest/cream styling, month/year controls, date constraints, text entry, keyboard day/week/month navigation, Escape dismissal and form validation. Dates use Africa/Harare for Today and remain ISO values for server actions.

Satellite monitoring and the six crop pages now use an advisory sidebar and a large provider-image explorer. Active views automatically POST to `/api/satellite/view` for the selected field, image layer and pass date; imagery and the structured advisory load independently. The explorer has optical/radar-specific date lists, colour legends, zoom/pan/fit controls, source dates and sample/live labels. NDRE is the default nutrient context and NDMI the default irrigation context. Pest and weed imagery remains explicitly vegetation context, not a claim of confirmed pest or weed localization. No synthetic heatmaps or made-up percentages are generated. Images are displayed in provider image coordinates rather than placed over an unverified geographic bounding box.

Migration 007 adds product caching, database leases to deduplicate concurrent calls, error backoff, RLS and owner-scoped refresh throttling. Cache keys include local monitoring identity, product/layer and observation date; the monitoring record fixes the test/live environment. Image links must return actual image content from a supported public provider CDN before being reported ready. New observations are checked automatically while a monitoring page is open; the scheduled worker remains available for background updates.

Live field registration and verified imagery are connected. Failed or ambiguous registrations require administrator reconciliation against the provider boundary before any retry. Sample and live mappings remain separate.

Verification distinguishes returned URLs from usable assets: API workflow checks exercise imagery and advice requests, actual image-link validation/error handling, cache isolation, date restrictions, same-origin checks and refresh throttling. Isolated browser-only desktop/tablet/mobile checks are available through scripts/test-browser.mjs; see RELEASE-CHECKS.md for current validation scope.

## Dedicated crop pages and map containment

Farmer navigation now includes `/portal/health`, `/portal/pests`, `/portal/weeds`, `/portal/nutrients`, `/portal/irrigation` and `/portal/yield`. The entries are visible but disabled until an accessible field has active monitoring with a provider mapping in the configured test/live environment. Paused, pending and unmapped fields do not activate them. Direct visits before activation show setup guidance. Active pages restrict farm/field choices to eligible fields and retain observation-date selection; each page renders its own advisory topic, source timestamps and selected field context. Crop health also includes the NDVI history. Existing inline advisory tabs remain on the general satellite and analysis screens.

Generating new advice requires active monitoring on the server, including when a cached advisory exists. Read-only historic information on the general analysis screen is retained. No changes to provider registration, subscriptions or client approvals were made in this pass.

An embedded byte-order mark before the map wrapper CSS selector was removed. The wrapper is now positioned, isolated and clipped, so the area label stays within the map. The portal content has its own stacking context below the independently scrolling sidebar, including the mobile navigation drawer.

`tests/insight-pages.test.js` verifies activation and environment isolation. The disposable farmer HTTP workflow checks all six routes before activation, after activation, and after pausing, plus advisory authorization and the presence of standalone content rather than the inline topic switcher. Visual scroll interaction remains unverified by a browser automation session.

## Crop names, button alignment and drawing area update

Farmers now type their own crop names. PostgreSQL retains the original text in `crop_entered_name` and resolves exact known names/aliases to a canonical `crop_code` and `crop_name`. For example, corn reports as Maize and soya beans as Soybean. The catalog contains 143 named provider crops; unmatched names use code 999 and appear in the admin review queue. Client-submitted codes cannot override this classification. The admin `/admin/crops` screen aggregates canonical crops by field count, farmer count and authoritative mapped hectares, and can approve a classification and alias. Unknown names remain separate from specific crop totals. Live provider mappings cannot silently be reclassified; advisory caches are invalidated when classification changes. The original wording remains available for review.

Migrations 005 and 006 add the catalog, name-preservation column, normalization trigger and administrator classification RPC. Both are applied. Classification approval is serialized to prevent concurrent alias decisions from mapping the same spelling to different crops. Unknown crops can still use satellite monitoring under the provider's Other code; crop-specific AI advice requires a recognized classification.

The drawing map displays a live approximate hectares badge and an allocation panel. The panel uses the selected farm owner's current monthly allocation, plus that owner's saved fields across farms, instead of an administrator-wide allocation total. It warns when the projected mapped area exceeds the allowance. It permits saving land; the existing monitoring-approval quota enforcement remains authoritative. PostGIS confirms ellipsoidal area on save, and the server returns an over-allocation warning from saved figures. The preview uses spherical area and rejects obvious crossing/incomplete polygons; PostgreSQL performs complete geometry validation.

Portal action buttons share consistent heights, spacing, focus, hover and disabled states. Form labels no longer carry bottom margins that lower adjacent action buttons; the coordinate-navigation row uses a responsive grid with aligned inputs and Find on map.

The active application is `/portal/*` and `/admin/*`. Older preview-readiness documents describe an earlier inspection snapshot.

## Registration

One approved farmer can create multiple farms; each farm can contain multiple independently monitored fields. `talazo_zones` is the pilot field record. The farmer creates a farm, adds a named field, maps its polygon, selects a crop and optionally records an actual planting date and characteristics. Further fields use the same form. Successful field saving clears its drawing and form for the next field.

The map supports corner placement, draggable corner markers, undo, clear, finish/resume drawing, coordinate navigation, latitude/longitude corner lists and GeoJSON import/review. GeoJSON uses longitude first. PostgreSQL/PostGIS remains authoritative for area, valid geometry, size and overlap checks. Requesting monitoring is separate from saving land; existing administrator allocation and approval checks still apply.

Administrator self-owned farms explicitly create the administrator's farmer profile when needed. Creating farms for another owner remains restricted to administrators.

## Satellite reference basemap

The active application now uses the official Google Maps JavaScript API for all reference maps, with satellite, hybrid, street and terrain controls. Set PUBLIC_GOOGLE_MAPS_API_KEY using a website/API-restricted browser key. Field registration, saved-field review, admin boundary review, weather locations and crop-topic reference maps share this integration. Leaflet and the old XYZ basemap configuration have been removed. Coordinate entry remains available without a key. See GOOGLE-MAPS-SETUP.md for setup and validation. Google reference imagery and dated Farmonaut crop observations keep separate source/date context.

## Weather

Farm and field selectors scope the screen. A saved polygon can request `getForecastWeatherFromLatLong` before monitoring registration. The server derives its bounding-box midpoint from the authorized stored boundary and requests the normal weather format; the client cannot submit arbitrary provider field IDs or coordinates. Results are cached per field and test/live environment for 15 minutes. Registered-field weather remains a fallback from synchronization.

The screen displays daily temperature highs/lows, rain probability, rain quantity, humidity and wind, plus a temperature chart. Kelvin is converted to Celsius; unknown readings remain unavailable. Seven entries are displayed even if the provider returns more. Sample dates are displayed as received, not relabeled as today's actual weather.

## Crop insights and reports

The structured advisory button calls `askJeevnAPI` using the authorized mapping, crop, actual planting date and selected available observation. Persisted advisory products include requested date, retrieval date and provider observation date. The six topic views cover crop-health classifications, pests/diseases, weeds, nutrients, irrigation and yield outlook. Advice is cached for 15 minutes for the same observation; missing topics remain unavailable. The screen renders provider values and units without inventing risk percentages or interpreting satellite estimates as soil laboratory results. The existing dated imagery, index history, inspection-grid flags, PDF/advisory reports and GeoTIFF outputs remain available.

Marketing product screenshots are not an API response contract. JEEVN AI advisory and potential pest/weed lists are estimates requiring field confirmation. Yield is an outlook, not a guaranteed harvest. This implementation does not reproduce Farmonaut's proprietary 3D renderer or claim its product screenshot features are all exposed through the API.

## Traceability

The field passport records actual dated operations, notes with quantities/units and optional input/harvest/delivery batch references. It exports a JSON field record including the boundary and activity history. These are farmer-entered provenance records, not certification of sustainable sourcing or regulatory compliance. No separate public Farmonaut certification endpoint was identified.

## Database and verification

Additive migration `supabase/pilot/004_field_workflows.sql` adds an environment-scoped weather cache, an activity ledger with RLS, and the validated `talazo_log_activity` RPC. It has been applied to the connected project. Existing farms, fields, quotas and monitoring records are retained.

`scripts/test-field-workflows.mjs` exercises HTTP actions with a disposable approved farmer, two fields, sample weather/advisory requests, stored activity records and cross-user access denial. It never logs in as the actual administrator, sends mail or registers paid fields, and removes its own test identity and farm data. `tests/weather.test.js` checks units, missing readings and coordinate order. Browser-based visual and drag interaction verification remains outstanding because browser automation was unavailable in this session.
