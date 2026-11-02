# Clouds Water Ecosystem

One repository for the Clouds Water branch-pickup system.

| Path | What it is |
| --- | --- |
| `apps/dashboard` | Ops web dashboard (React + Vite), deployed on Vercel — see [its README](apps/dashboard/README.md) |
| `apps/mobile` | Branch + driver app (Expo, SDK 58) — see [its plan](apps/mobile/PLAN.md) |
| `supabase/` | Database migrations, Edge Functions, demo seed and tests — see [supabase/README.md](supabase/README.md) |

Nothing is shared in `packages/`. The mobile app has generated database types (`apps/mobile/src/data/database.types.ts`);
the dashboard types its rows by hand in `src/data/types.ts`. The two apps share no code.

## Getting started

Requires **Node.js 20.19+ or 22.12+**. Run everything from the repo root:

```bash
npm install      # installs every app (npm workspaces)
npm run dev      # dashboard on http://localhost:5180
npm run build    # type-check + production build of the dashboard
npm run mobile   # Expo dev server — scan the QR code with Expo Go
npm run typecheck # both apps
```

The dashboard reads its Supabase settings from `apps/dashboard/.env.local` (copy `apps/dashboard/.env.example`).
