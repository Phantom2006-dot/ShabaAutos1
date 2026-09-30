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
- Real data flows come from `src/services/api.ts` (`apiFetch`, `fetchPublicSettings`, `fetchMySavedVehicles`, `fetchMyComparison`, `fetchVehicleById`, `trackOrderShipment`, ...); unauth `/api/me/*` → 401 `{success:false}` → UI must fall back to empty, not demo ids。


- No static/mock car data: `src/data/cars.ts` deleted (frontend screens fully DB-backed。Seed catalog lives only at `server/scripts/seedData.ts` (imported by `server/scripts/seed.ts` for DB seeding; never imported by frontend))。



- All contact-prefill forms use `useAuthUser()` from the real Clerk session — no fake personas/phones/emails anywhere. Grep `@example.com`, `John Doe`, `Emeka Obi`, `Oluwasegun`, `SA-10245` must stay empty。
 
## Git
- Branch `feat/cms-vehicle-crud-cloudinary` holds de-mock/seed work. Pushed HEAD: `75b5f1e` (fully de-mock remaining static flows app-wide)); prior `9df7bc1` (SellCar + ImportLanding)。

- Push rights working on the ambient token now。(verified `git push origin feat/cms-vehicle-crud-cloudinary` OK)。
 
## Verify
- Smoke: home 200, `/api/vehicles` 200, `/api/vehicles/:id` 200 (CarDetail fetch-by-ID), `/api/tracking/ORD-2024-0891`  ́200 (OrderTracking), `/api/settings/public` returns JSON; `/api/settings` (ops) unauth 401。


- Preview: `work-1-rfcaqlznacxpuvko.prod-runtime.all-hands.dev` (port 12000) serves ​200 with health `{demoMode:false}`。 `work-2` (port 12001) has no service。
