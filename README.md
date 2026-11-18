# Talazo Agritech

An authenticated crop-monitoring portal built with Svelte 5 / SvelteKit, Supabase, Farmonaut and Google Maps. This repository contains the application server and farmer/admin interfaces; the public marketing website is separate.

## Current workflow

Administrators approve and invite farmers, declare the paid monthly hectare quota, allocate hectares and review monitoring requests. Farmers activate their accounts, create farms with multiple mapped fields, enter crop and planting details and request satellite monitoring.

Connected fields support dated satellite imagery, index distributions and trends, weather forecasts, structured crop-health/pest/weed/nutrient/irrigation/yield/soil advice, reports and a field activity register. Supabase row-level security scopes records to their owners; administrator membership is stored in the database. Provider predictions remain estimates and are labelled accordingly. The app does not claim every feature of Farmonaut's own application.

## Local setup

Requires Node.js 24 and a Supabase project. Google Maps requires a browser key with Maps JavaScript API enabled and appropriate website restrictions. Farmonaut credentials remain on the server.

```powershell
npm ci
Copy-Item .env.example .env
# Fill the local configuration; never commit .env.
npm run dev
```

Open http://127.0.0.1:5174. Configure both `PUBLIC_SUPABASE_URL` and server-only `SUPABASE_URL`, the publishable and service keys, and `SUPABASE_DB_URL` for operator migrations. Use `FARMONAUT_TEST_MODE=true` for sample responses; live mode requires an authorized paid account and approved field mapping.

For the web app and automatic satellite polling together, use `npm run dev:local` instead of `npm run dev` after stopping the older dev process. See [local satellite workflows and checks](docs/LOCAL-DEVELOPMENT-DELIVERY.md) for field/season edits, mapped imagery, history, CSV exports, in-app alerts and the later Vercel release gates.

Apply the additive files under `supabase/pilot/` in numeric order using `node --env-file=.env scripts/apply-pilot.mjs <filename.sql>` against the intended database. The pilot expects the base platform schema, including `platform_admins` and `profiles`; review `supabase/migrations/001_foundation.sql` before provisioning a new database. Do not run historical migrations blindly on an existing database.

To bootstrap an administrator, inspect `scripts/bootstrap-admin.mjs` and supply the intended email as its argument. It creates a private activation link locally; rerunning for an existing administrator can invalidate earlier links. Do not use it during ordinary QA.

## Validation

```powershell
npm test
npm run check
npm run build
# Optional hosted/local integration checks; use an isolated QA project when possible:
node --env-file=.env scripts/test-hosted-pilot.mjs
node --env-file=.env scripts/test-password-flow.mjs
node --env-file=.env scripts/test-account-isolation.mjs
node --env-file=.env scripts/test-browser.mjs
```

Browser QA uses installed Google Chrome in a separate headless session, disposable Auth identities and browser-only captures under ignored `test-results/`. It reads existing monitored fields and tests map drawing without saving or registering a field. It requires the local app running and database/service credentials. Hosted quota checks always roll back. Do not run the historical `test-pilot-flow.mjs` or `test-portal-http.mjs` against an active real administrator; those scripts predate disposable-account tests.

## Deployment and remaining release gates

The Node adapter builds to `build/`. Configure environment variables on the host, set `ORIGIN` to the HTTPS application origin, and run `node build` with the intended `HOST`/`PORT`. Never upload `.env`, activation links, database files or browser artifacts.

Before public release, configure Auth redirect URLs and verified SMTP, administrator MFA, backup/restore and monitoring, and a scheduled satellite worker or verified webhook flow. `npm run satellite:worker` is an available worker command, not a deployed scheduler. Automated SMS/email stress notifications and full provider write-lifecycle coverage remain separate release work. The organization and hardware prototypes are deferred and not production features.

See the [Farmonaut parity audit and delivery backlog](docs/FARMONAUT-PARITY-AUDIT.md), [release checks](docs/RELEASE-CHECKS.md), [satellite operations](docs/SATELLITE-OPERATIONS.md), [field workflows](docs/FIELD-WORKFLOWS.md), [monitoring workspace](docs/MONITORING-WORKSPACE.md) and [Google Maps setup](docs/GOOGLE-MAPS-SETUP.md). Historical design documents may describe planned rather than implemented capabilities. Local live-account diagnostic notes are excluded from Git.
