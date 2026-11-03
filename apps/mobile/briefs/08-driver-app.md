# Bites 4 and 5 — the driver app, on the live backend

The branch app is finished and runs on the live project. The driver app is one placeholder screen:
`src/app/driver.tsx` renders `RoleHome`, a title and a log-out button. This replaces it with the whole
driver app — every screen of the driver canvas, its states, and its reads and writes — in one pass.

**Decided by Ahmed, 1 November 2026, and not open here:**

- **Live from the first line.** The branch was built on mock data and then wired, which meant drawing
  every data state twice. The backend now exists, so there is no mock: no `src/data/mock/`, no sample
  rows, no `setTimeout`. Every screen reads the real database from the start.
- **The phone's own camera**, exactly as the branch does it — `takePhoto()` in `src/data/device.ts`.
  The canvas's camera screen (lines 548–568) is the prototype standing in for a camera it did not have,
  and is **not built**. Camera only, never the gallery: the driver's photo is proof of the visit.
- The canvas's hint goes on the button that opens the camera, which it already carries
  (`takePhoto` + `photoHint`, line 481). `camHint` and `capture` stay unused.

Read `apps/mobile/PLAN.md` first — *Data per screen → Driver*, *Driver history*, and *Decided: one icon
language*. Then read the branch app, because it is the pattern for everything here and one person reads
both: `src/branch/state.tsx` (queries, mutations, realtime, the page switch), `src/data/branch-api.ts`
(how a read and an upload are written), `src/branch/app.tsx` (navigation and the hardware back button),
`src/branch/create.tsx` (a photo uploaded before the row is written, and the send-failure block).

**Do not write SQL and do not touch `supabase/`.** The one migration this needs —
`supabase/migrations/20261102000100_driver_history.sql`, migration 21 — is **already applied to the
live project**. Read its header: it is why some of the reads below behave the way they do.
`database.types.ts` needs no change, because the migration adds no column and no public function.

## The source

`apps/mobile/design/driver/Main.dc.html` — **gitignored**, so `rg` needs `--no-ignore`. A web
prototype: one class component, a `<x-dc>` runtime, `setTimeout` state, hardcoded sample arrays. Read
it as a spec and rebuild in React Native. Never port it. Its `T` object (918–1027) is **not** the copy:
the approved copy is `copy.driver` in `src/i18n/ar.ts` / `en.ts`, already lifted, with demo data
replaced by placeholders (`{name}`, `{material}`, `{branch}`, `{date}`, `{when}`, `{n}`, `{x}`). Use
those keys; add none without saying so in your report.

| Screen | Markup | View model |
| --- | --- | --- |
| Voluntary password change | 90–120 | `cp`, 1571 |
| Home | 122–272 | `hm`, 1309 |
| Today's plan | 274–339 | `pl`, 1333 |
| Stop details | 341–422 | `sd`, 1354 |
| Record outcome | 424–545 | `kinds` 1369, `o` 1379, `valid()` 1246 |
| Success takeover | 571–595 | `sc`, 1408 |
| Next plan | 598–638 | `tm`, 1428 |
| History, period sheet, visit sheet | 640–701 and the sheets | `hDays` 1444 – `rg` 1493 – 1526 |
| Notifications | 703–723 | 1515–1526 |
| Account | 725–768 | `acc`, 1527 |
| Loading / error / empty layer | 769–798 | `cs`, 1544 |
| Bottom nav | 799–809 | `nav`, 1550 |
| Enlarged branch photo | 819–838 | `photoBig` |
| Sheets: ops, logout, range, visit | 839–915 | `sh`, 1581 |
| Handlers | — | 1577–1638 |

The style block is `cw.css` next to it. Colours are already in `src/ui/tokens.ts` — the driver's
`ringTodo` included — and where the two canvases disagreed, the branch's value is the token. Literal
paddings, radii and font sizes come from the markup; there is no scale and you do not invent one.

`States.dc.html`, `Journey.dc.html`, `Tabs.dc.html`, `Dark.dc.html` and `English.dc.html` are the same
component under different `preset`s. `States.dc.html` names the eighteen states this bite builds.

## Files

