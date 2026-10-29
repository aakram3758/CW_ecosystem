# Clouds Water — mobile app (Expo)

One app, two roles: **branch** and **driver**. Arabic RTL first with English, light and dark, online only in v1.
This file is the plan and the progress. There are no GitHub Issues for this phase — tick the boxes here as the work lands.

Written in English to match the rest of the repo and because Codex reads it.

## How we work

**Claude thinks and writes the structure; Codex fills it in; Ahmed decides.** That is the division of
labour for every bite below, and it is deliberate — each side does the part it is actually better at.

Claude, for each piece of work:

1. **Reads the source** — the approved canvas, the live schema, the code already there — and settles
   everything that needs judgement: what the screen is, which value comes from where, what the edge cases
   are, where the new code belongs in the tree.
2. **Writes the structure** into the repo: the files, the component and function signatures, the types, the
   props, the state shape, and a comment in each empty body saying what it has to do. Enough that the shape
   of the change is already decided and visible in a diff, with the bodies left to write.
3. **Writes the brief** into `apps/mobile/briefs/` — the ticket: what to build, from which lines of which
   canvas, with the literal values, and what "done" means.

Codex then implements: it fills the bodies in, follows the brief, and runs `tsc --noEmit` and
`npm run bundle` until both pass.

Claude then reviews the diff against the brief — **re-verifying, never trusting the self-report** — fixes
what is wrong, and makes the local commit on `feat/mobile-app`.

Why this split: the decisions that are expensive to get wrong are the structural ones, and they are cheap to
write down. Typing out four hundred lines of styled JSX off a canvas is the opposite — slow to produce, cheap
to check against the design once it exists. So Claude spends its tokens on the decisions and the review, and
Codex spends its on the typing.

The brief is the ticket. It is committed so that reviewing a diff means comparing it against something written
down beforehand, rather than against memory.

`feat/mobile-app` is pushed as a backup branch and nothing more. **It does not merge into `main`** — which is
what deploys the dashboard to Vercel — until the whole app has been tried on a real device and Ahmed says go.

No over-engineering. The app is small; the plan is three phases, not eight milestones.

## Stack

Expo (current SDK) · Expo Router · TypeScript · TanStack Query · React Hook Form + Zod · supabase-js with
`expo-secure-store` session storage · `expo-image-picker` + `expo-image-manipulator` · `expo-location` ·
i18n with RTL. Same shape as `apps/dashboard`, so one person can read both.

