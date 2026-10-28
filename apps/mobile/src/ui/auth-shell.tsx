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
 * Built to `briefs/03-sign-in-redesign.md`.
 */
import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { Image, Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePreferences } from '@/providers/preferences';
import { ErrorLine, Icon, Label, Sheet } from '@/ui/components';
import { branchArtwork, minTouch, softFill } from '@/ui/tokens';

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
  const { colors } = usePreferences();
  const insets = useSafeAreaInsets();
  return <View style={{ backgroundColor: colors.navy, borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32, overflow: 'hidden', position: 'relative', gap: 12,
    paddingTop: insets.top + 25, paddingHorizontal: 24, paddingBottom: 84 }}>
    <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130,
      borderWidth: 1, borderColor: branchArtwork.heroLine, left: -90, top: -60 }} />
    <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90,
      borderWidth: 1, borderColor: branchArtwork.heroGoldLine, right: -60, bottom: -40 }} />
    <Image source={require('../../assets/cw-mark.png')} accessible={false} resizeMode="contain"
      style={{ width: 84, height: 44, alignSelf: 'flex-start' }} />
    <Label accessibilityRole="header" style={{ fontFamily: 'Tajawal_800ExtraBold', fontSize: 30,
      lineHeight: 39, color: colors.onPrimary, marginTop: 10 }}>{title}</Label>
    <Label style={{ fontSize: 15, lineHeight: 24.75, color: colors.onPrimary, opacity: .82,
      maxWidth: 300 }}>{sub}</Label>
  </View>;
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
  const { colors, theme } = usePreferences();
  return <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    borderRadius: 22, marginTop: -52, marginHorizontal: 16, padding: 20, gap: 16,
    shadowColor: colors.overlayShadow, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: theme === 'dark' ? .35 : .16, shadowRadius: 30, elevation: 8 }}>{children}</View>;
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
  const { colors, language } = usePreferences();
  return <View style={{ gap: 6 }}>
    <Label style={{ fontFamily: 'Tajawal_700Bold', fontSize: 14 }}>{label}</Label>
    <View style={{ height: 52, borderWidth: 1, borderRadius: 14, backgroundColor: colors.surface,
      overflow: 'hidden', borderColor: invalid || error ? colors.danger : colors.line,
      flexDirection: 'row', alignItems: 'center', direction: prefixBox ? 'ltr' : undefined }}>
      {prefixBox ? <View style={{ height: '100%', paddingHorizontal: 12,
        backgroundColor: colors.surface2, borderEndWidth: 1, borderEndColor: colors.line,
        justifyContent: 'center' }}>
        <Label style={{ fontFamily: 'Tajawal_700Bold', fontSize: 16, color: colors.muted,
          writingDirection: 'ltr', textAlign: 'left' }}>{prefixBox}</Label>
      </View> : null}
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props}
        style={[{ flex: 1, minWidth: 0, height: '100%', paddingHorizontal: 14, paddingVertical: 0,
          fontFamily: 'Tajawal_700Bold', fontSize: prefixBox ? 17 : 16, color: colors.text,
          letterSpacing: prefixBox ? .04 * 17 : undefined,
          textAlign: prefixBox || language === 'en' ? 'left' : 'right',
          writingDirection: prefixBox || language === 'en' ? 'ltr' : 'rtl' }, props.style]} />
      {action ? <Pressable accessibilityRole="button" accessibilityLabel={action.label}
        onPress={action.onPress} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={action.icon} color={colors.muted} tint={softFill(colors.muted)} />
      </Pressable> : null}
    </View>
    {error ? <ErrorLine>{error}</ErrorLine> : hint ? <Label style={{ color: colors.muted,
      fontSize: 12.5, lineHeight: 18.75 }}>{hint}</Label> : null}
  </View>;
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
  const { colors } = usePreferences();
  const [open, setOpen] = useState(false);
  const choice = options.find(option => option.value === value);
  return <View style={{ gap: 6 }}>
    <Label style={{ fontFamily: 'Tajawal_700Bold', fontSize: 14 }}>{label}</Label>
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityValue={{ text: choice?.label ?? placeholder }} accessibilityState={{ disabled, expanded: open }}
      disabled={disabled} onPress={() => setOpen(true)}
      style={{ height: 52, borderWidth: 1, borderRadius: 14, backgroundColor: colors.surface,
        overflow: 'hidden', borderColor: invalid ? colors.danger : colors.line,
        flexDirection: 'row', alignItems: 'center', paddingStart: 14, paddingEnd: 12, gap: 8 }}>
      <Label numberOfLines={1} style={{ flex: 1, fontFamily: 'Tajawal_700Bold', fontSize: 16,
        color: choice ? colors.text : colors.muted }}>{choice?.label ?? placeholder}</Label>
      <Icon name="caretD" color={colors.muted} tint={softFill(colors.muted)} />
    </Pressable>
    {open ? <Sheet onClose={() => setOpen(false)}>
      <Label accessibilityRole="header" style={{ fontFamily: 'Tajawal_800ExtraBold', fontSize: 18 }}>{label}</Label>
      {options.map(option => <Pressable key={option.value} accessibilityRole="button"
        accessibilityState={{ selected: option.value === value, disabled }} disabled={disabled}
        onPress={() => { onChange(option.value); setOpen(false); }}
        style={{ minHeight: minTouch, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Label style={{ flex: 1, fontFamily: 'Tajawal_700Bold' }}>{option.label}</Label>
        {option.value === value ? <Icon name="check" color={colors.primary} /> : null}
      </Pressable>)}
    </Sheet> : null}
  </View>;
}
