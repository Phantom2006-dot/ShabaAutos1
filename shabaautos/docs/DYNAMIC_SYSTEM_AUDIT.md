# ShabaAutos — Dynamic System Audit

**Audit date:** 2026-09-28
**Auditor:** OpenHands (senior engineering agent)
**Stack:** React (Vite) + Express + Neon Postgres (`pg`, raw SQL) with SQLite fallback. Authentication: Clerk (server-verified JWTs). Media: Cloudinary (server-side uploads). No ORM — repository layer with PostgreSQL + SQLite implementations.

**Legend:** `Static` = data hardcoded in source; `Partial` = some parts real, some hardcoded/fallback; `Dynamic` = fully database-backed; `N/A` = not applicable / not implemented.

---

## 1. Core inventory of static → dynamic

| Area | Current Implementation | Static/Mock? | Required Backend | Required DB Data | Required Changes | Status |
|---|---|---|---|---|---|---|
| Homepage | Hero carousel static slides (BMW concept) | Static (marketing) | — | — | None (intentional marketing content) | Keep |
| Homepage | 4 value pillars ("100% Verified" etc.) | Static (marketing) | — | — | None (marketing copy) | Keep |
| Homepage | Featured/popular vehicles | Calls `/api/vehicles?limit=5` | exists | vehicles | — | ✅ Dynamic |
| Buy a Car listing | `BuyCarsScreen` loads `limit:100` once, **filters/sorts client-side**, count = `vehicles.length` | **Static/partial** | server-side filter+sort+pagination (exists at `/api/vehicles`) | vehicles | Rewire to `fetchVehiclesWithPagination` with real `total`, page state, backend filters | **REQUIRED** |
| Vehicle detail | `CarDetailScreen` falls back to `POPULAR_CARS/BUY_CARS_INVENTORY`; **default 4 Unsplash images**; **fake count `images.length + 20`** | **Static** | `/api/vehicles/:id` (exists) | vehicle_images | Load by id; no static fallback; remove `+20`; real image gallery count | **REQUIRED** |
| Vehicle gallery | Uses `car.images` array + default Unsplash | Partial | vehicle_images | vehicle_images | DB/Cloudinary images only; real count; missing-image empty state | **REQUIRED** |
| Vehicle filters | Client-side filter over fetched 100 | **Static** | backend filter (exists) | — | Move to backend; combined filters; shareable query state | **REQUIRED** |
| Vehicle pagination | Client-side `vehicles.length` | **Static** | backend `total` (exists) | — | Use DB total; real page buttons | **REQUIRED** |
| Vehicle categories | Seed DB categories | Dynamic | — | vehicles | — | ✅ (facet-driven) |
| Vehicle image count | Fake `images.length + 20` | **Static** | COUNT(vehicle_images) | vehicle_images | Real count from DB relationship | **REQUIRED** |
| Rental | `RentCarScreen` pre-fills "Emeka Obi"/fake phone/email; fetch rentals from API | Partial | `/api/rentals/vehicles` + `/api/rentals/book` (exists) | rental_vehicles, rental_bookings | Prefill from auth user; server rate (exists); server availability (exists) | Partial |
| Rental calculations | chauffeur ₹25k/day, insurance ₹10k/day hardcoded in server | **Static (config)** | settings table | site_settings | Move to configurable rates (admin-editable) | **REQUIRED** |
| Import landing | `IMPORT_POPULAR_CARS` static pre-sourced list | **Static** | fetch real cars or DB "import-sourcing" section | vehicles / import source config | Replace static array with real vehicles or empty state | **REQUIRED** |
| Import estimator | `/api/imports/calculate` uses env defaults/hardcoded duty/levy/vat | Partial (labeled estimate) | settings table + configurable rates | site_settings | DB-configurable rates; admin settings UI; labelled assumptions | **REQUIRED (config)** |
| Import wizard | `ImportFormScreen` → `/api/imports/request` real | Dynamic | exists | import_requests | Multi-step already; prefill from user; add step validation persistence | Dynamic |
| Tracking | `OrderTrackingScreen` preloads **static `TRACKED_ORDER`** demo; only partial update on API hit | **Static** | `/api/tracking/:id` (exists, DB) | import_requests + milestones + events | Start empty; only render API data; proper not-found/empty states | **REQUIRED** |
| Sell your car | `/api/sell` real → `sell_submissions` (valuation algorithm hardcoded base prices) | Partial | admin review workflow | sell_submissions | Add photos (Cloudinary); admin approve/reject/publish workflow; valuation configurable | **REQUIRED** |
| Find a car for me | `/api/concierge` real → `concierge_requests` | Dynamic | admin management | concierge_requests | Admin web UI; status updates; attach matches | Partial (API exists) |
| User profile | `PATCH /api/me/profile` exists; **no image-upload from device**; `MobileProfileScreen` uses static data? | Partial | profile avatar upload route | users.avatar_url | Add Cloudinary avatar upload; wire profile screen | **REQUIRED** |
| Admin dashboard | `OperationsDashboardScreen` real (`/api/ops/*`) | Dynamic (counters DB-backed) | exists | vehicles/notifications/audit | Add image manager (local device upload, primary, delete, reorder); more admin tabs for requests | Partial |
| Vehicle management | `/api/ops/vehicles` CRUD exists; image upload endpoint exists (`/api/ops/uploads/images`) | Dynamic | exists | vehicle_images | Extend vehicle_images with Cloudinary metadata; per-image operations | Partial |
| Vehicle image mgmt | cms.ts setImages by URL; no primary, no per-image delete id, no reorder | Partial | image repo methods | vehicle_images | Add getById/updatePrimary/reorder/deleteId | **REQUIRED** |
| Inspection reports | `inspections` table (schedule bookings); no per-vehicle report entity | Partial | inspection reports entity | inspections w/ report fields | Add report fields (inspection_date, inspector, notes, status, images) | **REQUIRED** |
| Orders | No order table; offers/imports act as orders; **no order_status_history** | Partial | order_status_history | new table + AI/import status transitions | Create order_status_history; record transitions; admin view | **REQUIRED** |
| Notifications | DB-backed `notifications` | Dynamic | exists | notifications | — | ✅ |
| Admin activity log | `audit_logs` real | Dynamic | exists | audit_logs | Ensure all admin mutations record; view exists | Partial |
| Site traffic/analytics | **None** | **Static/absent** | activity_events table + first-party tracking | new table | Page views, vehicle detail views, search events, request submissions; admin diagnostics with real data only | **REQUIRED** |
| Search | `/api/vehicles?search=` real | Dynamic | exists | vehicles | BuyCars must call backend search (not local) | Partial |