New, all under `src/driver/` unless named: `app.tsx`, `state.tsx`, `shared.tsx`, `home.tsx`,
`stop.tsx`, `outcome.tsx`, `history.tsx`, `screens.tsx` (next plan, notifications, account, success —
split differently if a file passes ~600 lines), `password.tsx`, and `src/data/driver-api.ts`.

Changed: `src/app/driver.tsx` renders `<DriverApp />` inside its `AuthGate`, the way `branch.tsx`
renders `BranchApp`. `src/ui/role-home.tsx` then has no caller — delete it. `src/ui/icons.ts` gains the
icons below. `src/data/errors.ts` gains the driver codes below.

**Move, don't copy.** `fetchNotifications`, `markNotificationsRead` and `signedPhotoUrl` in
`branch-api.ts` are not about a branch — RLS decides whose rows come back. Move them into a new
`src/data/shared-api.ts`, re-point the branch's imports, and use them from the driver. Same for any
component in `src/branch/shared.tsx` the driver needs unchanged (`Tile`, `Pill`, `IconButton`,
`useSignedPhoto`, the date formatter): move it to `src/ui/` rather than importing across roles. A
driver file never imports from `src/branch/`.

## `src/data/driver-api.ts`

Write these, each with a doc comment in the style of `branch-api.ts`. Every read selects named columns,
never `*`.

```ts
export type DriverContext = {
  driver: DriverRow & { materials: Pick<MaterialRow, 'code' | 'name_ar' | 'name_en' | 'color_light' | 'color_dark' | 'icon'> | null;
                        cities: Pick<CityRow, 'name_ar' | 'name_en'> | null };
  opsPhone: string | null;   // app_settings 'ops_phone'; null or '' both mean none
  offToday: boolean;         // a driver_days_off row for (me, today)
};
export async function fetchDriverContext(today: string): Promise<DriverContext>;

/** Today's stops. See "Which rows are today's plan" below — the filter is not optional. */
export async function fetchDay(driverId: string, day: string): Promise<RequestListRow[]>;

/** The earliest visit_day after today that has rows for me, with those rows and when it was approved. */
export async function fetchNextPlan(driverId: string, today: string):
  Promise<{ day: string; rows: RequestListRow[]; approvedAt: string | null } | null>;

/** Active `failed` and `partial` reasons, by sort_order. */
export async function fetchReasons(): Promise<ReasonRow[]>;

/** My attempts in [from, to], newest first, each with its request_list row when I can still read it. */
export async function fetchHistory(driverId: string, from: string, to: string):
  Promise<{ attempt: AttemptRow; request: RequestListRow | null; reason: Pick<ReasonRow, 'label_ar' | 'label_en'> | null }[]>;

/** request-photos at `request/<requestId>/<uuid>.jpg`, real bytes through expo-file-system's File. */
export async function uploadOutcomePhoto(requestId: string, photo: Photo): Promise<string>;

export type RecordOutcomeArgs = { requestId: string; outcome: 'full' | 'partial' | 'failed';
  reasonId: string | null; reasonText: string | null; note: string | null; photoPath: string | null };
export async function recordOutcome(args: RecordOutcomeArgs): Promise<void>;
```

**Every query filters on the driver's own id**, even where RLS already would. Today RLS limits a driver
to what is assigned to them. Migration 21 widened that to every request they have ever
visited, so from then on `request_list` without `driver_id = me` also returns requests now assigned to
another driver. The filter is what keeps those off today's plan.

`uploadOutcomePhoto` reads the file with `new File(uri).arrayBuffer()` from `expo-file-system`, exactly
as `uploadScalePhoto` does. **Never `fetch(uri).arrayBuffer()`**: in React Native it does not return a
local file's bytes, and the branch shipped 14-byte photos because of it. The upload policy only lets the
driver write while the request is still `scheduled`, so upload, then call the RPC.

`fetchNextPlan` reads `plan_approvals` for `(me, day)`, newest `approved_at` — migration 21 is what
lets a driver read their own rows there. A plan with no approval row (ops assigned it some other way)
gives `approvedAt: null`: render the line without its time, never a fake one. `fetchHistory`'s reasons come by `id` with no `active` filter: a reason
ops retired yesterday is still the reason that visit had.

