# The driver screens, redrawn to the canvas

Bite 4 and 5 (brief 08) built the driver app on the live backend, and its data is right. Its screens
are not. Ahmed ran it on his phone and the verdict was that most screens look nothing like the design.
Reading the code against the canvas confirms it: the home card, the plan list, the stop page, the
outcome form, history and account each took the canvas's *content* and drew it in a frame of their
own — the branch app's cards and buttons, its line icons, gaps and radii that are close but not the
canvas's, whole blocks reordered or merged.

**This brief is the visual rebuild, and only that.** Every screen after sign-in and onboarding is
redrawn from the canvas markup, element by element, with the canvas's literal values. The data layer
stays exactly as it is.

**Approved by Ahmed — build all of it to the end, without stopping for further approval.** Do not
commit.

## Decided by Ahmed, 2 November 2026

- **The driver uses the canvas's own icons — Phosphor.** `phosphor-react-native@3.0.6` is installed
  in `apps/mobile`. This reverses, for the driver only, the earlier "one icon language" decision; the
  branch keeps its line icons in `src/ui/icons.ts`, and nothing on the branch side changes.
- Everything brief 08 decided about **data** stands: the phone's own camera (no viewfinder screen),
  reasons from the `reasons` table, a stop's state from today's attempt only, no «جديدة» tag, the
  plan-changed banner showing the notification's own text, «اعتُمدت …» only with an approval row,
  ops contact hidden with no `ops_phone`. Read brief 08's *The screens, against the real data*: those
  rules decide *what* is on screen. The canvas decides *how it looks*.

## The source

`apps/mobile/design/driver/Main.dc.html` (gitignored — `rg --no-ignore`). It is byte-for-byte the
design Ahmed sent again on 2 November; Claude diffed the two. Brief 08's table maps every screen to
its markup lines. `cw.css` beside it holds the classes and the theme variables.

## What does not change

`src/data/driver-api.ts`, `src/driver/model.ts` and `src/driver/state.tsx` — the reads, the writes,
the drafts, realtime and the page state. Touch them only if a screen genuinely needs a value they do
not expose yet, and then only to expose it. Sign-in, onboarding, splash and the forced
`/change-password` route are not in scope.

## How to rebuild a screen

For each screen, open its markup and go down it **in order**. Every element in the markup becomes one
in React Native, in the same order, with:

- **Its box, literally.** `height`, `min-height`, `width`, `padding` (all four sides — `47px 16px 0`
  is not `16`), `margin`, `gap`, `border-radius`, `border` width and colour, `background`. A value the
  canvas states is the value. Never round it, never "harmonise" two similar ones, never take the
  branch's.
- **Its text, literally.** CSS `font: 800 20px/1.3 Tajawal` is `fontFamily: 'Tajawal_800ExtraBold',
  fontSize: 20, lineHeight: 26`. `500` is `Tajawal_500Medium`, `700` `Tajawal_700Bold`, `400` (or
  unset) `Tajawal_400Regular`. Colour from the variable it names.
- **Its colours from the variable it names**, through `colors` from `usePreferences()` — the tokens
  already hold every driver variable (`--ring-todo` is `ringTodo`, `--accent-text` is `accentText`,
  `--on-primary` is `onPrimary` …). Literal colours in the markup (`#0B2340`, `#E8CE84`,
  `rgba(255,255,255,.1)` …) stay literal, defined once at the top of the file that uses them.
- **Its layout.** `display: grid; grid-template-columns: repeat(2, minmax(0, 1fr))` is a wrapping row
  of two equal columns; `place-items: center` centres both ways; `justify-content: space-between` is
  exactly that. `text-align: start` and the RTL inherit from `AppProviders` — never hard-code
  `right`/`left` where the canvas does not.
- **`var(--shadow)`** (`0 6px 18px rgba(11,27,46,.07)` light, `rgba(0,0,0,.28)` dark) and
  **`--shadow-lg`** become one shared `shadow` / `shadowLg` style each, with `elevation` for Android.
- **The canvas's `47px` / `52px` top paddings are its status bar.** Use the safe-area top inset in
  their place, plus whatever the canvas adds beyond the status bar.
- **`cw-press`** (scale .98 while pressed) on every element that has it — one `Pressable` style
  helper. `cw-up`, `cw-fade`, `cw-pop` are entrance animations: use `Animated` with
  `useNativeDriver: true` on opacity and transform only (animating colours on the native driver
  throws — see `src/ui/components.tsx`). `cw-skel` is the existing `Skeleton`.

**Icons**: `<i class="ph-duotone ph-truck">` is Phosphor's `Truck` at `weight="duotone"`; `ph-bold` is
`bold`, `ph-fill` is `fill`, plain `ph` is `regular`. Size is the element's `font-size`, colour its
`color`. Import each icon from its own file — `import { TruckIcon } from
'phosphor-react-native/src/icons/Truck'` — **never from the package root**, which pulls in all 1,512
icons. Put every import in one file, `src/driver/icons.tsx`, exporting the icons the driver uses
under their canvas names, so the rest of `src/driver/` never imports Phosphor directly. Directional
icons (`ph-caret-left/right`, `ph-arrow-left/right`) follow the canvas's own `ic.fwd` / `ic.back`
rule (line 1294): they flip with the language.

