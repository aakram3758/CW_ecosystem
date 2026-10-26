# Clouds Water — Ops Dashboard (React + Supabase)

The ops dashboard for branch pickups: **Sign in · Overview · Requests · Scheduling · Needs decision** plus the admin
screens **Chains & branches (with map) · Cities & districts · Drivers (daily availability) · Materials & managers ·
Editable lists · Reports (Excel export)**, connected to the Supabase project **Clouds Water Ecosystem**
(`vuotbcicuhzjmtmudwgs`). Arabic (RTL) first with an English (LTR) mirror, light and dark themes.

Staff sign in with their mobile number (accounts created from *Materials & managers*) or with an email.
The branch map uses OpenStreetMap tiles through Leaflet; the Excel export runs in the browser (`write-excel-file`).

## Run it locally

Requires **Node.js 20.19+ or 22.12+** (check with `node -v`).

```bash
npm install          # from the repo root — once, and again whenever a package.json changes
npm run dev          # from the repo root (or run it inside apps/dashboard)
```

Opens http://localhost:5180 (fixed port; if it's busy the server stops instead of switching ports).

The connection settings live in `apps/dashboard/.env.local` (not committed; copy `.env.example` next to it if it's missing):

```
VITE_SUPABASE_URL=https://vuotbcicuhzjmtmudwgs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

Both values are public by design (they only identify the project; row level security protects the data).
**Never** put the service role key in this file or in any `VITE_` variable — everything prefixed `VITE_` ships to the browser.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check and build the production bundle into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

## Accounts

Only **dashboard (staff) accounts** can sign in. Branch and driver accounts are refused with a message — they use the app.

- The first account (`superadmin@cloudswater.com`) was created in Supabase → Authentication and linked as general manager.
- Accounts created later get a 6-digit temporary password and must choose a new one at first sign-in
  (8+ characters with a letter and a number).
- Deactivated accounts are refused at sign-in.
- Sign out from the button next to your name at the bottom of the sidebar.

## What works (all against the real database)

- **Overview** — KPIs, requests waiting more than a day, late branches (from `staff_late_branches`) with "+ Add request".
- **Requests** — filters kept in the URL, drawer with attempts and status history (loaded on open), cancel with a reason,
  add a request for a branch (the database enforces one open request per branch per subtype).
- **Scheduling** — build the next working day's plan by drag-and-drop or selects, approve (`staff_approve_plan`),
  approved plans with "Change driver". Requests cancelled by the branch meanwhile are skipped and reported.
- **Needs decision** — reschedule (with undo within 15 minutes) or close with a reason.
- **Notifications** — from the `notifications` table, already scoped to the user's material for supervisors.
- Server rules come back as clear messages (e.g. "the request just changed — data refreshed").
- Data refreshes every minute and when you come back to the tab; every change refreshes the affected screens.

Requests older than 120 days are only loaded while still open (`REQUEST_WINDOW_DAYS` in `src/data/api.ts`).
When volume grows, the Requests list should move to server-side filtering and paging.

## Project structure

```
src/
  lib/supabase.ts   ← the Supabase client (URL + publishable key) and error codes → messages
  lib/auth.tsx      ← session lifecycle: sign-in → profile check → temp password → app; sign-out clears all cached data
  lib/app-context   ← language + theme (everywhere) and the signed-in user (inside the app)
  data/api.ts       ← the ONLY module that talks to Supabase: reads (tables/views) and writes (RPCs)
  data/catalog.ts   ← cities, districts, chains, materials, reasons — loaded from the database after sign-in
  data/queries.ts   ← TanStack Query hooks + mutations (refresh after every write)
  data/selectors.ts ← pure functions deriving what each screen shows
  features/auth     ← sign-in, change password, loading/error screens
  features/<page>/  ← one folder per screen: page, parts, strings.ts
../../supabase/     ← database migrations, Edge Functions, demo seed and tests (see supabase/README.md at the repo root)
```

## Deploying

The Vercel project's Root Directory is `apps/dashboard`. `vercel.json` rewrites every path to `index.html`, so refreshing on `/requests` does not 404.
Set the two `VITE_` variables in the Vercel project settings. Vercel's free Hobby plan is for non-commercial use only.
