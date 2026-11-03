# Phase B, branch — the voluntary password change, and a branch with no coordinates

Three things are left in the branch app, and this is all of them. After this, development on the
branch side closes and the driver app starts.

1. **«تغيير كلمة المرور»** — the account screen's key row, which has been drawn and switched off
   since bite 2 because a voluntary change needs an auth contract the forced one does not have.
2. **A branch whose row has no coordinates at all.** Two of them exist on the live project. The
   location screen used to default its pin to the middle of Jeddah, which meant it drew a position
   nobody had chosen and would have saved it as the branch's door.
3. The copy both of those need, which **is already written** — see "No new copy" below.

**The structure is in the repo and your job is the bodies.** There is exactly one function body and
one component body to write, plus one JSX block specified in a comment where it belongs. Every
other change this round is already made.

`npx tsc --noEmit` currently reports **one** error — `PasswordScreen` returning `void` — and that
is the hole. If you see a second one, you introduced it.

## The source

- `apps/mobile/design/branch-v2/project/Main.dc.html` — **gitignored**, so `rg` needs `--no-ignore`.
  A web prototype: read it as a spec, never port it.

| What | Canvas lines |
| --- | --- |
| The password screen, both modes | 255–277 |
| Its state, and which strings each mode uses | 1330–1340 (`rule`, `pw`) |
| The map's pin, and the `placePin` pill | 307–311 |
| The confirm button, disabled with no pin | 318 |
| The location state (`hasPin`, `noPin`, `coords: '—'`) | 1354–1362 |

The `change` flag at line 1334 is the whole design: one screen, two modes. `canBack`, the `curPass`
field, the `r0` rule, `pwdChangeT`/`pwdChangeSub` and `savePass2` are the voluntary one.

## 1. `src/data/auth-api.ts` — `changeOwnPassword`

One empty body, and its doc comment numbers the three steps. The two things in it that are
decisions rather than detail:

- **Verification goes to `supabase.auth.signInWithPassword`, never through the `sign-in` Edge
  Function.** That function counts failed attempts and locks the account after five. A branch
  mistyping its own current password while changing it must not be able to lock the branch out of
  its account, and there is nothing to protect by counting here — whoever holds the phone is
  already signed in.
- **No `complete_password_change`.** That RPC closes the forced change; here `must_change_password`
  is already false and there is nothing to complete. Two Auth calls, no RPC.

`PasswordError` is declared above it. Throw its `'WRONG_PASSWORD'` for a failed verification and
`'SAME_PASSWORD'` for Auth's own `same_password`, and let anything else through as it is, so a
network failure stays a network failure. `src/data/errors.ts` already words all three.

## 2. `src/branch/password.tsx` — `PasswordScreen`

One empty body. Its doc comment specifies the whole screen: the state, the four rules and their
order, the heading block, the card's fields in order, the rule rows, the footer button, and what
happens on save. Build it from that.

Two things to get right because they are easy to get wrong:

- **The fourth rule goes last.** `passwordRules()` returns the canvas's r1, r2, r3 in order, and
  the canvas appends r0 — «أدخل كلمة المرور الحالية» — after them, not before.
- **The button is not disabled by an invalid form.** The canvas disables it; `create.tsx`
  established the other way for this app after a footer button that looked broken, and that is the
  one to match: press reveals. `busy` still disables it.

Match `create.tsx` — plain `useState`, no `react-hook-form`. The forced screen at
`src/app/change-password.tsx` uses RHF because it is phase 0's shared shell for both roles; this
one is a branch page and reads like its neighbours.

**Do not touch `src/app/change-password.tsx`.** The forced route keeps its screen, its gate and its
RPC exactly as they are. Whether that screen is ever redrawn to this canvas is a separate decision
that affects the driver too.

## 3. `src/branch/location.tsx` — the `placePin` pill

`BranchMap` already takes `hasPin`, already skips the pin when it is false, and `LocationScreen`
already passes `coords !== null`, disables the confirm button, and reads out the canvas's em dash.
What is left is the pill itself, specified in a comment at the place it goes — right after the
outer `</Svg>`, before the `locating` overlay, so the scrim still covers it.

`pointerEvents="none"` on it is not optional: the pill says to tap the map, so it must not be the
thing that catches the tap.

## No new copy, and no new token

Everything this round needs is in `src/i18n/ar.ts` and `en.ts` already — including the two
sentences that did not exist before today, `shared.wrongPassword` and `shared.samePasswordNow`,
which are written and flagged for Ahmed's review. `icons.ts` has the `dash` the unmet rule needs.
**If you believe a string or an icon is missing, stop and say so in your report rather than
inventing one.** The copy is lifted from an approved design and the icons are one hand.

## Rules that hold across all of it

- **No new dependency.** Everything needed is installed.
- **React Native's own `Animated`, never `react-native-reanimated`.** It is in `package.json` and
  **cannot be imported in this app** — it resolves its own nested `semver@7` while the root has
  `semver@6`, and `disableHierarchicalLookup` in `metro.config.js` refuses to look inside a package
  for its own dependencies. That setting is what keeps one React in the bundle. Same for
  `react-native-gesture-handler`. It cost a whole round once already.
- Opacity and transform are safe on the native driver. **`backgroundColor` is not** — it throws on
  the device and passes every gate, so no gate will catch it for you.
- **Digits and Latin runs inside Arabic go through `ltr()`** from `@/i18n/copy`.
  `writingDirection: 'ltr'` is **iOS only** in React Native — never reach for it.
- Touch targets stay at 44 or more; every new control gets an `accessibilityRole`, and the rule rows
  get `accessibilityRole="checkbox"` with their state.
- Password fields: `secureTextEntry` off the one `visible` flag, `autoCapitalize="none"`,
  `autoCorrect={false}`, and `autoComplete` of `current-password` or `new-password`.
- Match the file you are in.

## Done means

- `npx tsc --noEmit` clean from `apps/mobile`.
- `npm run bundle` exits 0.
- Nothing outside `src/branch/password.tsx`, `src/data/auth-api.ts` and `src/branch/location.tsx`
  is touched. No dependency, no copy key, no token, no icon, no SQL, and nothing committed —
  Claude reviews the diff and commits.

This message is your approval to start; no read-back needed.
