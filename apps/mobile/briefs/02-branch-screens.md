# Bite 2 — the branch screens

Eight screens, built to match the approved design exactly. **No backend wiring**: every screen reads
mock data in the real row shape. Phase B replaces the source, not the screens.

Bite 1 landed the foundation — providers, the shared components, sign-in, the forced password change
and role routing. Read `apps/mobile/PLAN.md` first, especially *Data per screen*, which names the
real call and arguments behind each screen; you are not making those calls yet, but the mock rows
must match their shape.

## The design is a file you can read

`apps/mobile/design/branch/Main.dc.html` is the approved branch prototype — the same one the client
signed off on. It is a web prototype and **not portable**: one class component on the DOM with a
`<x-dc>` runtime, `setTimeout` state and CSS custom properties. Do not port it, translate it, or copy
its markup. Read it the way you would read a spec, and rebuild in React Native.

Where things are in that file:

| lines | what |
| --- | --- |
| 13–80 | the CSS: the design's literal values — paddings, radii, font sizes, grid columns, the `.scr` / `.hdr` / `.body` / `.foot` layout frame |
| 81–708 | the `<x-dc>` markup for every screen |
| 709–1500 | the component: state, `sample()` demo rows, `renderVals()` |
| 1124 | the screen list — `splash, login, pwd, loc, home, create, success, details, reqs, notifs, acc` |
| 1392 | the bottom nav: `home / reqs / notifs / acc`, with the unread badge |

Sibling boards show the same component under different props: `Light.dc.html`, `Dark.dc.html`,
`English.dc.html`, `States.dc.html`. **`States.dc.html` is bite 3 — ignore it for now.**

The CSS at 13–80 is why `src/ui/tokens.ts` has colours but no spacing or radius scale: the design
states literal values, so use the literal value from the CSS and do not invent a scale.

## What to build

Bite 1 took `splash`, `login` and `pwd`. This is the rest:

1. **Set branch location** (`loc`) — the one-time confirmation before the branch can request anything.
2. **Home** (`home`) — the materials grid and whatever the design shows above it.
3. **Create request** (`create`) — the three steps the design uses: material → weight + photo → review.
   Includes the subtype sheet, and the lock when that material already has an open request.
4. **Request sent** (`success`).
5. **Request details** (`details`) — both before a visit day is set and after, with the event timeline.
6. **My requests** (`reqs`) — the tabs and the filter the design shows.
7. **Notifications** (`notifs`) — read and unread, and the tap-through to a request.
8. **Account** (`acc`) — including the language and theme controls, which already exist as
   `PreferencesControls`; restyle to the design rather than building a second one.

Replace the `/branch` placeholder from bite 1 with the real navigation. The bottom nav is the
design's own (line 1392), not a stock tab bar — four items, the notifications badge, and the
selected-item treatment from the CSS.

## Mock data — the one thing that decides how expensive Phase B is

Put every row in `src/data/mock/branch.ts`, and **type each one from the generated types**, e.g.

```ts
import type { Database } from '@/data/database.types';
type RequestRow = Database['public']['Tables']['requests']['Row'];
```

Rules:

- Real shape, real column names, real enum values. `requests.status` is the database's enum
  (`waiting, scheduled, needs_decision, done, closed`), not the prototype's shorthand
  (`awaiting, scheduled, decision, done, closed`). Where the prototype and the database disagree,
  **the database wins** — PLAN.md's *Prototype vs database* section lists the known differences.
- Material colours come from the `materials` rows' `color_light` / `color_dark`, and the icon from
  `materials.icon` through `materialIcon` in `src/ui/icons.ts`. Do not hardcode a material's colour.
- Mock the data, not the screen's states. A screen reads its rows from a plain module-level export —
  no fake latency, no simulated failures. Bite 3 builds loading, error, empty and offline.
- Use the prototype's `sample()` rows (around line 886) as the content, so the screens look like the
  approved screenshots. Replace the demo person names and phone numbers with the same kind of value
  (a Saudi mobile is `^05[0-9]{8}$`).

The photo step and the map are both **simulated in the approved design itself**, so simulate them too:

- The photo keeps the prototype's three states (none / uploading / chosen). **Do not add a camera or
  image-picker dependency** — Phase B wires the real upload to the `request-photos` bucket.
- The location screen's map is the design's schematic — flat blocks drawn with `--map-bg`,
  `--map-block`, `--map-road`, which are already in `tokens.ts` as `mapBg`, `mapBlock`, `mapRoad`.
  **Do not add a maps library** and do not request location permission yet.

## Copy

Every string for these screens already exists in `src/i18n/ar.ts` and `en.ts` under `branch` — 261
keys, lifted verbatim from this prototype and approved. Find the key; do not write a new string
because one is easier to type. Placeholders are `{name}` style, filled with `interpolate` from
`@/i18n/copy`.

If a screen genuinely needs a string that is not there, add it to **both** files under `shared`, with
a comment saying why, and list it in your report. That list is something Ahmed reviews, so keep it
short and justified.

## House conventions

- No literal user-facing string in a component. No invented colour, spacing or radius — literal
  values from the design's CSS, colours from `tokens.ts` or the material row.
- Comments explain **why**, not what, at the density of the existing files. No "MVP", "for now",
  "phase N", "TODO" or ticket-ID comments.
- Reuse bite 1: `Screen`, `Card`, `Field`, `Button`, `Label`, `Title`, `Message`, `Icon`,
  `OfflineBar`, `PreferencesControls`, the providers, `tokens.ts`, `icons.ts`. Extend them where the
  design needs more; do not start a parallel set.
- Both languages and both themes, and Arabic is right-to-left. Check the English board before
  assuming a layout mirrors cleanly.
- Every tappable target is at least `minTouch` (44) from `tokens.ts`.

## Don't

- Don't call Supabase, or import `@/data/supabase`, from any of these screens. This bite is design on
  mock data; the only live calls in the app remain bite 1's auth.
- Don't touch `apps/dashboard`, `supabase/`, `apps/mobile/design/`, `.env.local`, or bite 1's auth
  flow. If bite 1 has a real bug, report it instead of fixing it here.
- Don't build the loading, error, empty or offline variants — that is bite 3, and it is a separate
  review.
- Don't add a dependency without naming it and its reason. If you think one is unavoidable, say so in
  the report and build the screen without it.
- Don't commit, branch or push. Leave the work uncommitted for review.

## Verification

From `apps/mobile`:

```
npm run typecheck      # tsc --noEmit — zero errors
npm run bundle         # expo export --platform android — must complete
```

Run both and fix what they surface. Then `git status --short` from the repo root, and confirm only
files you meant to change appear, all under `apps/mobile/`.

There is no test suite and no linter in this project; those two commands are the whole gate. The
visual check is Ahmed's, on a phone, against the prototype — which is why matching the design's
literal values matters more here than in any other bite.

## Report

End with:

1. **What you built** — the route and navigation structure, and every judgment call the design left open.
2. **Files touched** — created vs modified.
3. **Gate outcomes** — the real output of both commands.
4. **Design decisions** — anywhere the prototype was ambiguous, contradicted itself, or could not be
   expressed in React Native, and what you chose.
5. **Copy added** — every string beyond the 261, in both languages, with its reason. Or "none".
6. **Dependencies added** — each with its reason, or "none".
7. **Open questions** — what you could not verify without a device, and anything you want decided.
