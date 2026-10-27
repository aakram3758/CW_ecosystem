# Clouds Water — mobile app (Expo)

One app, two roles: **branch** and **driver**. Arabic RTL first with English, light and dark, online only in v1.
This file is the plan and the progress. There are no GitHub Issues for this phase — tick the boxes here as the work lands.

Written in English to match the rest of the repo and because Codex reads it.

## How we work

Claude plans and reviews, Codex implements, Ahmed decides. For each bite below: Claude writes a short brief →
Codex implements → Claude reviews the diff → local commit on `feat/mobile-app`. **Nothing is pushed** until the whole
app has been tried on a real device and Ahmed says go. A local commit is not a push; it never leaves the machine.

`main` deploys the dashboard to Vercel, so the mobile branch stays off `main` for the whole phase.

No over-engineering. The app is small; the plan is three phases, not eight milestones.

## Stack

Expo (current SDK) · Expo Router · TypeScript · TanStack Query · React Hook Form + Zod · supabase-js with
`expo-secure-store` session storage · `expo-image-picker` + `expo-image-manipulator` · `expo-location` ·
i18n with RTL. Same shape as `apps/dashboard`, so one person can read both.

`apps/*` is already an npm workspace, so `apps/mobile` is picked up by the root `npm install`. Metro has to watch the
workspace root, and React must resolve to one copy — the dashboard pins React 19.2 and Expo pins its own. **Proving
this is the first task of bite 1**, before any screen: root install, dashboard still builds, Metro resolves.

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

**Three things are lifted verbatim** rather than retyped, because retyping invites drift from approved copy.
Claude does this extraction (the source is already in hand), Codex builds on top of it:

| What | From | To |
| --- | --- | --- |
| Copy, ~200 keys per language | `T.ar` / `T.en` | `src/i18n/ar.ts`, `src/i18n/en.ts` |
| ~40 icons as SVG path data | the `I` object | `src/ui/icons.ts` (react-native-svg) |
| Colours per theme, per material, radii, Tajawal weights | inline styles + `cw.css` | `src/ui/tokens.ts` |

**Business rules are taken from the database, never from the prototype.** They already disagree — see
*Prototype vs database* below.

---

## Phase 0 — before the first screen

- [ ] Generate the TypeScript types from Supabase into `src/data/database.types.ts`.
      Every mock in phase A is written to **this** shape, so phase B swaps a data source instead of rewriting screens.
- [ ] Write down the real query and RPC signatures each screen needs (one short table, in this file).
- [ ] Edge Function `chains` — active chains (name + code) with no JWT, for the branch side of the sign-in screen.
      An Edge Function, not a grant to `anon`, so "anon can't read or call anything" stays literally true.

## Phase A — the shell

All screens of both roles, both languages, both themes, on mock data in the real shape. Five bites; Claude reviews
each one before the next starts.

### Bite 1 — foundation, sign-in, password change

Auth is **real from day one**. A fake sign-in proves nothing — the temporary password, the forced change and the
5-attempt lock are all server behaviour, and faking them means building them twice.

- [ ] Expo app in the workspace; Metro + React resolution proven (see Stack)
- [ ] Tokens, theme provider, language provider, RTL, Tajawal
- [ ] Supabase client with secure session storage; TanStack Query; online/offline detection
- [ ] Shared loading / error / empty / offline components
- [ ] Splash
- [ ] Sign-in: **Branch | Driver** segmented switch above the fields — remembered on the device, opens on the last
      side used; switching clears the typed fields and any error. Branch → chain picker + branch number + password.
      Driver → mobile number + password.
- [ ] Sign-in through the `sign-in` Edge Function: `401 INVALID_CREDENTIALS { attempts_left }`,
      `429 LOCKED { retry_after }` — both rendered as the designs' text
- [ ] Forced password change: `auth.updateUser({ password })` → `rpc('complete_password_change')`,
      `PASSWORD_NOT_CHANGED` handled. Rule: 8+ characters with at least one Latin letter and one digit
- [ ] Role routing from `profiles.role`; if the account belongs to the other side, sign out and say so
- [ ] Error-code → message map covering every UPPER_SNAKE code in `supabase/README.md`

**Done when** a real branch account and a real driver account each sign in on a phone, change the temporary
password, and land on their own role's home.

### Bite 2 — branch screens

Set branch location · home · create request (material → weight + photo → review) · subtype sheets with
open-request locking · request sent · request details before and after the visit day is set · my requests ·
notifications · account.

### Bite 3 — branch states

Home loading / error / new branch with no requests · offline retry bar · location permission denied ·
create-request input errors · send failed while offline · details being rescheduled after a failed pickup ·
details with the manager · cancel confirmation · contact-manager sheet · no requests.

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
- [ ] The four migrations below
- [ ] Every error code from the README mapped to its designed message

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
| 20 | `materials.contact_phone` + a field on the dashboard's materials screen | phase B |

Migration 20 closes a real gap: the branch design has a "contact the manager" sheet with a number, but `materials`
has no contact column and `profiles_read` is self-or-staff, so a branch cannot read a staff member's phone at all.
Until it lands, the sheet falls back to `app_settings.ops_phone`, which branches *can* read — and that fallback stays
afterwards for any material with no number. Same rule everywhere: **no number means the contact button hides**, it
never shows a dead button.

### Checked, needs nothing

The driver's "next plan" screen does not need new RLS. `plan_approvals` is staff-only, but `staff_approve_plan` is
what writes `driver_id` and `visit_day` — so a driver seeing assigned rows for tomorrow already means the plan is
approved, and no rows means it isn't.

---

## Prototype vs database

Found while reading both against each other. The database wins every time.

| | Prototype | Database |
| --- | --- | --- |
| Mobile number | `^5\d{8}$`, shown as `+966 55 …` | `^05[0-9]{8}$` |
| Weight ceiling | 5,000 kg in the form | no ceiling yet — migration 18 |
| Branch location | treated as locked after confirming | can be re-confirmed — migration 17 |
| English branch name | shown | column doesn't exist — migration 19 |

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
