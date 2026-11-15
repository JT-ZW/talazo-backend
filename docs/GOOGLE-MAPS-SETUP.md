# Google Maps setup

Add the browser API key to the prepared local `.env` entry:

```dotenv
PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_browser_key
```

Enable **Maps JavaScript API** in the Google Cloud project and attach billing. Restrict the key to **Websites / HTTP referrers** and restrict its API usage to **Maps JavaScript API**. For local development allow:

```text
http://127.0.0.1:5174/*
http://localhost:5174/*
```

Add the actual deployed Talazo portal origin before hosting. A separate production key is preferable. Never put the private Farmonaut or Supabase service key in this variable. The Google browser key is intentionally sent to Google's JavaScript SDK and is visible to browsers, so website/API restrictions matter. A Map ID, Places API, Geocoding API and the retired Drawing library are not required for this implementation.

After saving, restart the dev server if Vite does not reload the environment, then reload the browser. Administration > Integration health shows whether the browser key is configured. A configured key alone does not prove Google authorization; actual loading is checked in the browser.

If the console shows `ApiNotActivatedMapError`, select the project that owns the key in Google Cloud > APIs & Services > Library > Maps JavaScript API, and enable it. Having a key or enabling a different Maps API is insufficient. After activation, reload the page. Talazo now awaits the maps library explicitly, safely disposes incomplete SDK listeners and shows an authorization error instead of an endless loading/retry crash. Actual Google authorization remains dependent on the project configuration.

## Coverage

- Field registration: Google satellite by default, with satellite, hybrid, street and terrain controls; click to add corners, finish, drag native polygon handles, undo, clear, fit and full-screen.
- Coordinate navigation and typed boundary entry remain available. GeoJSON stays longitude/latitude; typed corner lists are latitude/longitude. The existing PostGIS validation, hectares and quota checks remain authoritative on save.
- Saved fields and administrator boundary review use the same map component.
- Weather location review uses the selected field's saved polygon.
- Crop health, pests/diseases, weeds, nutrients, irrigation, yield and soil reference maps all use Google Maps. Dated Farmonaut raster images retain their source and date in the crop viewer. They are not incorrectly stretched over a Google basemap without verified geographic alignment.
- Map style preference is remembered in the browser when local storage is available. The official SDK is requested once per browser session and reused by all map instances. Closed map panels are mounted only on opening to avoid unnecessary map creation.

Leaflet, its stylesheet and the old configurable XYZ tile settings have been removed from the active application. Google attribution and controls are retained. No Google satellite tile URLs are scraped or used outside the official SDK.

Google's reference imagery is not real-time. Detail, capture date and coverage depend on the location. Freshness is not established by choosing Google Maps; Farmonaut observation dates remain the source for crop monitoring dates.

## Verification

Unit tests cover SDK request reuse, missing-key/SSR behavior, coordinate order, closed-ring import, invalid coordinates and unchanged area calculations. Live map tiles, Google authorization and browser polygon interactions require the key to be saved and remain unverified until then.

After API activation, a hard reload of the user's existing Talazo Chrome tab was checked through native desktop UI automation. Google authorization succeeded and actual satellite, street, terrain and hybrid map tiles rendered. The `ApiNotActivatedMapError` and map-unavailable state cleared. Satellite mode was restored after testing. No farm records, boundaries or login sessions were changed. Polygon drawing and dragging were not exercised during this activation recheck.

Official references:

- https://developers.google.com/maps/documentation/javascript/load-maps-js-api
- https://developers.google.com/maps/documentation/javascript/maptypes
- https://developers.google.com/maps/documentation/javascript/shapes
- https://developers.google.com/maps/api-security-best-practices
- https://developers.google.com/maps/documentation/javascript/reference/drawing
