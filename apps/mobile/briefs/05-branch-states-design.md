# Bite 3, first half — the four states that are design, not data

Ahmed tested bite 2.5 on his phone and signed it off. Bite 3 is the branch's remaining states, and
it splits in two: four of them are pure design and he wants to see them before the app is wired to
Supabase, and the rest — home loading, home error, a branch with no requests, the offline retry bar,
send-failed — are states of *data*, and they are not yours. Building those on mock data would mean
inventing a delay and a failure to look at, and then writing them again once there is a real one.

So this brief is exactly four:

1. **the cancel-request confirmation** — the button has been drawn `disabled` since bite 2 because
   this sheet had not been reviewed;
2. **the contact-the-manager sheet** — which today is a native `Alert.alert` printing the number as
   text, because the prototype could not dial and we copied its apology instead of its button;
3. **the create-request input errors** — the form currently disables its own button and never says
   why;
4. **the location permission denied state** — today one grey line where the canvas has a card.

**The structure is already in the repo and your job is the bodies.** Everything that is a decision
— which value comes from where, what is valid, what resolves to which phone number, what the state
shape is — is written and type-checks. What is left is the styled JSX, and each hole has a doc
comment or an inline comment above it that specifies it down to the numbers.

## The source

`apps/mobile/design/branch-v2/project/Main.dc.html` — **gitignored**, so `rg` needs `--no-ignore`;
open it by path. A web prototype: read it as a spec, never port it.

| What | Lines |
| --- | --- |
| The toast — markup | 739–745 |
| The toast — its 3200ms timer | 1106–1109 |
| The sheets — contact variant | 753–762 |
| The sheets — confirm variant | 763–772 |
| The sheets — view-model, incl. `mgr`, `ops` and `cancel` | 1555–1595 |
| The location screen, denied card at 291, locating overlay at 313, blue dot at 306 | 283–320 |
| The location view-model `lc` | 1357–1373 |
| Create step 2, with the error lines at 449 / 479 / 496 / 504 and `fixErrs` at 509 | 436–510 |
| `wErr`, `cErrs`, `valid` | 1127–1137 |
| The `w` / `ct` / `ph` view-models and their border colours | 1427–1453 |

`design/branch/States.dc.html` is the states artboard — it is only a grid that imports `Main` with
a `scenario` prop, so it tells you which states exist (S5 denied, S6 invalid, S10 cancel, S11
contact) and nothing about how they look. Read `Main`.

Every string already exists in `src/i18n/ar.ts` and `src/i18n/en.ts`, lifted in phase 0. **Add no
copy and change none.** The keys you need are all in the `branch` object except `locFailed`,
`phonePrefix` and `phonePlaceholder`, which are in `shared`.

## What is already done — do not redo it

- `useContact()` in `src/branch/main-screens.tsx` now resolves who to call and opens the sheet, and
  the four call sites are converted. The rule it encodes — the material's own manager, else the
  unified operations number, else **the button is not drawn** — is the app's standing rule; don't
  reintroduce a button that can't work.
- The create form's validation: `weightError`, `contactError`, `valid`, `showErr`, `badWeight`,
  `badName`, `badPhone`, the `advance()` handler, the three card borders, the weight box border, the
  two `Field error` props, the dashed-border colour, and the warning block with its `info` icon.
- The location screen's `denied` / `device` / `locating` state and the `locate()` branches; the blue
  dot in `BranchMap`, now drawn at the device's own coordinates and only once there are some.
- `src/branch/state.tsx` holds `toast`, `contact`, `showToast`, `dismissToast`, `openContact`,
  `closeContact`; `src/branch/app.tsx` mounts the `Toast` and the `ContactSheet` above the pages.
- `expo-clipboard@58.0.4` is installed and in `apps/mobile/package.json`. **Install nothing else.**

## The seven holes

### 1. `src/ui/components.tsx` — `Toast`

Empty body under a doc comment that carries the whole thing: the position, the card, the shadow
block (the same one `AuthCard` uses), the `seal` icon, the type, the 200ms fade, the 3200ms
`onDone`, and the restart-on-new-text rule.