**Shared components are a trap here.** `Button`, `Card`, `Field`, `Segmented`, `EmptyState`,
`ErrorState`, `Tile`, `Pill` and `PageFrame` carry the branch canvas's values. Use one only where its
rendering is identical to this canvas's element — check, do not assume. Otherwise draw the element in
`src/driver/`. `Skeleton`, `Sheet`'s modal behaviour and `Toast` may be reused if restyled through
props. `src/driver/shared.tsx` is yours to rewrite completely.

## Screen by screen — the things most likely to be missed

Not a substitute for reading the markup. These are what the current build got wrong.

- **Home (122–272).** The navy hero is the canvas's own: logo, the two header buttons at
  `rgba(255,255,255,.1)`, greeting, date, the two-line head. Then the overlapping card with the
  progress ring and its legend, the suggested-stop block with its own border, «عرض التفاصيل» as a
  56px primary button. **No plan / off day** are the canvas's states inside that same card — the
  clipboard and calendar tiles, its body text, «تحديث» and «تواصل مع العمليات» side by side as the
  canvas draws them (hide the second with no ops number, per brief 08) — not `EmptyState`. The next
  plan row (`goUpcoming`) is the canvas's surface2 row, not a button. The by-district list is the
  canvas's rows.
- **The progress ring** is one segment per stop, chronological, with the canvas's gaps (`ringBg`,
  1128). Keep the existing SVG approach; match its sizes, stroke and centre text.
- **Today's plan (274–339).** The canvas's header with back, the two-button filter (not the branch
  `Segmented`), the change banner with its close icon, «زُر الفروع بالترتيب الذي يناسبك», district
  headers with their count and «مكتمل», and the stop cards with the suggested border and the status
  chip exactly as `vmStop` (1278) builds them.
- **Stop details (341–422).** Header with the request title, the access-instructions card, the
  address block, «فتح الموقع» as the canvas's navy button, the contact block, the declared weight, the
  branch photo with «اضغط للتكبير», the note, «طُلب في», the recorded block with «سجّلت نتيجة خاطئة؟»
  as the canvas's link-style button, and the footer button.
- **Record outcome (424–545).** The 108px header with the close button, the three-step bar, the three
  100px kind cards with 64px tiles, the picked-kind strip with «تغيير», the 180px dashed camera block
  and the photo with «الصورة جاهزة» over it, the partial chips (the canvas's chip style, with the
  database's partial reasons as their labels) above the 3-row textarea, **the failed reasons as the
  canvas's two-column grid of 92px tiles** with the check badge — the database's labels, no icon
  (there is no icon column; say so in a comment), «سبب آخر» last with `ph-dots-three-circle` — the
  info lines, the not-sent and offline alert blocks, and the 60px footer button with its hint line.
- **Success (571–595).** Navy takeover, the two circles, the 136/98 ring and disc, title, branch
  line, the note pill, the progress bar, «كانت هذه آخر زيارة اليوم», the 60px gold button and the
  text button.
- **Next plan (598–638)**, **history (640–701)** with its period row, the four-way filter, the ring
  card, the collapsible days, the visit rows and the two sheets, **notifications (703–723)**,
  **account (725–768)** with its profile card, language and theme as the canvas draws them (its own
  segmented rows — `PreferencesControls` is the branch's drawing), the action rows and the version.
- **The voluntary password page** is the canvas's `changePw` (90–120) in its change mode, as brief 08
  said: keep its logic, redraw it.
- **Sheets (839–915)**: ops, logout, period, visit — the canvas's sheet frame (handle, radius,
  padding) over `Sheet`'s modal behaviour.
- **Bottom nav (799–809)**: 88px, its shadow, the 58×30 pill, Phosphor icons, 13px labels.
- **Offline: the canvas's toast (810–818), not the shared `OfflineBar`.** Brief 08 chose the bar;
  that is reversed. Its `bottom` is 100 over the nav and 24 elsewhere, as `toast.bottom` (1556) says,
  and «إعادة المحاولة» calls `data.retry`.
- **Enlarged photo (819–838)**: the canvas's dark frame, the round close button, the title.
- **The content-state layer (769–798)**: loading, error and empty for the plan, stop and
  notifications, as the canvas draws them.

## Done when

- `npx tsc --noEmit` is clean and `npm run bundle` produces a bundle.
- `rg "from 'phosphor-react-native'" src` returns nothing (only per-icon imports, only in
  `src/driver/icons.tsx`).
- `rg "from '@/branch" src/driver` and `rg "from '@/driver" src/branch` return nothing.
- `src/data/driver-api.ts` and `src/driver/model.ts` are unchanged, or your report says why not.
- **Your report has one section per screen**, listing the canvas's elements in markup order with
  each one's state — built as drawn, or built differently and why. "Matches the design" for a whole
  screen is not a report.