Settled: **Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6** (the dashboard stays on TypeScript 5.9 —
each workspace resolves its own, and bumping the dashboard is not this phase's job). Mobile only: no
`react-native-web`, no `react-dom`, no web output. Testing is Expo Go on a phone.

`apps/*` is already an npm workspace, so `apps/mobile` is picked up by the root `npm install`. The monorepo
wiring is done and proven — see *What the skeleton is* below. **There are two React copies on disk** (Expo pins
19.3.0 exactly; the dashboard's `^19.2.0` resolves to 19.3.1) and that is expected: `metro.config.js` makes the
mobile bundle resolve every `react` to the nested 19.3.0, which is what keeps "Invalid hook call" away. Its
comment says so; don't dedupe them by loosening Expo's pin.

No `packages/` in this phase. The only shareable things are the error-code map and the generated DB types, and both
are small enough to live in `apps/mobile` until something else needs them.

---

## Source material

The approved designs are interactive prototypes, every screen in light, dark, Arabic and English, with every state:

- Branch — <https://claude.ai/artifact/E44BzENzJyyKFxufMtq9PG>
- Driver — <https://claude.ai/artifact/MWmiNstUkiysG5CafuswWY>

**The prototypes are not portable.** Each is a single ~165 KB class component built on web DOM and the `<x-dc>`
runtime, with simulated state (`setTimeout`) and hardcoded sample arrays. React Native has neither. Screens get
re-implemented, not ported.

**Three things were lifted verbatim** rather than retyped, because retyping invites drift from approved copy.
Claude did this extraction in phase 0; Codex builds on top of it:

| What | From | To | |
| --- | --- | --- | --- |
| Copy — 260 branch + 214 driver keys per language | `T.ar` / `T.en` | `src/i18n/ar.ts`, `src/i18n/en.ts` | done |
| 40 icons as SVG path data | the branch `I` object | `src/ui/icons.ts` | done |
| Colours per theme, Tajawal weights | inline styles + `cw.css` | `src/ui/tokens.ts` | done |

Each file's header records what was changed on the way in and why. The approved design changes (below)
are already applied, and every edited string is marked `[changed]` beside its original.

`tokens.ts` holds **only values one of the canvases actually states**. It deliberately has no spacing,
radius or font-size scale: the designs don't state one, and a plausible invented scale sitting next to real
tokens is worse than no scale, because it gets trusted. Screens use their artboard's literal values until a
repeated value earns a name there.

**Business rules are taken from the database, never from the prototype.** They already disagree — see
*Prototype vs database* below.

### Decided: one icon language, and it is the branch's

The branch canvas draws its own 24×24 SVG paths; the driver canvas used the Phosphor icon font (duotone /
bold / fill, ~80 glyphs in its `cw.css`), whose glyphs cannot be extracted — they live inside woff2 files.
**The branch's set is the reference for both roles**, so there is no Phosphor dependency and no icon font to
ship. Same for the typeface: Tajawal, which both designs already used anyway.

Most of what the driver needs is already there or maps onto it: bell-ringing → `bell`, package → `box`,
storefront → `store`, translate → `globe`, list-checks → `checks`, seal-check → `seal`, the three refresh
arrows → `retry`, lock-key and password → `lock` / `key`, and so on.

**Twelve are genuinely missing** and have to be drawn in the same hand (1.6 stroke, 24×24, round caps) when
the driver screens are built — bite 4, not before:

`map-trifold` (open in Maps) · `navigation-arrow` (suggested stop) · `x-circle` (failed outcome) ·
`calendar-check` and `calendar-x` (next plan approved / not) · `magnifying-glass-plus` (enlarge photo) ·
`eye-slash` (hide password) · `device-mobile` (account) · `sun` and `circle-half` (theme: light / system) ·
`caret-up` · `circle-notch` (spinner).

A handful more were decorative in the driver design (recycle, coffee, palette, flag-checkered, path,
circle-dashed, user-minus, hourglass): each gets the nearest icon from the set or no icon at all, decided
screen by screen rather than by drawing eight one-off glyphs.

### Decided: the driver's demo data is bound to real data

Done, in the same pass. A sentence that carried demo data now takes a placeholder — `{name}` the driver,
`{material}` their material, `{branch}` a branch label, `{date}` a formatted day, `{when}` a formatted time,
`{n}` a count — and a string that was *only* demo data is gone, because a row supplies it: the driver's name
and initials, the city, the formatted dates and month, the material name, and the four sample notifications
with their timestamps (real notification text arrives as `notifications.title_ar` / `body_ar`, already
written by the database).

The driver namespace went from 229 keys to 214; 16 of them now take a placeholder. A checker confirms both
languages still hold the same keys, that each key takes the same placeholders in both, and that no demo
name, city or date is left anywhere in the copy.

---

## Phase 0 — before the first screen

- [x] Generated the TypeScript types from the live database into `src/data/database.types.ts` (1,353 lines, by
      the Supabase CLI — regenerate with
      `npx supabase gen types typescript --project-id vuotbcicuhzjmtmudwgs`).
      Every mock in phase A is written to **this** shape, so phase B swaps a data source instead of rewriting screens.
- [x] Lifted the copy, icons and tokens out of the prototypes (see *Source material*).
- [x] Wrote down what every screen reads and writes — see *Data per screen* below.
- [x] Edge Function `chains` — active chains (code + both names) with no JWT, for the branch side of the
      sign-in screen. An Edge Function, not a grant to `anon`, so "anon can't read or call anything" stays
      literally true. Deployed and verified: an unauthenticated `GET
      https://vuotbcicuhzjmtmudwgs.supabase.co/functions/v1/chains`, with no `apikey` header at all,
      returns the five active chains. Redeploy with
      `npx supabase functions deploy chains --project-ref vuotbcicuhzjmtmudwgs --no-verify-jwt`
      (the `--no-verify-jwt` flag matters — this repo has no `config.toml` to carry it).

**Two things in the live chain data for ops to fix from the dashboard, not in code:** the Danube chain's
English name and code are spelled `Danbue` / `danbue`, and a chain called «تست السلسلة» / "Test Serious"
(`testserious`) is still active — which means it will appear in the sign-in picker of every branch in the
real app. The function returns exactly what the table holds, as it should.

## Data per screen

What each screen reads and writes, from the live schema. Reads go through RLS — a branch sees its own rows,
a driver sees what is assigned to them — and **every write is an RPC**. Phase A's mock data is shaped like
these reads; phase B swaps the source.

### Both roles

| Need | Call |
| --- | --- |
| Chain picker (before sign-in) | `GET functions/v1/chains` |
| Sign in | `POST functions/v1/sign-in` `{ email, password }` → `auth.setSession(session)` |
| Who am I | `profiles` → `role, display_name, display_name_en, must_change_password, active` where `id = auth.uid()` |
| Change password | `auth.updateUser({ password })` then `rpc('complete_password_change')` |
| Verify the current password (Account → change password) | `POST functions/v1/sign-in` with the same email before `updateUser` |
| Notifications | `notifications` → `id, kind, title_ar, title_en, body_ar, body_en, link, request_id, read_at, created_at`, newest first |
| Mark them read | `rpc('mark_notifications_read')` |
| Ops phone | `app_settings` → `value` where `key = 'ops_phone'` |

Notification text is already written in both languages by the database; the app picks the column, it never
composes the sentence.

### Branch

| Screen | Reads | Writes |
| --- | --- | --- |
| Set location | `branches` → `lat, lng, location_confirmed_at` (own row by RLS) | `rpc('branch_set_location', { p_lat, p_lng })` |
| Home, My requests, Details | `request_list` → `number, status, kg, note, contact_name, contact_phone, branch_photo_path, visit_day, created_at, material_*, subtype_*, last_outcome, last_attempt_day, last_attempt_at, last_reason_ar/_en, closed_reason, cancel_note` | — |
| Request timeline | `request_events` → `from_status, to_status, actor_kind, note, created_at`; `visit_attempts` → `outcome, visit_day, note, reason_id, photo_path, recorded_at` | — |
| Create, step 1 (material) | `materials` → `id, code, name_ar, name_en, color_light, color_dark, icon, contact_phone, sort_order` where `active`; `material_subtypes` → `id, material_id, code, name_ar, name_en` where `active`; plus own open requests from `request_list` where `status in ('waiting','scheduled','needs_decision')` to lock what is taken | — |
| Create, steps 2–3 | — | `rpc('branch_create_request', { p_material_id, p_subtype_id, p_kg, p_note, p_contact_name, p_contact_phone, p_photo_path })` → `{ id, number }` |
| Edit request | as Details | `rpc('branch_update_request', { p_request_id, p_kg, p_note, p_contact_name, p_contact_phone, p_photo_path })` |
| Cancel request | — | `rpc('branch_cancel_request', { p_request_id })` |
| Contact the manager | `materials.contact_phone`, falling back to `app_settings.ops_phone` | — |
| Account | `branches` → `branch_number, name, address, lat, lng, location_confirmed_at` with `chains(code, name_ar, name_en)` and `districts(name_ar, name_en, cities(name_ar, name_en))` nested | — |

Scale photo: upload to `request-photos` at `branch/<branch_id>/<name>`, then pass that path to the RPC — the
row is only written once the file is there. Reading one back needs `createSignedUrl`; the bucket is private.

### Driver

| Screen | Reads | Writes |
| --- | --- | --- |
| Who am I | `drivers` → `id, full_name, full_name_en, phone, city_id, material_id` where `user_id = auth.uid()`, with `materials(name_ar, name_en)` for the truck line and `cities(name_ar, name_en)` for Account | — |
| Home, Today's plan | `request_list` where `driver_id = <me>` and `visit_day = <today, Riyadh>` — every stop of the day whatever its status now, with `last_outcome` giving each one's ring | — |
| Stop details | one `request_list` row → `number, kg, note, contact_name, contact_phone, branch_photo_path, created_at, branch_name, branch_number, chain_name_*, district_name_*, branch_address, branch_access_notes, branch_phone, lat, lng` | — |
| Record outcome | `reasons` → `id, label_ar, label_en` where `kind = 'failed'` and `active`, by `sort_order` | `rpc('driver_record_outcome', { p_request_id, p_outcome, p_reason_id, p_reason_text, p_note, p_photo_path })` |
| Next plan | `request_list` where `driver_id = <me>` and `visit_day = <next working day>`; no rows means the plan isn't approved yet | — |
| History | `visit_attempts` where `driver_id = <me>` and `visit_day` between the chosen dates, filtered by `outcome` | — |
| Account | the driver row above | — |

Scale photo: upload to `request-photos` at `request/<request_id>/<name>`, then the RPC.

**Driver history — confirmed, it does happen.** This was written as a hunch to test in phase B. It was
checked against the live database instead, and it is real and deterministic, not a maybe.

`visit_attempts_read` matches on `driver_id = private.my_driver_id()`, so a driver keeps their own
recorded visit for good. The branch label does not come with it: `branches_read` admits a driver through
`private.my_driver_branch_ids()`, which is exactly

```sql
select distinct r.branch_id from public.requests r where r.driver_id = private.my_driver_id()
```

and `requests_read` admits them on the same `driver_id = <me>`. Both therefore hang on `requests.driver_id`
*still pointing at that driver right now*. Direct reassignment is safe — `staff_change_plan_driver` only
moves rows still `scheduled`, so a recorded visit never moves. The reschedule decision is not:
`staff_decide` with `p_decision = 'reschedule'` runs

```sql
set status = 'waiting', visit_day = null, driver_id = null, decision_since = null
```

It **nulls `driver_id`**. The moment ops reschedules a visit a driver already attempted, that driver loses
the request and — if it was their only one for that branch — the branch too, while the `visit_attempts` row
stays readable. Their history shows a row with no branch, no material and no request number. This follows
the most ordinary action ops takes after a failed visit, so it is the normal case, not an edge one.

Fix in phase B as migration 20: widen the driver's read to what they have a `visit_attempts` row for,
rather than only what they are assigned right now. Build the history screen so a row still renders without
its joined request either way — ops can reschedule at any moment.

## Phase A — the shell

All screens of both roles, both languages, both themes, on mock data in the real shape. Five bites; Claude reviews
each one before the next starts.

**Where we are — 28 October 2026.** Bites 1 and 2 are done and run on a real phone. The branch side is
walked end to end there: a real account signs in through the `sign-in` function, is forced through the
password change, confirms its location and reaches every branch screen. The driver side of bite 1 is
*not* verified on a device — its home is still the placeholder until bite 4 — so bite 1's "done when"
below is met for the branch only.

The one bug a device found that review could not: the app reloaded itself forever at launch, because
boot asked native for a right-to-left direction and then reloaded to apply it, while a JS reload
cannot change the native constant it was testing. Fixed in `a995e9e`.

### Bite 1 — foundation, sign-in, password change

Auth is **real from day one**. A fake sign-in proves nothing — the temporary password, the forced change and the
5-attempt lock are all server behaviour, and faking them means building them twice.

- [x] **The skeleton** — Expo app in the workspace, Metro wiring proven, Tajawal loading, RTL on by default,
      a placeholder screen that renders the lifted tokens and copy. Done by Claude, not Codex, for one
      reason: config correctness can't be judged by reading a diff, only by running it. Everything below
      this line can be. What was checked: `npm install` at the root, one React per bundle (`npm ls react`),
      `tsc --noEmit` clean, `npm run bundle` produces a 2.6 MB Hermes bundle with the fonts resolved from
      the hoisted root — which is the actual proof the workspace wiring works — and `npm run build` for the
      dashboard still passes. Not checked by Claude: it running on a real phone. That is Ahmed with Expo Go.
- [x] Theme provider and language provider over the lifted tokens and copy.
      RTL note: React Native reads the direction once at startup, so switching language needs a reload —
      the provider owns that, `_layout.tsx` only sets the Arabic-first default.
- [x] Supabase client with secure session storage; TanStack Query; online/offline detection
- [x] Shared loading / error / empty / offline components
- [x] Splash
- [x] Sign-in: **Branch | Driver** segmented switch above the fields — remembered on the device, opens on the last
      side used; switching clears the typed fields and any error. Branch → chain picker + branch number + password.
      Driver → mobile number + password.
- [x] Sign-in through the `sign-in` Edge Function: `401 INVALID_CREDENTIALS { attempts_left }`,
      `429 LOCKED { retry_after }` — both rendered as the designs' text
- [x] Forced password change: `auth.updateUser({ password })` → `rpc('complete_password_change')`,
      `PASSWORD_NOT_CHANGED` handled. Rule: 8+ characters with at least one Latin letter and one digit
- [x] Role routing from `profiles.role`; if the account belongs to the other side, sign out and say so
- [x] Error-code → message map covering every UPPER_SNAKE code in `supabase/README.md`

**Done when** a real branch account and a real driver account each sign in on a phone, change the temporary
password, and land on their own role's home.

### Bite 2 — branch screens

Set branch location · home · create request (material → weight + photo → review) · subtype sheets with
open-request locking · request sent · request details before and after the visit day is set · my requests ·
notifications · account.

**One decision to revisit in phase B — the branch is a single route.** All eight screens live under
`/branch` and switch on state in `src/branch/app.tsx`, the way the prototype itself works, with the
Android back button handled per screen. Nothing is wrong with it and it keeps the screens close to the
approved design, but it means there is no route per screen. A push notification that should open one
request therefore cannot deep-link to it — it has to land on `/branch` and set state. Notifications are
deferred, so decide this when they are built, not before: either give the branch nested routes then, or
accept an app that opens on home and selects the request itself.

### Bite 2.5 — the first design round

Ahmed tried bites 1 and 2 on his phone on 28 October 2026 and sent six comments. Five are work; the sixth he
withdrew himself. This bite is those five, in two stages so each gets reviewed on its own.

The canvas grew while we were building — from 6 files to 28 — and now holds three things that did not exist
when bite 1 was written: a redesigned sign-in screen, a splash screen and a three-slide onboarding. It is
cached at `apps/mobile/design/branch-v2/project/` (gitignored, so read it by path).

**Stage 1 — sign-in and direction**

- [x] Rebuild the sign-in screen for both roles from `Main.dc.html` lines 171–247: the navy hero with the logo
      lockup and its two decorative circles, then the card with the **Branch | Driver** switch *inside* it at
      the top, the chain picker and branch number side by side (3fr / 2fr), the `+966` prefix box joined to the
      driver's phone field, the eye button inside the password field, 52px fields at radius 14, and the errors
      inline with an 18px icon on a soft danger background. Ours has the right fields in the wrong frame, so
      this is a layout rebuild, not a tweak. No copy changes: every string is already lifted and approved.
- [x] **Fix the direction once, at the top.** Today `direction: 'rtl'` is set in `src/branch/app.tsx` and
      `src/driver/shared.tsx` and nowhere else, so everything under `src/app/` — sign-in, the password change,
      both role homes — falls back to the native `I18nManager.isRTL`, which is `false` in Expo Go because
      config plugins do not apply there. That is exactly why the branch screens read right-to-left on the phone
      and sign-in does not. One wrapper high up, and the two per-feature copies deleted.

**Decided while building stage 1.** The canvas draws no language or theme controls on sign-in,
and ours did. Ahmed said to match the canvas, so they are gone: they live on the Account screen
now, and a phone that opens in Arabic signs in in Arabic. The forced password-change screen still
has its own pair — it is a bite 1 screen with no artboard of its own yet, so leave it until it gets
one.

**Stage 2 — splash, onboarding, camera, location, the lock**

- [x] The splash: option **ب** «المواد بتتجمع», the one marked «المعتمد» in `SplashOptions.dc.html` — material
      icons fly in from the edges and merge into the logo, about 1.8s. Needs Reanimated.
- [x] Onboarding: the three slides of `Onboarding.dc.html` (اطلب الاستلام · يوم الزيارة · كل طلباتك), shown
      once per install, skippable.
- [x] The five uploaded images come into the repo as real files — React Native cannot fetch the canvas's
      `/_blob/` paths.
- [x] Make the camera real (`expo-image-picker`) and the location real (`expo-location`), with real permission
      prompts and the designed denied-permission state. **Nothing is uploaded or persisted** — the photo and
      the pin stay in memory. Persistence is phase B.
- [x] The material lock, for a material that already has an open request: simpler and cleaner than what we
      ship now. The canvas draws only a 16px muted lock beside the material name; ours adds a band reading
      «لديك طلب مفتوح لهذه المادة / عرضه». Ahmed's call is to improve on the canvas but go simpler and cleaner
      than our band — the lock and the way in, without a sentence explaining itself.

**Two places where Ahmed asked to go past the canvas**, both after reading them on a phone, and
both recorded here so the difference does not look like drift later: the material lock (above),
and the request-details rows, where the canvas puts the label on one side and the value on the
other. On a 390pt screen that leaves them at opposite edges with nothing between, so each row is
now its icon, the label, and the value under it — the shape the create screen already used for
its review step.

**Not a bug.** The branch name on the phone does not match the canvas because the screen is still on mock
data; Ahmed said to ignore it. It goes away in phase B.

**What stage 2 cost us to learn: `react-native-reanimated` cannot be used in this app.** It is in
`package.json` — expo-router brought it — and it had simply never been imported, so nobody had
found out. Importing it fails the export: it resolves its own nested `semver@7`, the root has
`semver@6`, and `metro.config.js` sets `disableHierarchicalLookup`, which is exactly what refuses
to look inside a package for its own dependencies — and that setting is the one keeping a single
React in the bundle. `react-native-gesture-handler` is in the same position. So animation is
React Native's own `Animated` and gestures are `PanResponder`, and the reason is written into
`metro.config.js` where the next person will meet it.

### Bite 3 — branch states

Split in two after the second device test, and the line between the halves is what the state is
*about*. Four of these are design — they exist whether or not there is a network — and Ahmed sees
them before the wiring. The rest are states of data, and building them on mock data would mean
inventing a delay and a failure to look at, then writing them again against a real one. So they
move to phase B, where they come out of the wiring rather than being staged for it.

**3a — design, before the wiring** (brief `briefs/05-branch-states-design.md`)

- [ ] Cancel confirmation — the sheet the details screen's cancel button has been waiting for since
      bite 2, when it was drawn `disabled` because this state had not been reviewed
- [ ] The contact-the-manager sheet — until now a native `Alert.alert` printing the number as text,
      because the prototype could not dial and we copied its apology instead of its button
- [ ] Create-request input errors — the canvas does not disable its own button and leave you to work
      out why; the press is what reveals the errors
- [ ] Location permission denied — one grey line where the canvas has a card

Three things came with them, each because the four above need it:

- `Toast` (`src/ui/components.tsx`) — the canvas announces a cancelled request and a saved location
  this way, and the app had nowhere to say so. Mounted in `branch/app.tsx` above the pages, so it
  survives the page changing under it.
- `expo-clipboard` — the contact sheet's copy-the-number button. The one dependency added in this
  bite; the two React copies were checked afterwards and are unchanged (19.3.0 nested, 19.3.1
  hoisted).
- `ErrorLine` takes `icon={null}`, for the create form's summary line, which the canvas draws
  without one because the fields it points at carry the icons.

**3b — data, with the wiring** (moved into phase B)

Home loading / error / new branch with no requests · offline retry bar · send failed while offline ·
details being rescheduled after a failed pickup · no requests. «قيد المتابعة مع المسؤول» already
works — it is the `needs_decision` branch of the details screen, built in bite 2.

### Two more places where the app goes past the canvas

Both in bite 3a, both for the same reason: the sheet now does the thing the prototype could only
describe.

- **WhatsApp shows only for a mobile.** `materials.contact_phone` accepts a unified `9200XXXXX`
  number, which has no WhatsApp account. The canvas draws both buttons unconditionally because
  neither of its buttons did anything. The standing rule wins: no button that cannot work.
- **`dialToast` is now unused** — «في التطبيق يفتح هذا الزر الاتصال مباشرة» was the prototype
  apologising for not being an app. The buttons open the dialer and WhatsApp through `Linking`.

`placePin` is also still unused: it belongs to a branch with no coordinates at all, which the mock
branch is not. It stays for whoever builds that state.

### Bite 4 — driver screens

Home with progress · today's plan by district · stop details · record outcome (all collected / quantity differs /
pickup failed) · camera · the three success screens · next plan (view only) · history with period and filter ·
past visit detail · notifications · account · contact-ops sheet · enlarged branch photo · log-out confirmation.

### Bite 5 — driver states

Home loading / no approved plan / not scheduled today / all visits done / offline banner · stop already recorded ·
stop couldn't load · stop with no branch photo · plan loading / couldn't load · sending / not sent / no internet
while sending (the photo and the choice stay on screen) · next plan not approved yet · notifications empty ·
history empty.

### Checkpoint

Expo Go on Ahmed's phone. Both journeys end to end, both languages, both themes. **Phase B does not start until
Ahmed says the design is right.**

## Phase B — wiring

Mock data out, Supabase in. Reads go through RLS, every write goes through an RPC.

- [ ] Branch reads: `request_list`, `branches`, `notifications`, reference tables
- [ ] Branch writes: `branch_set_location`, `branch_create_request`, `branch_update_request`, `branch_cancel_request`
- [ ] Driver reads: assigned requests, `visit_attempts`, `notifications`
- [ ] Driver writes: `driver_record_outcome`
- [ ] Everyone: `mark_notifications_read`
- [ ] Photo upload — private bucket `request-photos`: branch → `branch/<branch_id>/…`, driver → `request/<request_id>/…`
- [ ] The four migrations below (17-20)
- [ ] Delete the device-side location memory in `branch/state.tsx` — it exists only so phase A
      stops asking a branch to place its pin on every launch; `branches.location_confirmed_at`
      is the real answer
- [ ] Every error code from the README mapped to its designed message
- [ ] Bite **3b** — the branch's data states, which are states of this wiring and not of a mock:
      home loading / error / no requests, the offline retry bar, send failed while offline, and a
      request being rescheduled after a failed pickup

## Phase C — device testing, then one push

Both roles on real accounts, both languages, both themes, the failure paths included. Then — and only on Ahmed's
word — `feat/mobile-app` is pushed and a PR opened.

---

## Backend changes

Each one is a **new** migration; nothing already applied is ever edited. Convention: `2026MMDD000N00_name.sql`,
continuing after the applied 01–16.

| # | What | When |
| --- | --- | --- |
| — | Edge Function `chains` — active chains, no JWT | phase 0 |
| 17 | `branch_set_location` refuses once `location_confirmed_at` is set; only the dashboard can change it after | phase B |
| 18 | Maximum 5,000 kg, enforced in `branch_create_request` **and** `branch_update_request` | phase B |
| 19 | `branches.name_en` + a field on the dashboard's branches screen + **fix `private.request_label(…, 'en')`**, which today falls back to the Arabic `b.name` so English notifications show Arabic branch names | phase B |
| 20 | A driver may read the branch and request behind any `visit_attempts` row of their own, not only what they are assigned right now — see *Driver history* above | phase B |

All four premises were checked against the live database on 2026-10-27, not assumed:

- `branch_set_location` runs `update … location_confirmed_at = now()` with no guard at all, so a branch
  can move its pin after ops has verified it, any number of times. → 17
- `branch_create_request` and `branch_update_request` both check only `p_kg is null or p_kg <= 0`. There
  is no upper bound anywhere, so five million kilograms is accepted. Both need the cap, not one. → 18
- `public.branches` has a single `name` column and no `name_en`. → 19
- `staff_decide`'s reschedule branch nulls `driver_id`. → 20

The migration first written here as the fourth was going to add `materials.contact_phone` — see below.

### Checked, needs nothing

**The material manager's number already exists.** An earlier draft of this plan called it a gap; that was wrong.
Migration 11 added `materials.contact_phone` (`alter table … add column`, which is why a grep of the `create table`
missed it), `staff_set_material_manager(p_material_id, p_manager_id, p_contact_phone)` writes it, the dashboard's
materials screen already edits it and already falls back to `app_settings.ops_phone`, and the reference-table read
policy lets any signed-in user — a branch included — read it. The column even accepts a unified `9200XXXXX`
number, not just `05…`. Nothing to migrate; the app just reads `materials.contact_phone` and falls back to
`app_settings.ops_phone`. The rule stays: **no number means the contact button hides**, never a dead button.

**The driver's "next plan" screen needs no new RLS.** `plan_approvals` is staff-only, but `staff_approve_plan` is
what writes `driver_id` and `visit_day` — so a driver seeing assigned rows for tomorrow already means the plan is
approved, and no rows means it isn't.

**Material colours need no tokens.** `materials.color_light` / `color_dark` hold them, and the seeded values match
both designs exactly (`#B5773A`/`#D89A5B` cardboard, `#1F6FB8`/`#5C9BE0` plastic, and so on). Only the soft tints,
which have no column, were lifted into `src/ui/tokens.ts`.

---

## Prototype vs database

Found while reading both against each other. The database wins every time.

| | Prototype | Database |
| --- | --- | --- |
| Mobile number | `^5\d{8}$`, shown as `+966 55 …` | `^05[0-9]{8}$` |
| Weight ceiling | 5,000 kg in the form | no ceiling yet — migration 18 |
| Branch location | treated as locked after confirming | can be re-confirmed, no guard — migration 17 |
| English branch name | shown | column doesn't exist — migration 19 |
| Material codes | `cardboard`, `plastic`, `paper`, `metal`, `bread` | `card`, `plas`, `paper`, `metal`, `bread` |
| Aluminium subtype | code `alu`, label «ألمنيوم» | code `aluminium`, label «ألومنيوم» |
| Metal icon | drawn as a can | `materials.icon` = `hex` |

The last three are why nothing keys off a material by the prototype's name: read `materials` and
`material_subtypes` and key off `code`. `src/ui/icons.ts` maps the database's five icon keys onto the lifted
set, with `hex` pointing at the can the branch canvas actually drew — no icon was invented.

**Phone normalisation:** keep the designed input and the `+966` display, normalise to `05XXXXXXXX` at the edge.
The driver's login is built from it: `d-05XXXXXXXX@drivers.cloudswater.co`, from `drivers.phone`.
The branch's login is `b-<chain code>-<branch number>@branches.cloudswater.co`.

## Approved design changes

- **Branch** — the password rule reads "an English letter and a number"; the sign-out sheet says "chain and branch
  number" instead of "mobile number", and the leftover "Mobile number" label on the sign-in screen goes with it.
- **Driver** — the permanent 6-digit PIN becomes a password on the same rule as the branch (8+, one Latin letter,
  one digit). Every "PIN" string becomes "password": `password`, `showPw`, `forgot`, `loginErr`, `loginErrN`,
  `lockedBody`, and the locked-login artboard label. Only the **temporary** password is 6 digits.
- **Sign-in** — one screen for both roles with the Branch | Driver switch above the fields.

## Deferred — not in this phase

Push notifications (in-app only for now) · store publishing and EAS builds (the Apple / Google / Expo accounts are
being set up in the client's name; testing is on Ahmed's own devices with Expo Go or a development build) ·
the Excel branch-import script.

The unified ops number and the materials' contact numbers get filled from the dashboard later. Every screen handles
their absence: the contact button hides rather than showing a number that isn't there.
