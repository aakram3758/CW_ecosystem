# Phase B, branch — mock data out, Supabase in, and the six states that come with it

The branch app's screens are approved on a real phone and run entirely on `src/data/mock/branch.ts`.
This replaces that file with the real database, and builds the six states that only exist once there
is a network to fail: home loading, home error, a branch with no requests, the offline bar, a send
that failed, and a request being rescheduled after a failed pickup.

Those six were deliberately left out of bite 3a. Built on mock data they would have meant inventing
a delay and a failure to look at, then writing them again against a real one. This is the real one.

**The structure is already in the repo and your job is the bodies.** Two new files carry full
signatures and a doc comment per function; `state.tsx` is rewritten around queries and mutations
with its bodies left; four shared components are redrawn to the canvas as empty bodies.

Migrations 17–19 are **already applied to the live project**. `branch_set_location` now refuses a
second confirmation (`LOCATION_ALREADY_SET`), both write RPCs cap the weight at 5,000 kg
(`KG_TOO_LARGE`), and `branches.name_en` exists. `src/data/database.types.ts` is up to date. Do not
write SQL and do not touch `supabase/`.

## The source

- `apps/mobile/design/branch-v2/project/Main.dc.html` — **gitignored**, so `rg` needs `--no-ignore`.
  A web prototype: read it as a spec, never port it.
- `supabase/README.md` — the RPC list and every error code the branch RPCs raise.
- `apps/dashboard/src/data/api.ts` and `queries.ts` — the same job already done for the dashboard.
  Match its shape; one person reads both apps.

| State | Canvas lines |
| --- | --- |
| Home loading — the skeletons | 344–347 |
| Home load error | 349–356 |
| Home with no open requests | 370 |
| Requests list empty, with its two different actions | 637–644 |
| The offline bar, and the three heights it sits at | 730–737, and `off.bottom` at 1552 |
| Create — send failed | search `cr.sendErr` |
| `.sk` and `.ov` classes, the `cwsk` and `cwup` keyframes | the style block, lines 13–112 |

## 1. `src/data/branch-api.ts` — fill the eleven bodies

Every function has its doc comment. Four things in them are not negotiable:

- **Reads carry no branch filter.** RLS already limits every one of these tables to this branch's
  own rows. Adding `.eq('branch_id', …)` would mean reading the branch id before you can read
  anything, for no gain.
- **The photo goes up before the RPC is called.** A row pointing at a file that failed to upload is
  worse than no row.
- **The upload body is an `ArrayBuffer`** read from the local URI with `fetch`, with
  `contentType: 'image/jpeg'` stated. `FormData` and `Blob` both have gaps on Android, and without
  the content type storage serves `application/octet-stream` and the image downloads instead of
  rendering.
- **`signedPhotoUrl` returns null instead of throwing.** A thumbnail that will not load is something
  the screen draws differently, not a failure of the screen.

Errors: let the Supabase error through as-is. `src/data/errors.ts` already matches the UPPER_SNAKE
code out of the message, and it now covers the branch's codes. Do not catch and rewrap.

## 2. `src/branch/state.tsx` — fill the mutation bodies and the gate

The queries are written. What is left:

- `create` and `edit` — upload the photo if there is one, then call the RPC with the path. On
  success, invalidate `requests` and `timeline`; `create` also selects the new id and moves to the
  success screen, which is what the mock's `create` did.
- `retry` — invalidate all five keys.
- `BranchProvider` — the gate, as **two components**. A hook cannot be called conditionally and
  `useBranchState` asserts the context row is present, so the provider owns the gate and
  `BranchData` owns the state. Both read the same query key, so the second costs nothing.
- `cancel`, `confirm` and `readAll` are declared; give each its `onSuccess` invalidation —
  requests + timeline, context, notifications respectively.

`opsToday()`, `isOpen` and `isRescheduled` are written. **`isRescheduled` is a derivation, not a
column**: the prototype carried a `resched` boolean on its sample rows; real data has status
`waiting` plus a `last_outcome`, because `staff_decide`'s reschedule sets the status back and clears
the visit day while the `visit_attempts` row stays. Its doc comment says so.

## 3. `src/ui/components.tsx` — four bodies

`Skeleton`, `ErrorState`, `EmptyState` and `OfflineBar`, each specified in full in its doc comment.
The last three replace plain placeholders written in bite 1 before these states had been drawn — the
canvas's versions are a centred circle and a floating navy bar, not cards.

`OfflineBar`'s `onRetry` is optional on purpose: sign-in, the password screen and the splash already
show this bar and have nothing loaded to refetch, so there the bar appears without its gold button.
Leave those three call sites as they are.

**React Native's own `Animated`, never `react-native-reanimated`.** Reanimated is in `package.json`
and **cannot be imported in this app** — it resolves its own nested `semver@7` while the root has
`semver@6`, and `disableHierarchicalLookup` in `metro.config.js` refuses to look inside a package
for its own dependencies. That setting is what keeps one React in the bundle. `metro.config.js` says
so at the top; it cost a whole round once already. Same for `react-native-gesture-handler`.

Opacity and transform are safe on the native driver. `backgroundColor` is not — it throws on the
device and passes every gate, so no gate will catch it for you.

## 4. The screens

### `main-screens.tsx` — home

Three states, in the slot where the next-visit card goes (the `.ov` card that overlaps the hero by
52):

