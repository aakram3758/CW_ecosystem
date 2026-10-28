/**
 * The sign-in screen's frame, from the redrawn canvas — `design/branch-v2/project/Main.dc.html`,
 * lines 171–247. Sign-in is one screen for both roles now, so nothing here is branch- or
 * driver-specific.
 *
 * The hero and the card are two pieces rather than one because they overlap: the card is pulled
 * 52px up over the hero's rounded bottom, so neither can contain the other.
 *
 * Every number below is the canvas's own. Where this file says a value came from a CSS class, the
 * class is in that file's `<style>` block (lines 13–80).
 *
 * The bodies are left for the implementer — see `briefs/03-sign-in-redesign.md`.
 */
import type { PropsWithChildren, ReactNode } from 'react';
import type { TextInputProps } from 'react-native';

/**
 * The navy block at the top of sign-in: `.hero` with the login screen's own padding override.
 *
 * - Background `colors.navy`, text white, `borderBottomLeftRadius` / `borderBottomRightRadius` 32,
 *   `overflow: 'hidden'`, `position: 'relative'`, `gap: 12`.
 * - Padding: `useSafeAreaInsets().top + 25` on top (the canvas's 72px is 47px of status bar plus
 *   25), 24 each side, 84 at the bottom — the card eats 52 of that 84 back.
 * - Two outlined circles behind the text. They are plain absolutely-positioned Views, placed
 *   *first* so later siblings paint over them; no zIndex needed. Both keep the canvas's physical
 *   `left` / `right`, not `start` / `end`: the canvas is right-to-left too and still writes them
 *   this way, so the layout is the same in both languages.
 *   - 260×260, `borderRadius` 130, `borderWidth` 1, `borderColor` `branchArtwork.heroLine`,
 *     `left: -90`, `top: -60`
 *   - 180×180, `borderRadius` 90, `borderWidth` 1, `borderColor` `branchArtwork.heroGoldLine`,
 *     `right: -60`, `bottom: -40`
 * - The mark: `require('../../assets/cw-mark.png')`, height 44 and width 84 — the file is 436×229,
 *   so 44 × 436/229 — `resizeMode: 'contain'`, `alignSelf: 'flex-start'`. It is decorative beside
 *   the title, so `accessible={false}`.
 * - `title`: Tajawal_800ExtraBold 30 / lineHeight 39 (30 × 1.3), white, `marginTop: 10`,
 *   `accessibilityRole="header"`.
 * - `sub`: Tajawal_400Regular 15 / lineHeight 24.75 (15 × 1.65), white at `opacity: .82`,
 *   `maxWidth: 300`.
 */
export function AuthHero({ title, sub }: { title: string; sub: string }): ReactNode {
  throw new Error('bite 2.5 stage 1 — not implemented');
}

/**
 * The white card that overlaps the hero: `.ov`, with the login screen's `gap: 16; padding: 20`.
 *
 * `backgroundColor: colors.surface`, `borderWidth: 1` in `colors.line`, `borderRadius: 22`,
 * `marginTop: -52`, `marginHorizontal: 16`.
 *
 * `--ov-shadow` is `0 12px 30px rgba(11,27,46,.16)` light and `0 12px 30px rgba(0,0,0,.35)` dark,
 * so: `shadowColor` `'#0B1B2E'` or `'#000'` by theme, `shadowOffset: { width: 0, height: 12 }`,
 * `shadowOpacity` .16 or .35, `shadowRadius: 30`, and `elevation: 8` for Android, which has no
 * offset or radius of its own.
 */
export function AuthCard({ children }: PropsWithChildren): ReactNode {
  throw new Error('bite 2.5 stage 1 — not implemented');
}

/**
 * One field of the sign-in card: the `.fld` label above a 52px bordered row.
 *
 * The row is `height: 52`, `borderWidth: 1`, `borderRadius: 14`, `backgroundColor: colors.surface`,
 * `overflow: 'hidden'`, and its border is `colors.danger` when `invalid`, otherwise `colors.line`.
 * The label is Tajawal_700Bold 14. The input inside is `flex: 1`, Tajawal_700Bold 16,
 * `paddingHorizontal: 14`, `color: colors.text`, placeholder in `colors.muted`, no border of its
 * own — the row draws it.
 *
 * `prefixBox` is the `+966` panel welded to the driver's phone field: full height,
 * `paddingHorizontal: 12`, `backgroundColor: colors.surface2`, Tajawal_700Bold 16 in
 * `colors.muted`, and a 1px `colors.line` divider on the edge that faces the input. The canvas
 * puts that whole row in `dir="ltr"`, so pass `direction: 'ltr'` on the row and let the divider
 * fall on its right — a phone number reads left-to-right in both languages. With a prefix box the
 * input is Tajawal_700Bold 17 with `letterSpacing: 0.04 * 17`.
 *
 * `action` is the 48×48 icon button inside the border at the end — the password eye. It is a
 * Pressable with `accessibilityRole="button"` and `action.label` as its label, the icon in
 * `colors.muted`.
 *
 * `error` prints an `ErrorLine` under the row. `hint` prints a muted 12.5 / lineHeight 18.75 line
 * under it instead — the canvas shows one or the other, never both, so `error` wins.
 *
 * `invalid` without `error` is the canvas's own split: the chain, branch-number and phone fields
 * turn their border red while a single shared message is printed once below them all, by the
 * screen rather than by any one field.
 */
export function AuthField({ label, error, hint, invalid, prefixBox, action, ...props }: TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  invalid?: boolean;
  prefixBox?: string;
  action?: { icon: string; label: string; onPress: () => void };
}): ReactNode {
  throw new Error('bite 2.5 stage 1 — not implemented');
}

/**
 * The chain picker. The canvas uses a native `<select>` styled as `.inp`; React Native has none,
 * so this is a Pressable that looks exactly like an `AuthField` row and opens the app's `Sheet`.
 *
 * Closed, it shows `options.find(o => o.value === value)?.label` in `colors.text`, or
 * `placeholder` in `colors.muted` when nothing is chosen — the canvas's `lg.chainCol`. At the
 * inner end, inset 12, a `caretD` icon in `colors.muted`, not pressable itself.
 * `accessibilityRole="button"`, labelled by `label`, with the current choice as its value.
 *
 * Open, the `Sheet` lists every option as a row with `label` as a heading, the chosen one marked
 * with a `check` icon in `colors.primary` and `accessibilityState={{ selected: true }}`.
 * Choosing one calls `onChange` and closes the sheet.
 */
export function AuthSelect({ label, value, placeholder, options, invalid, disabled, onChange }: {
  label: string;
  value: string | null;
  placeholder: string;
  options: { value: string; label: string }[];
  invalid?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}): ReactNode {
  throw new Error('bite 2.5 stage 1 — not implemented');
}
