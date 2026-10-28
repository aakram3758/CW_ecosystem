/**
 * The brand splash — option **ب** «المواد بتتجمع», the one marked «المعتمد» in
 * `design/branch-v2/project/SplashOptions.dc.html`. The screen itself is in `Main.dc.html` lines
 * 114–127, and its CSS (`.sb-ic`, `.sb-logo`, `.sb-burst`, `.sb-tag`, and the `sbFly` / `sbPop` /
 * `sbBurst` keyframes) is in that file's style block. **Use `Main.dc.html`'s timings, not
 * `SplashOptions.dc.html`'s** — the option sheet was drawn first and its delays are shorter.
 *
 * Five material icons fly in from the edges, shrink into the centre and vanish; a gold ring bursts
 * out of the point they met at; the logo pops in; the tagline rises under it. About 1.95s.
 *
 * It is navy in both themes, like the hero, so nothing here reads the palette's light/dark pair.
 * The values it does use are in `tokens.ts` as `splash` and `splashMaterials`.
 *
 * `react-native-reanimated` is already a dependency (expo-router pulls it in), and so is
 * `react-native-svg` for the radial gradient. Neither needs installing; no other animation
 * library gets added for this.
 *
 * The body is left for the implementer — see `briefs/04-splash-onboarding-device.md`.
 */
import type { ReactNode } from 'react';

/**
 * Plays once and calls `onDone`.
 *
 * **Layout.** Fills its parent. The background is the canvas's
 * `radial-gradient(120% 70% at 50% 40%, #17426F 0%, #0B2340 55%, #06172B 100%)` — in SVG terms a
 * `RadialGradient` at `cx="50%" cy="40%"` with `rx="120%" ry="70%"` (CSS gives an ellipse's two
 * radii there, not its diameters) and those three stops, drawn by a `Rect` filling the viewport.
 *
 * Everything that moves is positioned against one point: 50% of the width, 42% of the height.
 *
 * **The five icons.** `splashMaterials`, in order. Each is a 60×60 circle — `borderRadius: 30`,
 * `borderWidth: 2` in the material's colour, `backgroundColor: splash.tile`, the icon at 32 in the
 * same colour — centred on that point with `marginTop: -30` and `marginLeft: -30`, and a soft
 * drop shadow (`shadowColor: '#000'`, opacity .35, radius 18, no offset; `elevation: 8`).
 *
 * Each runs `sbFly` over 1s on `cubic-bezier(.55,.05,.4,1)`, staggered 80ms apart, so the last one
 * starts at 320ms:
 *   0%   translate(x, y) scale 1, opacity 0
 *   15%  opacity 1
 *   80%  opacity 1
 *   100% translate(0, 0)  scale .25, opacity 0
 * `x` and `y` are the material's own offsets, in points, and they are physical: the canvas does
 * not mirror them for Arabic, and neither should this.
 *
 * **The burst.** A 260×260 ring on the same point — `borderRadius: 130`, `borderWidth: 2` in
 * `splash.burst` — running `sbBurst` over 800ms, ease-out, starting at 1000ms: opacity .9 → 0
 * while scaling .4 → 1.6. Not touchable.
 *
 * **The logo.** `require('../../assets/cw-logo.png')` at width 212. The file is 452×362, so its
 * height is 170. Centred on the same point. `sbPop` over 600ms on `cubic-bezier(.2,.8,.2,1)`,
 * starting at 1000ms: opacity 0 → 1 and scale .6 → 1.06 by 70%, settling to 1.
 *
 * **The tagline.** `copy.branch.splashA`, Tajawal_500Medium 16 in `splash.tag`, centred, its own
 * top edge 108 below the meeting point. Rises in over 500ms from 1450ms — opacity 0 → 1,
 * translateY 12 → 0, which is the canvas's `cwrise`.
 *
 * **Finishing.** `onDone` fires once, when the tagline has settled. Tapping anywhere finishes it
 * early — the canvas wraps the whole splash in a button for exactly that. Either way `onDone` is
 * called at most once.
 *
 * **Reduced motion.** When `AccessibilityInfo.isReduceMotionEnabled()` is true, skip the movement:
 * draw the end state — logo and tagline, no icons, no burst — hold it briefly, and call `onDone`.
 * The canvas does the same with its `prefers-reduced-motion` block.
 */
export function BrandSplash({ onDone }: { onDone: () => void }): ReactNode {
  throw new Error('bite 2.5 stage 2 — not implemented');
}
