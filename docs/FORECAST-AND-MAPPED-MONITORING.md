# Forecast periods and mapped monitoring — 18 November 2026

## Implemented locally

Daily, Weekly and Monthly weather view controls are available. The Daily view renders hourly rows when an actual `hourly` array is returned; otherwise it shows the selected day's summary and explicitly states that hourly data is unavailable. The live Farmonaut feed currently returns only seven daily records. Monthly is a calendar of those actual forecast dates, with no predictions for the rest of the month. A month-ahead forecast needs another supported provider product; daily totals are never divided into synthetic hours.

The shared viewer used by satellite monitoring, crop health, pests, weeds, nutrients, irrigation, yield and soil now starts with Google Maps. It draws the saved field outline, supports map styles, opacity, fit, layer/date changes and automatically requests the georeferenced product. The original dated provider image remains available in its own tab. Index imagery uses crisp source-pixel rendering rather than smoothing. No additional zones are fabricated.

## Live spatial blocker

A longer diagnostic request to `generate_geotif_file` returned HTTP 200 with `{}` instead of the documented `{ "URL": "..." }`. Regular `getFieldImage` PNG retrieval succeeds. The PNG has no independently verified raster extent; field boundary bounds alone do not establish the full image's affine transform or padding. It is therefore not stretched onto the field.

The current field is approximately 0.145 ha. Such a small field can contain only a few source pixels. More visual patch detail cannot be promised without the actual raster resolution and spatial data. Field-average advisory values, index area histograms and the nine-cell inspection references do not establish precise pest/weed/nutrient hotspot polygons.

Current renderer supports north-up RGB/palette GeoTIFFs in EPSG:4326 and EPSG:3857 with verified field coverage, transparency and clipping. Other CRSs and numeric-only rasters require explicit reprojection and a documented index/no-data/palette contract. They fail closed until that is implemented and validated on the provider's actual files.

## Farmonaut support request (draft, not sent)

Please investigate our production API's `generate_geotif_file` operation. For an existing active field and a sensed day returned by `getSensedDays`, the request `{FieldID: <our field ID>, SensedDay: <that sensed day>, ImageType: "ndvi", isTesting: false}` returns HTTP 200 with an empty JSON object after extended processing. `getFieldImage` for the same field/day succeeds. The documented response is an object containing `URL`.

1. Please enable or repair georeferenced export and provide a working response for our field.
2. Confirm the CRS/EPSG, affine transform, native pixel resolution, no-data mask and numeric value scale. Provide the exact palette/class thresholds used by the native platform.
3. Is there a supported authenticated XYZ/WMTS/WMS tile service or vector-zone endpoint for native-equivalent mapping? If so, please provide its API and redistribution terms.
4. Which pest, weed, irrigation, nutrient, soil and yield outputs include actual spatial geometry or per-pixel values, versus field-level estimates? Please provide schemas and confidence/source metadata.
5. Our forecast response contains only `daily`. Is hourly weather available under this subscription/API? Is a longer forecast product available, with horizon and accuracy limitations?

## Verification

Type checks and build passed. Weather normalization and georeferenced-raster fixtures pass. Isolated Chrome checks cover actual forecast dates, monthly navigation, unavailable-hourly state, map/image switching, original-image loading and responsive overflow. Live overlays are **not** verified: no usable GeoTIFF was returned. No provider field edits, historical backfill or external messages were sent.
