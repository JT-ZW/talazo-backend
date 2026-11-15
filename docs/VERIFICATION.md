# Verification · 01 November 2026

- Public site: `npm run check` passed with 0 errors / 0 warnings; `npm run build` passed with existing Vercel adapter.
- Talazo app: `npm run check` passed with 0 errors / 0 warnings; `npm test` passed all 4 authorization-policy tests; `npm run build` passed with Node adapter.
- Production HTTP smoke check: all 33 workspace pages returned 200 and sample-data/disconnected labels; internal links returned 200; unknown workspaces and unavailable workspace sections returned 404. API status reports disconnected. Data API GET/POST returned 503.
- Public HTTP smoke check: all 6 marketing pages returned 200; `/portal`, `/dashboard`, `/api/readings`, `/api/nodes` and `/api/crops` returned 404.
- Browser review: desktop at default 1265-pixel viewport, mobile at 390 × 844. Reviewed farmer overview, monitoring controls and government overview. Mobile menu and workspace switching worked; wide registers scroll within their panel.
- Browser actions: EC/history selection changed the chart; organization task completed; unmatched registry search showed a useful empty state; admin role editing updated the registry; native modal focused the close control and returned focus after saving; production sample provisioning created a queue record and survived navigation into sample audit activity.
- Sample CSV download completed and its contents were checked for the sample label and expected audit fields.
- Public browser review: original hero, public navigation, content and branding render; experimental portal link is absent.

The SQL draft has not been applied or executed against PostgreSQL. Policy unit tests are pure reference-logic tests, not evidence of deployed RLS. No Supabase, real device, live camera, authentication, billing, messaging or cloud deployment was tested or enabled. No mobile hardware or offline network simulation was performed. Google Fonts still require network access; local font fallback is provided. Preview servers used for verification are stopped at handover.