Today is `new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date())`, the same
line the branch uses — move that helper to `src/ui/` too rather than writing it twice.

## Which rows are today's plan

`request_list` where `driver_id = me` and `visit_day = today`, **and** either `status = 'scheduled'` or
`last_attempt_day = today`. The second half is what keeps a request ops cancelled or closed this morning
off the plan, while a stop you recorded today — now `completed` or `needs_decision` — stays on it.

**A stop's state** is `last_attempt_day === today ? last_outcome : 'todo'`. Not `last_outcome` alone: a
request rescheduled after yesterday's failed visit comes back today carrying yesterday's `failed`, and
must read «لم تُزر».

A stop leaves the list when ops reschedules it (`driver_id` goes null). That is right, and the progress
total moves with it.

## The screens, against the real data

Everything the canvas draws is built. Where the canvas and the database disagree, the database wins,
and these are all of the places:

- **Home.** `hi` takes the driver's first name (`full_name` / `full_name_en`, falling back to Arabic),
  `truckLine` the material. `inDistricts` counts distinct `district_id` in today's plan. The suggested
  stop is the canvas's `suggest()` (1145) on the real rows, with `last_attempt_at` as the time. The
  three day states, in this order: `offToday` → «لست مجدولًا»; no rows → «لا توجد خطة معتمدة»; every row
  recorded → «أنهيت خطة اليوم». The next-plan card shows `nextPlanValue` from `fetchNextPlan`, and hides
  when there is none.
- **The plan-changed banner** (`showChange`) is the newest unread notification of kind `plan_changed`
  or `plan_updated` created today. Its title and body are **that row's** `title_*` / `body_*` — the
  database already wrote them in both languages — not `planChangedTitle` / `planChangedBody`, whose
  sample sentence no notification actually sends. «حسنًا» hides it for this session (remember the id);
  it does not mark anything read.
- **The «جديدة» tag is dropped.** No column says a stop was added after the plan was approved.
  Do not derive it from `created_at`, which says something else.
- **The «مسودة محفوظة» tag and «متابعة التسجيل»** are real: drafts live in `DriverProvider` state, keyed
  by request id, for as long as the app is open. Not persisted.
- **Grouping by district** (plan, next plan): group on `district_id`, groups ordered by name in the
  current language, stops inside a group by chain code then `branch_number`. Title is
  `{chain} #{branch_number} – {district}`, as the canvas draws it.