- `data.loading` → the canvas's skeletons: an `.ov`-shaped card holding three `Skeleton`s (110×14,
  220×26, full×40), then below it, in the active-requests section, a 140×20 and two full×78 at
  radius 18.
- `data.error` → `<ErrorState onRetry={data.retry} />` in that same card position.
- Neither, and no open requests → `<EmptyState title={t.emptyT} body={t.emptyB} icon="box" />`.
  Note this replaces the current `open.length ? … : null`, which drew nothing at all for a new
  branch. The canvas puts the box icon on `accentSoft` here; `EmptyState` takes the icon.

The hero, the tips and the bottom nav draw in every one of these states. Only the middle changes.

### `main-screens.tsx` — my requests

The list's empty state, at the canvas's lines 637–644, with the action that matches *why* it is
empty:
- a material filter is hiding everything → `t.showAll`, which clears the filter;
- the active tab is genuinely empty → `t.newReq` as the primary action, which opens the create
  screen;
- the past tab is empty → no action at all.

### `create.tsx` — the send

- The footer button shows `data.sending` as its `busy` and is disabled while it is true.
- `data.sendError` → the canvas's `cr.sendErr` block above the button: `dangerSoft`, radius 14,
  padding 12, the `cloudX` icon in `dangerText`, and the message from
  `errorMessage(data.sendError, copy, 'branch')`. **The form keeps everything** — the weight, the
  note, the contact, the chosen photo. That is the whole point of the state. Dismiss it on the next
  press, with `data.clearSendError()`.
- `submit()` now passes the picked `Photo` rather than a path: `data.create(args, chosenPhoto)` with
  `p_photo_path` gone from `args`. `mock.photoPath` is deleted along with the mock.

### `details.tsx` — being rescheduled

`isRescheduled(row)` from `state.tsx` → the status card reads `t.st_resched` with the
`sub_resched` subtitle, which takes `{o}` — the last outcome, worded as the existing `outcome()`
helper in this file already words an attempt. The icon and colour stay the waiting ones.

`Photo` for a stored photo: see below.

### `shared.tsx` — `Photo` and `useSignedPhoto`

`request-photos` is private, so `branch_photo_path` is not a URL. Add:

- `useSignedPhoto(path: string | null)` — a query keyed `['photo', path]` over
  `api.signedPhotoUrl`, `staleTime` 50 minutes against the hour the URL lasts, disabled when the
  path is null.
- `Photo` takes an optional `uri`. With one, it draws `<Image>` at the same size and radius; with
  none it keeps the drawn SVG placeholder, which is still what a request with no photo shows and
  what a signed URL that failed falls back to.

### `location.tsx` — the real confirmation

`cw.mock.location` and every SecureStore line in this file and in `state.tsx` go. The row is the
truth: the branch app shows the location screen when `branch.location_confirmed_at` is null and the
home screen when it is not, and `confirmLocation` now waits for the RPC.

- The confirm button shows `data.locating` as `busy`.
- `data.locationError` → an `ErrorLine` in the sheet. `LOCATION_ALREADY_SET` is already mapped to
  «لتغيير الموقع تواصل مع فريق التشغيل.» — the case where the other phone on this shared account got
  there first.

### `app.tsx` — the offline bar

`<OfflineBar bottom={…} busy={…} onRetry={data.retry} />` beside the `Toast`, with the canvas's own
three heights (`off.bottom`, line 1552): **100** on the four tabbed pages, **178** on create,
details and location, which have a footer, and **24** on the success screen.

## 5. Delete the mock

`src/data/mock/branch.ts` goes, and with it the whole `src/data/mock/` folder. Every screen that
imported a row type from it imports it from `@/data/rows` instead — the aliases are already there,
plus `CreateRequestArgs` and `EditRequestArgs` with the two arguments the type generator gets wrong
widened, which is why those two types are not imported from `database.types.ts` directly.

Nothing in the app may import from `src/data/mock/` when you are done.

## Rules that hold across all of it

- **No new dependency.** Everything needed is installed. `expo-image-manipulator` in particular is
  not needed and must not be added: `device.ts` already asks the picker for `quality: 0.7`.
- **No new copy key, and no edit to an existing one.** Every string this round needs is already in
  `src/i18n/ar.ts` and `src/i18n/en.ts`. If you believe one is missing, stop and say so in your
  report rather than inventing it — the copy is lifted from an approved design.
- **Nothing new in `tokens.ts`.** Every colour is already a token. `softFill(color)` is how a
  duotone icon's fill is produced; without it the fill is solid and the icon reads as a block.
- **Digits and Latin runs inside Arabic go through `ltr()`** from `@/i18n/copy`. `f.phone()` already
  does it. `writingDirection: 'ltr'` is **iOS only** in React Native — never reach for it.
- Touch targets stay at 44 or more; every new button gets an `accessibilityRole` and, where its
  label is an icon, an `accessibilityLabel`.
- Match the file you are in.

## Done means

- `npx tsc --noEmit` clean from `apps/mobile`.
- `npm run bundle` exits 0.
- `rg -n "data/mock" apps/mobile/src` finds nothing.
- Nothing outside `apps/mobile/src` touched. No dependency, no copy key, no token, no SQL, nothing
  committed — Claude reviews the diff and commits.

This message is your approval to start; no read-back needed.
