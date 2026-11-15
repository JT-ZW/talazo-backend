# Satellite-first pilot readiness — 14 November 2026

## Inspection evidence

Read-only inspection of the configured Supabase project's REST OpenAPI and exact row counts. See `supabase-schema.json`. No remote data or schema was changed. All 22 exposed tables were inspected; 21 have zero rows and audit_events has 51. Counts reflect inspection time only. Credentials and row contents were not saved.

The live schema is different from `supabase/migrations/001_foundation.sql`. Do not apply that old tenant-based draft to this project. Its permission reference tests do not validate the live database policies.

## Existing strengths

- Independent ownership through farms.owner_id; organizations, organization_memberships and farm_access provide a basis for later organization access.
- Farms and zones already have MultiPolygon boundaries in EPSG:4326.
- Crop seasons attach to zones and preserve seasonal history.
- Node assignments have start/end times and installation depth; readings reference assignments rather than a mutable current farm.
- Satellite observations, weather, alert rules, notification deliveries and audit records already exist.

## Changes needed before satellite integration

1. Decide whether a zone is the externally registered CropSense field. Current live model is farm → zone, with no separate fields table. For the pilot, treat zones as monitored plots and label this consistently rather than introduce an unnecessary hierarchy.
2. Add zone soil texture, irrigation, drainage, notes and extensible characteristics, with validation. Do not duplicate seasonal crop data on zones.
3. Add external farm/field registration mappings keyed by provider and local resource. Include registration state, last successful synchronization, sanitized failure details and boundary version/hash.
4. Extend satellite observations with stable external observation ID, fetched time, source platform, resolution, usable coverage, quality, processing version, additional named indices and provider metadata. Separate provider name from satellite platform. Enforce provider-scoped duplicate prevention. Preserve unknown values as null.
5. Define an asset-access strategy: private imagery assets or server-mediated provider references; do not expose provider tokens or save expiring signed URLs as permanent references.
6. Add synchronization jobs/cursors, bounded retries, backfill windows, failure tracking and quota controls. Never synchronize only when a dashboard is open.
7. Validate polygon geometry, meaningful area, boundary containment, coordinate order and area calculation; version boundaries so historical observations retain their spatial meaning.
8. Notification preferences currently expose no SMS preference. Deliveries need provider IDs, attempts, next retry, failure reason and duplicate protection before reliable delivery can be claimed.
9. Farm access needs explicit revocation/expiry decisions and tested role permissions. Later organization onboarding of farmers without accounts needs a farmer entity independent of auth profiles.

These are schema design recommendations, not applied migrations. Confirm existing constraints and policy definitions before preparing compatible additive migrations.

## Security verification still required

REST metadata does not expose RLS definitions, indexes, triggers or full constraints. A service-key read bypasses normal customer access controls and cannot prove isolation. Run `database-security-review.sql` through an authorized SQL connection/editor, then test real authenticated farmer A, farmer B, organization member, revoked access and platform administrator identities. Check select, insert, update, delete, asset access and ownership changes. Never allow users to grant themselves platform administration or change farm ownership through unrestricted updates.

No SQL connection credentials or management token were present among the inspected environment variable names. The supplied project URL and API keys support REST inspection, not arbitrary SQL catalog access.

## UI changes in this pass

- Farmer overview, soil monitoring, imagery and nodes now use honest empty connection states instead of fixture sensor values or a landscape photo presented in the monitoring journey.
- Both sources have distinct areas, source context and unavailable timestamps/coverage. Satellite moisture indices are explicitly distinguished from soil moisture.
- Setup guidance covers boundaries, zones, characteristics and seasons.
- All legacy workspace screens have an explicit preview notice. Registries, exports and actions are still demonstrations.
- Supabase client accepts PUBLIC_SUPABASE_PUBLISHABLE_KEY, with legacy public anon-key fallback. Secret keys remain server-only.

## Remaining user-flow work

The application remains preview-only. Implement registration/sign-in, email confirmation and password recovery, authenticated routing, profile creation, persistent farm/zone setup, map boundary drawing, crop-season editing, account-specific navigation and safe sign-out. Then wire server reads to RLS-backed repositories, provider registration and synchronization. The public preview workspace selector is not an authorization system. Do not enable live data mode until these are tested.

The next complete milestone is: authenticated farmer creates farm and mapped zone → records crop season → requests satellite registration → sees registration progress → sees a dated observation or actionable unavailable/error state.

## Visual QA limit

Browser discovery reported that the browser access host was unavailable. Desktop/mobile rendered appearance and interactive navigation were not visually verified in this pass; responsive rules alone are not evidence of visual QA.
