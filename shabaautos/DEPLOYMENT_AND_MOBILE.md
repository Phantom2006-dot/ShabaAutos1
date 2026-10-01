# ShabaAutos Deployment and Mobile-App Guide

## Current deployment split

The repository is prepared for a split deployment: the Vite/React frontend can run on Vercel, while the Express API and Neon database integration can run on Fly.io. The frontend reads `VITE_API_BASE_URL`; leave it empty for same-origin local development, and set it to the Fly.io HTTPS URL in Vercel.

## Vercel frontend

1. Import the GitHub repository into Vercel.
2. Set the Vercel **Root Directory** to `shabaautos` (the frontend package lives there).
3. Set the build command to `npm run build:frontend`.
4. Set the output directory to `dist`.
5. Add `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_BASE_URL=https://YOUR-FLY-APP.fly.dev` as production environment variables.
6. Add the final Vercel origin to the backend `CORS_ALLOWED_ORIGINS` value.
7. Add the Vercel URL to Clerk's allowed origins and redirect URLs.

The committed `vercel.json` supplies the Vite build and SPA fallback configuration.

## Fly.io backend

Install and authenticate the Fly CLI, then deploy from the `shabaautos` directory:

```bash
cd shabaautos
fly auth login
fly apps create shabaautos-api
fly secrets set \
  DATABASE_URL="postgresql://..." \
  CLERK_SECRET_KEY="sk_..." \
  CLERK_WEBHOOK_SIGNING_SECRET="whsec_..." \
  APP_URL="https://YOUR-VERCEL-APP.vercel.app" \
  CORS_ALLOWED_ORIGINS="https://YOUR-VERCEL-APP.vercel.app" \
  DEMO_MODE="false"
fly deploy
fly status
```

If `shabaautos-api` is already taken in your Fly organization, choose another globally unique app name and update the `app` value in `fly.toml` before running `fly apps create`.

### Fly.io secrets to supply

Set these as Fly secrets; never commit them to GitHub:

| Secret | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string. Use the pooled Neon connection string for the deployed API. |
| `CLERK_SECRET_KEY` | Yes | Server-side Clerk token verification. |
| `CLERK_WEBHOOK_SIGNING_SECRET` | If webhooks are enabled | Verifies Clerk webhook signatures. |
| `CORS_ALLOWED_ORIGINS` | Yes | Exact Vercel origin, for example `https://shabaautos.vercel.app`. |
| `APP_URL` | No | Not currently consumed by backend code; not needed to start this release. |
| `GROQ_API_KEY` | Optional | Enables the optional AI assistance endpoints. Leave unset to use the safe deterministic response. |
| `CLOUDINARY_CLOUD_NAME` | Yes with this Fly config | Durable media storage; production now refuses to start if any of the three Cloudinary credentials are missing. |
| `CLOUDINARY_API_KEY` | Yes with this Fly config | Cloudinary server credential for image uploads and deletion. |
| `CLOUDINARY_API_SECRET` | Yes with this Fly config | Cloudinary server credential for image uploads and deletion. |

These are non-secret Fly environment variables and can be declared in `fly.toml`: `NODE_ENV=production`, `PORT=8080`, `DEMO_MODE=false`, `SEED_DATABASE=false`, `USE_SQLITE=false`, `STORAGE_DRIVER=cloudinary`, and `ACTIVITY_TRACKING=true`. `VITE_CLERK_PUBLISHABLE_KEY` is a **Vercel frontend variable**, not a Fly secret; the browser needs it to initialize Clerk. `VITE_API_BASE_URL` is also a Vercel variable and should point to the Fly HTTPS URL. Do not put either `VITE_*` value in Fly secrets.

### Keeping Fly.io usage low

The included `fly.toml` is configured with a single shared-CPU, 512 MB machine, automatic stopping when idle, automatic starting on request, and zero minimum running machines. This minimizes idle compute, but the first request after an idle period can be slower. Do not add a second machine, a persistent volume, or an always-on worker unless the product needs it. Neon remains the durable database, so the Fly machine does not need to store application data locally. Avoid `USE_SQLITE=true` in production because SQLite would make scale-out and restarts unsafe.

The container listens on Fly's `PORT=8080`, exposes `/api/health` for liveness, and uses `/api/ready` as the readiness check. Neon remains the production database; do not set `USE_SQLITE=true` in Fly production. Local `/uploads` storage is ephemeral on Fly and must not be used for production vehicle images; configure all three Cloudinary variables or uploaded files can be lost on machine replacement.

## Production checklist

Use Clerk production keys and production redirect URLs. Run the Neon schema/migrations before accepting traffic. Set `DEMO_MODE=false`. Configure a real `DATABASE_URL`, rotate any development secrets, and verify CORS with the exact Vercel origin. Test authenticated customer, staff, and admin flows after deployment. Configure Clerk webhooks to reach `https://YOUR-FLY-APP.fly.dev/api/webhooks/clerk` if webhook synchronization is required.

## Creating the mobile app

The recommended path is **Expo with React Native**. Do not copy the web DOM directly into a mobile app. Reuse the backend API, TypeScript domain types, validation rules, and business logic; rebuild the interface with React Native components such as `View`, `Text`, `Pressable`, `FlatList`, `Image`, and `TextInput`.

Create the app separately:

```bash
npx create-expo-app@latest shabaautos-mobile --template blank-typescript
cd shabaautos-mobile
npx expo install expo-secure-store expo-image expo-linking
npm install @clerk/clerk-expo
```

Set `EXPO_PUBLIC_API_BASE_URL=https://YOUR-FLY-APP.fly.dev` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...` in the mobile environment. Store Clerk session tokens with `expo-secure-store`; send them as `Authorization: Bearer <token>` to the same Fly API used by the web app.

Suggested first screens are Home, Rental Search, Rental Details/Booking, Buy Cars, Import Request, Saved Cars, Order Tracking, and Account. Use `FlatList` for vehicle grids, `SafeAreaView` for device cutouts, responsive spacing based on `useWindowDimensions`, and native date/time pickers instead of browser inputs. Keep pricing, availability, booking conflicts, import calculations, and permissions server-authoritative.

## Android / Play Store path

1. Create an Expo account and configure an Android package identifier such as `com.shabaautos.app`.
2. Add an app icon, splash screen, privacy policy URL, support email, and production API/Clerk variables.
3. Use EAS Build to generate an Android App Bundle:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile production
```

4. Create a Google Play Console developer account, complete the data-safety and content declarations, upload the generated `.aab`, and release first to internal testing.
5. After testing login, rental booking, deep links, push notifications, and offline/error states, promote the release to production.

The web and mobile apps can coexist: Vercel serves the browser UI, Fly.io serves the API, Neon stores shared data, and Clerk provides the same identity system across both clients.
