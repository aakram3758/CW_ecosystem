# Bite 2.5, stage 2 — the splash, the onboarding, and a real camera and GPS

Ahmed's remaining comments from the first device test: the splash screen and the onboarding he
added to the design are not in the app, and the camera and the location don't actually do anything.
The sixth comment, the material lock, is already done and is not yours.

As in stage 1, **the structure is already in the repo and your job is the bodies.** Three functions
and two screens throw `new Error('bite 2.5 stage 2 — not implemented')`, each under a doc comment
that specifies it. Two existing screens then get wired to the real device.

## The source

`apps/mobile/design/branch-v2/project/Main.dc.html` — **gitignored**, so `rg` needs `--no-ignore`;
open it by path. A web prototype: read it as a spec, never port it.

- lines 13–112: the style block, including `.sb-*`, `.onb-*` and the `sbFly` / `sbPop` / `sbBurst` /
  `cwrise` / `cwslide` keyframes.
- lines 114–127: the splash.
- lines 128–168: the onboarding, including its footer.
- around line 1241: the onboarding's `ob` view-model — the swipe threshold, the dots, the labels.

`SplashOptions.dc.html` is the sheet where Ahmed picked option **ب** «المواد بتتجمع». Read it for
the idea if you like, **but take every timing from `Main.dc.html`** — the option sheet was drawn
first and its delays are shorter.

## 1. `src/ui/splash.tsx` — `BrandSplash`

The doc comment carries the whole animation: the gradient, the five flying icons with their
keyframes and 80ms stagger, the burst ring, the logo pop, the tagline rise, and the three ways it
ends (it finishes, the user taps, or reduced motion is on).

Use `react-native-reanimated` — already a dependency — and `react-native-svg` for the gradient.
Both are installed; **add nothing**.

Two things to be careful about:

- **The icons' offsets are physical.** Do not mirror them for Arabic; the canvas doesn't.
- **`onDone` fires exactly once**, whether the animation finished or the user tapped through it. A
  second call would push the user past the onboarding.

## 2. `src/ui/onboarding.tsx` — `Onboarding`

Again the doc comment is the spec: the slide, the pill, the heading, the line, the dots, the two
buttons, and the swipe.

- **One slide at a time with a PanResponder**, not a horizontal paging ScrollView. The doc comment
  says why; follow it. The swipe is 50 points, and the direction is flipped in Arabic — the canvas's
  `ob.up` has the exact rule.
- **This screen is light in both themes.** It reads `palette.light` directly instead of
  `usePreferences().colors`. That is deliberate and the doc comment explains it; it is the one
  place in the app where ignoring the theme is right.
- The Android back button steps back a slide and does nothing on the first.

## 3. `src/data/device.ts` — `takePhoto`, `pickPhoto`, `currentLocation`

Three small wrappers over `expo-image-picker` and `expo-location`, both installed, with the
permission sentences already written into `app.json`. The result types are fixed; fill in the calls.

**These never throw and never show an Alert.** Every path returns one of the listed results. The
screens below do the talking.

## 4. Wire the camera — `src/branch/create.tsx`, the photo card in step 2

Today the two buttons just `setPhoto('uploading')` and the success state draws a fake SVG of a
scale. Make them real:

- «التقاط صورة» calls `takePhoto()`, «من المعرض» calls `pickPhoto()`.
- `ok` → keep the designed success state, but show the **real photo** in place of the `Photo`
  component's drawing: an `Image` at the same 104×104 with `borderRadius: 16`. Hold the returned
  `Photo` in the screen's state. `t.retake` re-opens the camera, `t.remove` clears it.
- `cancelled` → go back to the two buttons, say nothing.
- `denied` → the two buttons stay, with `copy.shared.camDenied` or `copy.shared.galDenied` under
  them as an `ErrorLine`.
- `failed` → the same, with `t.photoFail`.
- `uploading` stays as the designed in-between state while the picker result is being read.

**Nothing is uploaded.** The URI sits in state and goes nowhere; `submit()` stays exactly as it is.
`t.photoOk` still says "uploaded" — leave the approved string alone, phase B makes it true.

## 5. Wire the location — `src/branch/location.tsx`

Today «استخدم موقعي الحالي» snaps the pin to a hardcoded point. Make it real:

- The button calls `currentLocation()`. While it is waiting, it shows `t.locating` and is disabled.
- `ok` → move the pin to the real coordinates.
- `denied` → leave the pin, show `copy.shared.locDenied` as an `ErrorLine` under the map.
- `failed` → the same with `copy.shared.locFailed`.

**The map stays the schematic drawing it is.** The canvas draws a schematic too; what becomes real
here is the permission and the coordinates, not the map. Do not reach for a map library.

Nothing is saved: `confirmLocation` is still the mock in `state.tsx`.

## Rules

- **No new dependencies.** Everything needed is installed. If you believe something is missing, say
  so in your report instead of installing it.
- **No new copy.** Every string exists in `src/i18n/`. Say so if you think one is missing.
- **Don't touch** `src/data/auth-api.ts`, `src/data/supabase.ts`, `src/providers/auth.tsx`,
  `src/app/sign-in.tsx`, `src/ui/auth-shell.tsx`, or the material cards in step 1 of `create.tsx` —
  that lock is already done and reviewed.
- **Don't commit, stage, branch or stash.** I commit after I review.
- Colours from `usePreferences().colors`, except the two screens whose doc comments say otherwise.
- Layout with `start`/`end`, not `left`/`right`, except where a doc comment says the canvas keeps
  physical sides.
- Touch targets 44 points or more.

## Done when, all from `apps/mobile`

```
npx tsc --noEmit
npm run bundle
```

Both pass, and `rg "not implemented" src/` prints nothing.

If `npm run bundle` fails for a reason you did not cause — including the Expo CLI rewriting
`package.json` or the lockfile during the export — leave it and say so in your report.

## Report back

1. Each of the five pieces: done, or not and why.
2. The exact output of each gate.
3. Every decision the doc comments did not settle for you — especially in the splash, where CSS
   keyframes and Reanimated are not the same shape.
4. Anything touched outside the files named here.
5. Anything unfinished or uncertain. Say it; it costs less than my finding it.