**React Native's own `Animated`, not `react-native-reanimated`.** Reanimated is in `package.json`
and **cannot be imported in this app** — it resolves its own nested `semver@7` and
`disableHierarchicalLookup` in `metro.config.js` refuses to look inside a package for its own
dependencies. That config is what keeps a single React in the bundle. `metro.config.js` says so at
the top; it cost a whole round last time. Same for `react-native-gesture-handler`.

Opacity on the native driver is fine. `backgroundColor` is not — it throws on the device and passes
every gate, so no gate will catch it for you.

### 2. `src/branch/shared.tsx` — `ContactSheet`

Empty body under a doc comment that specifies the tile, the title, the body, the number row with its
copy button, and the two actions — including the two places this deliberately departs from the
canvas and why. Read it before you start; both departures are the point of the component.

`expo-clipboard` for the copy. `Linking` from `react-native` for `tel:` and `https://wa.me/…`.
Neither button places a call or sends a message: the dialer and WhatsApp open with the number in
them and wait for the person. Do not add a confirmation step and do not use `t.dialToast` — it is a
prototype-only string that exists because the canvas had no dialer.

### 3. `src/branch/details.tsx` — the cancel confirmation sheet

`{/* structure to fill */}` inside the `<Sheet>`, under a comment that gives the tile, the title,
the body, the two buttons, and what the confirm does. Two things it is easy to get wrong:

- The second button is `t.keep` («تراجع»), **not** `t.back`. It is a decision to keep the request.
- After confirming, the screen **stays on the request**. It does not go back. The point is to see the
  status card turn to «ملغي» and «ألغاه الفرع» appear at the end of the history.

The sign-out sheet at the bottom of `main-screens.tsx` and the location sheet in `location.tsx` are
the same component in the same shape — match them.

### 4. `src/branch/state.tsx` — `cancelRequest`

A body of comments. Two effects, both local, both named in the comment. No fake delay: the comment
says why.

### 5. `src/branch/location.tsx` — the denied card

`<View style={{ /* structure to fill */ }} />`, under a comment with the colours, the radius, the
padding, the icon and the two lines. It sits between the accent warning and the map, which is where
the canvas puts it, because what it tells you to do is on the map.

### 6. `src/branch/location.tsx` — the locating overlay

Comment only, no element yet, immediately after the `</Svg>` inside `BranchMap`. The scrim, the
pill, the spinner, the label — and it must be above the Svg so the map cannot be dragged while the
device is being asked.

### 7. `src/branch/create.tsx` — the `fixErrs` line

Comment only, in the footer above the button. An `ErrorLine` with `icon={null}` — `ErrorLine` was
given that option for this one line, because the fields it points at are the ones carrying icons —
and its row centred. Shown only while `showErr && !valid`.

## Rules that hold across all of it

- **Nothing new in `tokens.ts`.** Every colour you need is already a token. `softFill(color)` is how
  a duotone icon's fill is produced — the canvas draws `.ic .f` at a fifth of the icon's own colour,
  and passing no `tint` gives you a solid block instead of an icon.
- **Digits and Latin runs inside Arabic go through `ltr()`** from `@/i18n/copy` — a phone number
  reverses on screen otherwise. `f.phone()` already does it; don't double-wrap. And
  `writingDirection: 'ltr'` is **iOS only** in React Native, so never reach for it.
- A `Modal` renders outside the provider tree, so `Sheet` sets its own `direction`. It already does;
  don't add another.
- Touch targets stay at 44 or more. Every new button gets an `accessibilityRole` and, where its
  label is an icon, an `accessibilityLabel`.
- Match the file you are in: these files run long lines, no semicolon-free style, and comments only
  where something would otherwise be guessed at.

## Done means

- `npx tsc --noEmit` clean from `apps/mobile`.
- `npm run bundle` exits 0.
- All seven holes filled, nothing else in the repo touched, no dependency added, no copy key added
  or changed, no migration, nothing committed — Claude reviews the diff and commits.

This message is your approval to start; no read-back needed.