## 2. Hardcoded/mock discovery results

| Pattern | Location | Fix |
|---|---|---|
| `POPULAR_CARS`, `BUY_CARS_INVENTORY`, `RENTAL_CARS`, `IMPORT_POPULAR_CARS`, `SAVED_COMPARE_CARS`, `DEMO_IMPORT_ORDER`, `TRACKED_ORDER` | `src/data/cars.ts` (811 lines) | Replace consumers with API-backed data; **remove static arrays once no consumers remain** |
| `images.length + 20` fake image count | `src/views/CarDetailScreen.tsx:266` | Real count from DB images |
| Default Unsplash images in `formatVehicleToCar` | `server.ts` | Return real DB images only; empty-state placeholder when none |
| Fake seller "Prime Motors Ltd" rating 4.9/42 | `server.ts` `formatVehicleToCar` fallback `seller` | Return `null` when no seller; UI handles absence |
| Form defaults "Oluwasegun Adebayo", "Emeka Obi", "John Doe", "Adebayo Johnson", fake emails/phones | `CarDetailScreen`, `RentCarScreen`, `ImportFormScreen`, `SellCarScreen`, `FindCarScreen` | Prefill from authenticated user context |
| Tracking static `TRACKED_ORDER` preloaded | `OrderTrackingScreen` | Start empty; require input; render DB result or empty state |
| `SAVED_COMPARE_CARS`/`demo saved ids` | `SavedCompareScreen`, `App.tsx` (hardcoded `savedCarIds: ['rav4-2022','camry-2022','comp-1','comp-2']`) | Load from `/api/me/*` endpoints; remove hardcodes |
| Footer "150+ Inspection Points" | `Footer.tsx:27` | Convert to config/content or remove claim |
| Concierge attached-matches/status UI | `FindCarScreen` | Persist request; admin can update status; user sees ticket id |
| Image management UI | Operations dashboard "Image URLs (comma separated)" field | Replace with local-device multi-file upload + Cloudinary + primary/delete/reorder |
| Chauffeur/insurance fees hardcoded | `server.ts` rental book | Move to `site_settings` |
| Import calc duty/levy/freight hardcoded env | `server.ts` imports/calculate | Move to `site_settings` (admin-editable) with env fallback for boot |
| Sell valuation base prices hardcoded | `/api/sell` | Move to configurable rates/table |

## 3. Auth & authorization (verified)

- Clerk JWT verified server-side (`@clerk/express` `verifyToken`). **Good.**
- `/api/ops/*`, `/api/admin/*`, `/api/staff/*` gates use `requireAuth` + `requireRole`. Role from DB user record (authoritative) otherwise metadata. **Good.**
- Customer-only mutation routes (`/api/me/*`, offers, inspections, rentals, imports, sell, concierge** require auth and scope to `req.user.id`. **Good.**
- No client-side role trust found in backend.

## 4. Environment / secrets

- `.env` already contains `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `DATABASE_URL`, `CLOUDINARY_*`, `GROQ_API_KEY`, etc.
- `.env.example` tracks required variables. Missing: settings-table fallback envs. Will update.

## 5. What must change (high level)

1. **DB migration (additive):** vehicle_images Cloudinary metadata + primary/order; order_status_history; site_settings; activity_events; sell_submissions photos/review columns; inspection report fields; indexes.
2. **Backend:** repository + route updates for image metadata & per-image ops; admin management for sell/concierge/import/rental/inspection/offers/tracking; settings (rates) CRUD; analytics events; profile avatar upload route; order status history recording.
3. **Frontend:** remove static fallbacks; convert BuyCars to backend filter/pagination; CarDetail by-id with real gallery count; tracking empty-state; saved/compare from API; profile avatar upload; dashboard image manager + request-management tabs; prefill from auth user.
4. **Tests:** vehicle CRUD + image count correctness; combined filters; order status history; rental double-booking; import calc config; sell pending→approve; concierge; authz (customer blocked from ops).
5. **Docs/SQL:** exact `database/migrations/*.sql`; `docs/DATABASE_MIGRATION.md`; updated `.env.example`; `docs/IMPLEMENTATION_REPORT.md`.
```
```