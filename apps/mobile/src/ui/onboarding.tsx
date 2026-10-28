/**
 * The three onboarding slides, from `design/branch-v2/project/Main.dc.html` lines 128–168 — the
 * markup — with `.onb-slide`, `.onb-img`, `.onb-txt`, `.onb-pill`, `.onb-h`, `.onb-p` and
 * `.onb-foot` in that file's style block, and the `ob` view-model around line 1241.
 *
 * Shown once per install, before sign-in, and skippable.
 *
 * **It renders light in both themes, on purpose.** The three illustrations are photographs with a
 * near-white background baked in, and the canvas gives each slide its own light page colour
 * (`#F0F1F6`, `#EDEDF1`, `#ECECF1`) with the light palette's text and muted beneath. A dark frame
 * around a white picture reads as a bug, so this screen does not follow the theme — the splash
 * before it is navy in both themes for the same kind of reason.
 *
 * The body is left for the implementer — see `briefs/04-splash-onboarding-device.md`.
 */
import type { ReactNode } from 'react';

/** The three slides, in order: the image, and the copy keys for its heading and its line. */
export const slides = [
  { image: require('../../assets/onboarding-1.jpg'), title: 'onb1T', body: 'onb1B', background: '#F0F1F6' },
  { image: require('../../assets/onboarding-2.jpg'), title: 'onb2T', body: 'onb2B', background: '#EDEDF1' },
  { image: require('../../assets/onboarding-3.jpg'), title: 'onb3T', body: 'onb3B', background: '#ECECF1' },
] as const;

/**
 * Walks the three slides and calls `onDone` when the last one is accepted or any one is skipped.
 *
 * **One slide at a time, not a scroller.** The canvas swaps the slide rather than scrolling to it,
 * and a horizontal paging ScrollView is the part of React Native that handles right-to-left worst.
 * So: render the current slide, animate it in, and read the swipe with a PanResponder, exactly as
 * the canvas's `ob.down` / `ob.up` do — a horizontal movement of 50 points or more, where in
 * Arabic a rightward drag goes **forward** and in English a leftward one does.
 *
 * **A slide.** Fills the screen on `slides[i].background`, its content centred horizontally:
 * - the illustration at the top, 34 below the safe area. The canvas draws it 372 wide on a
 *   390-wide screen; here it takes `width: '95%'` with the file's own `aspectRatio` (853/1100),
 *   `resizeMode: 'contain'` and `flexShrink: 1`, so a short phone shrinks it instead of pushing
 *   the footer off. It is decorative: `accessible={false}`.
 * - under it, a column with `gap: 8` and `paddingHorizontal: 28`, centred text:
 *   - the step pill — `interpolate(copy.shared.onbStep, { n: i + 1 })` — `borderWidth: 1.5` in
 *     `palette.light.accent`, text in `palette.light.accentText`, `borderRadius: 999`,
 *     `paddingVertical: 3`, `paddingHorizontal: 16`, Tajawal_700Bold 13.
 *   - the heading, Tajawal_800ExtraBold 25 / lineHeight 33.75, in `palette.light.text`,
 *     `marginTop: 2`, `accessibilityRole="header"`.
 *   - the line, Tajawal_400Regular 15 / lineHeight 24.75, in `palette.light.muted`,
 *     `maxWidth: 310`.
 * - each slide fades and rises in over 350ms — the canvas's `cwslide`: opacity 0 → 1,
 *   translateY 10 → 0.
 *
 * **The footer**, pinned to the bottom, `paddingHorizontal: 24`, `paddingBottom: 24` plus the safe
 * area, `gap: 12`, centred:
 * - three dots, `gap: 8`, each 8 high with `borderRadius: 9`, animating over 250ms between 8 wide
 *   in `#D3D9E3` and 26 wide in `palette.light.accent` as the slide changes. Each is a button that
 *   jumps to its slide, labelled with its number.
 * - the primary button, full width, `palette.light.primary` with white on it — the app's
 *   `Button variant="branch"`, which already draws that. Its label is `copy.shared.onbNext`, and
 *   `copy.shared.startNow` on the last slide.
 * - `copy.shared.skip` as a `TextLink` at 16, except on the last slide, where the canvas leaves a
 *   44-high gap so the button does not jump.
 *
 * The Android back button goes to the previous slide, and does nothing on the first — it must not
 * close the app or fall through to a route behind this screen.
 */
export function Onboarding({ onDone }: { onDone: () => void }): ReactNode {
  throw new Error('bite 2.5 stage 2 — not implemented');
}
