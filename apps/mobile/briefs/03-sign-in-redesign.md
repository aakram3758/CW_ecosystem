# Bite 2.5, stage 1 — fill in the redrawn sign-in screen

Ahmed ran bites 1 and 2 on his phone and said the sign-in screen is not the one in the design. He
is right: the canvas was redrawn while we were building, and sign-in is now one screen for both
roles with a navy hero and a card overlapping it. The structure for that is already in the repo.

**Your job is the bodies.** Seven functions currently `throw new Error('bite 2.5 stage 1 — not
implemented')`. Each one has a doc comment above it that says exactly what it must draw, with the
canvas's own numbers. Implement them, delete the throws, and change nothing else unless this brief
says to.

Nothing here touches the backend, the auth flow, the form logic or the copy. Those are already done
and verified on a real phone — if you find yourself editing `src/data/`, `src/providers/auth.tsx`
or `src/i18n/`, stop and re-read this.

## The source

`apps/mobile/design/branch-v2/project/Main.dc.html` — gitignored, so `rg` will not find it; open it
by path. It is a web prototype, not portable code: read it as a spec.

- **lines 13–80** — the `<style>` block. Every class named in a doc comment (`.hero`, `.ov`,
  `.seg`, `.sg`, `.mode-on`, `.mode-off`, `.fld`, `.inp`, `.err`, `.btn`, `.btn-p`, `.link`,
  `.spin`) is defined there.
- **lines 171–247** — the login screen's markup. This is the thing being built.

The doc comments already carry the values, so you should rarely need the file. Use it when a comment
says "the canvas's X" and you want to see X in place.

## What to implement

### 1. `src/ui/auth-shell.tsx` — four functions

`AuthHero`, `AuthCard`, `AuthField`, `AuthSelect`. The file header and each doc comment give the
padding, radii, colours, font sizes and line heights. Read them; they are the spec.

Three things worth repeating because they are easy to get wrong:

- **`AuthHero` paints behind the status bar.** It adds `useSafeAreaInsets().top` to its own top
  padding — `sign-in.tsx` already passes `edges={['bottom']}` to `Screen` for this. Do not put the
  hero inside another SafeAreaView.
- **The two decorative circles are plain Views placed first**, so later siblings paint over them.
  React Native has no `z-index` ordering worth relying on here; source order is enough.
- **`AuthField`'s `prefixBox` row is `direction: 'ltr'`**, as the canvas's `dir="ltr"` has it. A
  Saudi mobile number reads left-to-right in Arabic too. The divider then falls on the box's right.

### 2. `src/ui/components.tsx` — three functions

`Segmented`, `ErrorLine`, `ErrorBanner`. Same: the doc comments are the spec.

Then **move `PreferencesControls`'s `variant === 'branch'` branch onto `Segmented`** with
`tone="pill"`. It currently hand-rolls the same track inline — the `colors.surface2` strip with the
4px padding and the 11-radius tiles. Keep its icon-and-label group heading above each track; only
the track itself becomes a `Segmented`. The non-branch branch of that function stays as it is.

### 3. `Button` gains a spinner

`Button` now takes `busy?: boolean`. In the `variant === 'branch'` path, when it is set, render an
18px `ActivityIndicator` in the foreground colour where `icon` would go, before the label. That is
the canvas's `.spin`. The default variant ignores it.

## Rules

- **Both themes.** Every colour comes from `usePreferences().colors`, never a hex literal, with two
  exceptions the canvas itself hardcodes: the hero's white text and its two circle colours, which
  are already in `branchArtwork` as `heroLine` and `heroGoldLine`. `colors.navy` is the hero's
  background in both themes — that is correct, the canvas does the same.
- **Both languages.** Lay out with `start`/`end`, `marginStart`, `paddingInlineEnd` and so on, not
  `left`/`right` — except where a doc comment explicitly says the canvas keeps physical sides (the
  hero circles) or the box is a left-to-right island (the phone row).
- **No new copy.** Every string is already in `src/i18n/`. If you think one is missing, say so in
  your report rather than inventing it.
- **No new dependencies.** Everything needed is installed.
- **Touch targets stay 44px or more** (`minTouch`). The segmented options are 44 by design; the
  eye button is 48.
- Match the surrounding code: no semicolon-free style, no default exports for components, comments
  only where something is not obvious from the code.

## Done when

1. `npx tsc --noEmit` is clean.
2. `npm run bundle` succeeds.
3. No `throw new Error('bite 2.5 stage 1 — not implemented')` is left anywhere.
4. `rg "not implemented" src/` is empty.

Run all of these from `apps/mobile`. If the bundle fails for a reason you did not cause, say so in
your report rather than working around it.

## What I will check

I review the diff against this brief and the canvas, so: the hero's 32px bottom corners and 84px
bottom padding, the card's -52 overlap and 22 radius, the switch's filled blue selected state with
its shadow, the 3fr/2fr split, the `+966` box and its divider, the eye inside the password border,
the 18px error icons, and that the Arabic lays out right-to-left in both roles. Then I run it.

Report honestly what you did not finish. A half-done body you tell me about costs less than one I
find.
