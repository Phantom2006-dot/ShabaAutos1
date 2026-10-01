# ShabaAutos — storefront and operations audit

**Scope:** existing Vercel frontend and Fly.io API; researched and implemented 1 October 2026. The changes aim to replace simulated transaction states with actual persisted state. U.S. consumer sources below are **design and transparency references**, not Nigerian legal advice.

## What changed

| Area | Implemented behavior |
| --- | --- |
| All Cars | Real server-side pagination, page size, totals, sort, filters, published-only facets, search and empty/error states. Homepage and mobile search/category links hand off real query parameters; stock-ID search now works in both databases. |
| Publication and details | Draft/reserved/sold/delisted cars stay out of public inventory, detail, saved views and offer/inspection flows. Admin approval requires a vehicle photo and no longer asserts that an inspection passed. Material listing changes return an approved car to review. Exact vehicle IDs resolve directly; absent listings show not-found rather than another car. |
| Operations CMS | Staff/admin inventory editor, local-device multi-image upload, caption/primary/reorder/delete controls with ownership checks and safe file limits. Admin-only approval, status and permanent vehicle deletion. New live seller, concierge, import, rental and analytics workspaces; settings editor; notification mark-read; audit view. Seller approval and settings mutation are admin-only. |
| Customer journeys | Account-backed saved/comparison lists (max three); profile updates persist; import tracking shows only the owner's recorded events and real references; rental dates, duration and amount are checked by the server; seller/concierge/import forms start without fabricated identities and submit actual structured requests. |
| Contact and maps | Public phone, email and verified business address come from editable admin site settings, initially blank. A configured address produces Google Maps **Directions**; vehicle locations provide Maps **Search** without pretending a city is a precise dealership address. No Google Maps API key is required for Maps URLs. |
| Production integrity | Production Postgres failure no longer silently falls back to disposable SQLite. Fly Cloudinary storage fails closed if credentials are absent. Admin setting keys/values are allowlisted and checked. Client-only same-origin rental/home API fetches were removed for the Vercel/Fly split. |

## How staff and admin use it

1. In **Operations → Inventory**, enter vehicle facts and **Save draft**. Select actual JPEG/PNG/WebP files from a device (up to 10 files, 8 MB each), then save/upload. Edit gallery captions, order, primary image or delete a photo. Staff may prepare listings; an admin approves them after checking the photos and facts. An approval badge **does not mean** inspection passed.
2. Use the **Seller reviews**, **Concierge**, **Imports**, and **Rentals** tabs for actual submitted records. An import tracking event requires factual details. Use **Analytics** for recorded activity (7/30/90 days), not inferred visitors. Acknowledge notifications in the inbox.
3. In **Site settings** (admin), set a **verified** `site.contact_phone`, `site.contact_email`, and `site.address` to enable public contact and Google Maps directions. Review configured rental/fee/import/valuation numbers against current business policy and official rate sources before publishing quotes; the seeded rate values are estimates, not an official tariff or guaranteed offer.

## Validation and release

- `npm run test:repo`: **12/12 repository tests pass**.
- `python3 server/tests/http-workflows.py` against a disposable local demo-mode SQLite backend: **passes** publication gate, scoped media upload/edit, permission boundaries, settings, notification acknowledgement, rental date/server-calculated fee, tracking authentication and deletion. **Never run this mutation test against production.**
- `npm run lint`, `npm run build`, `git diff --check`: **pass**. Vite reports a non-blocking large JavaScript bundle warning.
- Fly app: `shabaautos-api`, backend origin `https://shabaautos-api.fly.dev`. After deployment check `/api/health` and `/api/ready`; health does not substitute for a real signed-in browser acceptance test. In Vercel, confirm `VITE_API_BASE_URL=https://shabaautos-api.fly.dev` and `VITE_CLERK_PUBLISHABLE_KEY`, and redeploy frontend from the pushed commit. Fly needs `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CORS_ALLOWED_ORIGINS` (all already present by **name** at audit time); never commit their values. Keep the Clerk webhook endpoint configured at the Fly `/api/webhooks/clerk` route.

## Explicit limits and follow-up

- Editorial hero/concept images and example model suggestions remain static **examples**, not actual vehicle stock. Existing demo-seeding remains confined to development; do not enable `DEMO_MODE` or `SEED_DATABASE` on Fly. Existing seeded ratings/inspection flags should be audited against documentary evidence before publishing genuine inventory.
- A verified inspection report, title/VIN history, warranty/returns documents, precise vehicle address/place ID, proof of logistics events, date-aware rental fleet availability endpoint, cancellation/deposit policy and actual payment/financing agreements are **not** implemented. Do not market these as guaranteed. Source-of-truth evidence and business-approved pricing/terms require operator data and policy decisions, not hardcoded UI text.
- Live Vercel auth/CORS/customer acceptance testing requires the actual production Vercel URL and authenticated test account; repository and local HTTP checks do **not** prove those external services end to end.

## Research references

- [FTC Automobile Industry Pricing Transparency FAQ](https://www.ftc.gov/business-guidance/resources/automobile-industry-pricing-transparency-faqs): price, mandatory fees, availability and representative photo disclosures.
- [FTC used-car buyer guide](https://consumer.ftc.gov/articles/buying-used-car-dealer): written terms, vehicle history and independent inspections.
- [FTC rental-car guide](https://consumer.ftc.gov/articles/renting-car): total cost, coverage, fees and cancellation terms.
- [Google Maps URLs guide](https://developers.google.com/maps/documentation/urls/guide): Maps Search/Directions URLs without API-key integration.
- [Clerk custom email/password guide](https://clerk.com/docs/guides/development/custom-flows/authentication/email-password): real provider-backed authentication and verification.
- [Baymard travel UX guidance](https://baymard.com/research-articles/travel-site-ux-best-practices): meaningful filters and booking search clarity.
