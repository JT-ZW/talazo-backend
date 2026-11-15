# Crop monitoring workspace

The Talazo interface uses a field viewer beside a focused advisory sidebar. Topic navigation covers crop health, pests/diseases, weeds, nutrients, irrigation, yield and soil insights. It uses actual dated Farmonaut responses, retaining Talazo branding and provider attribution.

## Response-to-view mapping

| View | Provider data | Display |
| --- | --- | --- |
| Health | `Satellite_Data` colour shares | Supplied percentages, stacked field classification and legend |
| Pests/diseases and weeds | `potential_diseases`, `potential_pests`, `potential_weeds` | Named predicted risks, supplied probability and expandable treatment suggestions |
| Nutrients | `advisory.Fertilizer` | Mineral product rate, product/formulation, organic alternative, returned units and application explanation |
| Irrigation | Dated `advisory.Irrigation` entries | Daily quantities, zero-watering days, time windows and method alternatives |
| Yield | `Growth and Yield Estimation` | Estimated yield, returned units, local range, harvest window/status |
| Soil | `Soil Management` | Predicted pH, organic carbon, salinity and provider labels |
| Field variation | `getFieldIndexBreakdown` | Ten index-range bins, areas in m², and proportions of returned classified area |
| Field imagery | `getFieldImage` | Verified provider raster, zoom/pan, fit, full-screen, date/layer selection and side-by-side observation comparison |

References and explanations remain available by topic. Modelled pH, nutrients and risk estimates are not represented as laboratory results or confirmed pest presence. Missing probabilities are not inferred from risk words. Nutrient product rates are not relabelled as elemental nutrient quantities. Actual provider observation dates must match the selected advisory date.

Changing an optical image date changes the main observation/advisory date. Radar dates remain independent and clearly labelled. Comparison is disabled until the chosen sensor has a second available date. Links between topic views retain the selected field ID, still subject to RLS and active monitoring checks.

## Accuracy boundaries

The native view is a 2D provider image viewer. No unverified geographic overlay or invented pest/nutrient polygons are applied. The separate reference map shows the saved field boundary; a licensed satellite basemap is still optional configuration. Farmonaut's 3D renderer, hotspot overlays, confidence badges, gamification and countdowns are not reproduced without corresponding verified API data. Its exact embeddable interface requires a separately issued iframe key.

Provider colour classes and index bins are different products: the application does not invent “good/bad” thresholds for the ten numeric index ranges. Percentages in the area chart use the returned classified raster area, which may differ slightly from the saved polygon area.

## Verification

Additive migration `008_monitoring_workspace.sql` expands the existing environment-scoped leased cache to SOC images and per-layer index distributions. The existing product RPC continues to enforce field access, active monitoring, actual observation dates, sensor dates, rate limits and error backoff.

`node --env-file=.env scripts/test-live-monitoring.mjs` checks the approved live mapping selected by TALAZO_QA_ZONE_ID using a disposable identity. It does not change the real admin session, send emails, create fields or alter provider boundaries. The test removes its own identity and temporary role. Unit tests verify date mismatch rejection, missing versus zero values, probability handling, nutrient units, irrigation scheduling and index distribution arithmetic.

Isolated browser checks and captures are available through scripts/test-browser.mjs. See RELEASE-CHECKS.md for current validation scope and remaining release gates.

Live API checks cover imagery, distributions, structured advisory and PDF/interactive report links on an explicitly selected approved field. A two-date live comparison requires a field with multiple observations.
