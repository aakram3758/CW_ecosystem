# Clouds Water Ecosystem

One repository for the Clouds Water branch-pickup system.

| Path | What it is |
| --- | --- |
| `apps/dashboard` | Ops web dashboard (React + Vite), deployed on Vercel — see [its README](apps/dashboard/README.md) |
| `supabase/` | Database migrations, Edge Functions, demo seed and tests — see [supabase/README.md](supabase/README.md) |

The branch/driver mobile app (Expo) will live in `apps/mobile`, and code shared between the two apps in `packages/`,
once that work starts.

## Getting started

Requires **Node.js 20.19+ or 22.12+**. Run everything from the repo root:

```bash
npm install      # installs every app (npm workspaces)
npm run dev      # dashboard on http://localhost:5180
npm run build    # type-check + production build of the dashboard
```

The dashboard reads its Supabase settings from `apps/dashboard/.env.local` (copy `apps/dashboard/.env.example`).