- **Stop details.** Each row only when its value exists: address, `branch_access_notes`, the branch's
  note, the contact row (only when `contact_name` — the same rule as the branch's `7e7c68f`), the call
  buttons only when there is a phone, «فتح الموقع في خرائط الجوال» only with `lat` and `lng`. No button
  that cannot work. Maps opens through `Linking` with a `geo:` URI on Android and `maps:` on iOS. The
  branch photo is a signed URL, tap to enlarge; with no `branch_photo_path`, the canvas's
  `noBranchPhoto` card. A recorded stop shows `recordedAs` and `wrongEntry`, which opens the ops sheet
  — or, with no ops number, is plain text.
- **Record outcome — full** needs the photo. **Partial** needs the photo and a reason: the three chips
  are the database's `partial` reasons, not `quick1`–`quick3`. Picking one sends `p_reason_id`, and the
  note goes as `p_note`. With no chip, a note of 3+ characters is required and goes as `p_reason_text`.
  That is exactly the RPC's rule (a reason id or a reason text). **Failed**: the tiles are the
  database's `failed` reasons followed by the canvas's «سبب آخر» (`r_other`), which opens the text box
  and sends `p_reason_text`. The reason tiles carry the label and no icon — the database has no icon
  column, and inventing one per row is how drift starts. `r_closed`…`r_noReach` stay unused.
- **Sending.** The photo is uploaded first, its path kept in the draft, then the RPC. A retry after the
  RPC failed reuses the uploaded path rather than uploading again. Both mutations use
  `networkMode: 'always'` — the branch's comment in `state.tsx` says why. The canvas's three outcomes:
  `notSent` + `keptData`, the offline block, and success. Nothing in the draft is cleared until the RPC
  has returned.
- **Success.** `sc.progress` is today's recorded / total after the write; `next` goes to the suggested
  stop, or `toPlan` when `lastDone`.
- **History.** The period sheet's four quick ranges and its from / to pick; the filter on outcome; days
  grouped and collapsible as drawn; the visit sheet with your photo (signed URL), note and reason.
  **A row whose request you can no longer read still renders** — outcome, time, note, photo, and
  `copy.driver.request` with no number in place of the branch label. Ops can reschedule at any moment,
  so this is the normal case, not an error. `no_result` rows are not the driver's and are filtered out.
- **Notifications**: as the branch's — newest first, unread marked, `mark_notifications_read` when the
  screen opens. A `plan_*` notification opens the plan; one with a `request_id` that is on today's plan
  opens that stop; anything else does nothing on tap.
- **Account**: initials from the name, `+966` display of `phone`, city, `PreferencesControls`,
  «تغيير كلمة المرور» → the `pwd` page, the logout sheet. The password page is the canvas's 90–120 in
  its `cpSubChange` mode and calls the existing `changeOwnPassword` from `auth-api.ts` — read
  `src/branch/password.tsx`, which does the same job for the branch, including why it is a page and not
  the `/change-password` route.
- **The ops sheet** and every «تواصل مع العمليات» need `opsPhone`. It is empty on the live project
  today, so they are **hidden**, not dead.
- **Offline**: the shared `OfflineBar` from `src/ui/components.tsx` with the heights your pages need,
  not the canvas's toast — one visual language, and the branch's bar already says the same thing.

## The states — bite 5

All eighteen in `States.dc.html`: home loading / error / no plan / off day / all done / offline · stop
done / couldn't load / no branch photo · plan loading / error · sending / not sent / offline while
sending · next plan not approved · notifications empty · history empty (and the period-empty variant).
Use the shared `Skeleton`, `ErrorState` and `EmptyState`; the branch shows how.

**Not built here:** `loginError` and `loginLocked` are sign-in's, which is already shared and done.

## Realtime

One channel, `driver-live`, in `DriverProvider`, the way `branch/state.tsx` does it: `requests` and
`visit_attempts` refetch the day, the next plan and history; `notifications` refetches notifications;
`driver_days_off` refetches the driver context (`offToday`); `plan_approvals` refetches the next plan;
everything is invalidated on each (re)subscribe. Migration 21 added those last two to the publication.

## Errors

`driver_record_outcome` raises `NOT_ALLOWED`, `INVALID_STATUS`, `NOT_VISIT_DAY`, `INVALID_OUTCOME`,
`PHOTO_REQUIRED`, `INVALID_REASON`, `REASON_REQUIRED`. Only `REASON_REQUIRED` has a sentence
(`needReason`, already mapped). `INVALID_STATUS` is mapped to a **branch** sentence today, keyed by
nothing — make that mapping role-aware so the driver falls through to `errBody`. On `INVALID_STATUS`
or `NOT_VISIT_DAY`, refetch the day after showing it: the stop changed under the driver. Do not write
new sentences; list in your report every place a driver can meet a generic one.

## Icons

Draw only the ones these screens use, in the branch's hand (24×24, 1.6 stroke, round caps), from the
twelve PLAN.md lists: `map-trifold`, `navigation-arrow`, `x-circle`, `calendar-check`, `calendar-x`,
`magnifying-glass-plus`, `device-mobile`, `circle-notch`. Not `sun` or `circle-half`: the theme
control is the existing `PreferencesControls`. Not `eye-slash`: the password page follows
`src/branch/password.tsx`, which needs none. The decorative ones get the nearest existing icon or none.

## Done when

- `npx tsc --noEmit` is clean and `npm run bundle` produces a bundle.
- `rg "from '@/branch" src/driver` and `rg "from '@/driver" src/branch` both return nothing.
- `rg "fetch\(.*\)\.arrayBuffer" src` returns nothing.
- Your report lists: every canvas element you did not build and why; every generic error a driver can
  meet; any copy key added; every file moved.

Do not commit.

## Not yours

- `supabase/`, including migration 21, which is done and applied.
- `apps/mobile/PLAN.md` — Claude updates it after reviewing your work.
- Testing on a phone, with Ahmed, on the driver account he already has.
