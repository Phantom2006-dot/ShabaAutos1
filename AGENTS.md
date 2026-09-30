# ShabaAutos

Nigeria car marketplace — buy / rent / US-import / sell flows + staff/admin CMS.

## Run / Build
- Dev server (API + Vite): `npm run dev` (runs `tsx server.ts`)
- Frontend bundle: `npm run build:frontend` (vite → `dist/`)
- Backend bundle: `npm run build:backend` (esbuild → `dist/server.cjs`)
- **CAUTION**: `vite build` **wipes `dist/`** including `server.cjs` — always run `npm run build` (frontend+backend) or re-run `build:backend` after any frontend-only build before `npm start`.
- Start production: `PORT=12000 NODE_ENV=production node dist/server.cjs`

## Database
- `.env`: `DATABASE_URL` (Neon Postgres); `USE_SQLITE=true` fallback to SQLite.
- Site settings seeded at boot via `server/database/index.ts` `DEFAULT_SITE_SETTINGS` (import duty/freight/USD rates, rental chauffeur/insurance fees, sell doc/delivery fees, valuation base prices). Missing keys insert-only; admin-editable via `/api/ops/settings`.

## Key public routes
- `GET /api/settings/public` — rate/fee settings (booking/estimator/detail screens fetch with `fetchPublicSettings()`; env-var fallbacks with defaults in server.ts).
- `GET /api/vehicles`, `/api/me/saved-vehicles`, `/api/me/comparison`, `/api/me/saved-searches`, import/rental/inspection/submit endpoints — real DB-backed.


## Frontend conventions
- Real data flows come from `src/services/api.ts` (`apiFetch`, `fetchPublicSettings`, `fetchMySavedVehicles`, `fetchMyComparison`...); unauth `/api/me/*` → 401 `{success:false}` → UI must fall back to empty, not demo ids.

## Git
- Branch `feat/cms-vehicle-crud-cloudinary` holds de-mock/seed work (HEAD stacked commits `5deb4e5`, `0c0461e`, `c25ea27`) atop `main` (`82e00dc1`).
- **Push blocked**: ambient `GITHUB_TOKEN` lacks push rights on this repo (403). Combined patch regenerated at `/tmp/shabaautos-dynamic.patch` (`git format-patch main..HEAD`) — apply/推 with user's own credentials.

## Verify
- Smoke: home 200, `/api/vehicles` 200, `/api/settings/public` returns JSON, `/api/settings` (ops) unauth 401.