import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View, type TextInputProps, type TextProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { icons } from '@/ui/icons';
import { branchArtwork, minTouch, softFill, type as typography } from '@/ui/tokens';
import { usePreferences } from '@/providers/preferences';
import { useOnline } from '@/providers/query';
import { errorMessage } from '@/data/errors';

export function Label({ style, ...props }: TextProps) {
  const { colors } = usePreferences();
  // `textAlign: 'auto'`, not `'right'` picked from the language. 'auto' aligns the text by its own
  // first strong character, falling back to the direction the box inherits — so Arabic goes right,
  // Latin goes left, and a line of digits follows the layout around it. That is what we always
  // meant, and `'right'` was not delivering it: a Label whose box is wider than its text, which in
  // practice means any Label with `flex: 1`, drew its Arabic hard against the left edge on Android.
  // The screen title and the branch line on the home hero were both sitting there.
  return <Text {...props} style={[{ fontFamily: 'Tajawal_400Regular', fontSize: typography.baseSize,
    lineHeight: typography.baseSize * typography.lineHeight, color: colors.text,
    textAlign: 'auto' }, style]} />;
}

export function Title({ children, style }: PropsWithChildren<{ style?: TextProps['style'] }>) {
  return <Label accessibilityRole="header" style={[{ fontFamily: 'Tajawal_800ExtraBold', fontSize: 28,
    lineHeight: 28 * typography.lineHeight }, style]}>{children}</Label>;
}

export function Icon({ name, color, size = 24, tint }: { name: string; color?: string; size?: number; tint?: string }) {
  const { colors } = usePreferences();
  const icon = icons[name] ?? icons.box;
  return <Svg viewBox="0 0 24 24" width={size} height={size} accessible={false}>
    {icon.f ? <Path d={icon.f} fill={tint ?? colors.primarySoft} /> : null}
    <Path d={icon.s} stroke={color ?? colors.primary} strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>;
}

export function Button({ label, onPress, disabled = false, secondary = false, selected,
  variant, tone = 'primary', icon, busy = false, style }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; selected?: boolean;
  variant?: 'branch'; tone?: 'primary' | 'gold' | 'muted' | 'outline' | 'danger' | 'text';
  icon?: string;
  // The canvas's '.spin' inside the button: while this is set, an 18px ActivityIndicator in the
  // foreground colour sits before the label, in place of 'icon'. Branch variant only.
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = usePreferences();
  if (variant === 'branch') {
    const foreground = tone === 'gold' ? colors.navy : tone === 'text' ? colors.dangerText
      : tone === 'muted' || tone === 'outline' ? colors.text : colors.onPrimary;
    const background = tone === 'gold' ? colors.gold : tone === 'muted' ? colors.surface2
      : tone === 'outline' || tone === 'text' ? 'transparent' : tone === 'danger' ? colors.danger : colors.primary;
    return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled}
      onPress={onPress} style={({ pressed }) => [{ minHeight: 52, borderRadius: 14, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: background, opacity: disabled ? .5 : pressed ? .78 : 1,
        borderWidth: tone === 'outline' ? 1.5 : 0, borderColor: colors.line }, style]}>
      {busy ? <ActivityIndicator size={18} color={foreground} />
        : icon ? <Icon name={icon} color={foreground} tint={foreground} /> : null}
      <Label style={{ color: foreground, fontFamily: 'Tajawal_800ExtraBold', fontSize: 16, textAlign: 'center' }}>{label}</Label>
    </Pressable>;
  }
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => ({
      minHeight: minTouch, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: selected ? colors.primary : colors.line,
      backgroundColor: disabled ? colors.surface2 : secondary ? colors.surface : pressed ? colors.primary2 : colors.primary,
    })}>
    <Label style={{ fontFamily: 'Tajawal_700Bold', color: disabled ? colors.muted : secondary ? colors.link : colors.onPrimary }}>
      {label}
    </Label>
  </Pressable>;
}

export function Screen({ children, header, footer, contentStyle, safeColor, edges }: PropsWithChildren<{
  header?: ReactNode; footer?: ReactNode; contentStyle?: StyleProp<ViewStyle>; safeColor?: string;
  // Which edges to inset. Sign-in passes ['bottom'] because its hero has to paint behind the
  // status bar, and adds the top inset to its own padding instead.
  edges?: readonly Edge[];
}>) {
  const { colors } = usePreferences();
  return <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: safeColor ?? colors.bg }}>
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ flexGrow: 1, padding: 24, gap: 24 }, contentStyle]}>
        {children}
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { colors } = usePreferences();
  return <View style={[{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1,
    borderColor: colors.line, padding: 14, gap: 14 }, style]}>{children}</View>;
}

export function Field({ label, error, prefix, variant, ...props }: TextInputProps & {
  label: string; error?: string; prefix?: string; variant?: 'branch';
}) {
  const { colors, language } = usePreferences();
  return <View style={{ gap: variant ? 6 : 8 }}>
    <Label style={variant ? { fontSize: 14, fontFamily: 'Tajawal_700Bold' } : undefined}>{label}</Label>
    <View style={{ flexDirection: 'row', alignItems: 'center', direction: prefix ? 'ltr' : undefined,
      borderWidth: 1, borderColor: error ? colors.danger : colors.line, borderRadius: variant ? 14 : 12,
      backgroundColor: colors.surface, paddingHorizontal: 14 }}>
      {prefix ? <Label style={{ writingDirection: 'ltr', textAlign: 'left' }}>{prefix}</Label> : null}
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props}
      style={[{ flex: 1, minHeight: variant ? 52 : minTouch, padding: 14, color: colors.text,
        fontFamily: 'Tajawal_400Regular', fontSize: typography.baseSize,
        textAlign: language === 'ar' ? 'right' : 'left' }, props.style]} />
    </View>
    {/* `ErrorLine`, not `Message`: the canvas draws every field error as `.err` — the 18px warn
        icon beside Tajawal_700Bold 13. `Message` was a plain 15px line with no icon, which is
        also why the sign-in screen's field errors have been missing their icon since bite 1. */}
    {error ? <ErrorLine>{error}</ErrorLine> : null}
  </View>;
}

export function TextLink({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = usePreferences();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={{ minHeight: minTouch, minWidth: minTouch, justifyContent: 'center', paddingHorizontal: 6 }}>
    <Label style={{ color: colors.link, fontSize: 14, fontFamily: 'Tajawal_700Bold' }}>{label}</Label>
  </Pressable>;
}

export function Sheet({ children, onClose }: PropsWithChildren<{ onClose: () => void }>) {
  const { colors, copy, language } = usePreferences();
  // A Modal renders in its own hierarchy, outside the tree AppProviders wraps, so the direction
  // it sets does not reach in here. This is the one place that has to repeat it.
  return <Modal transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim, direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={copy.branch.close} onPress={onClose} />
      <SafeAreaView edges={['bottom']} accessibilityViewIsModal style={{ backgroundColor: colors.surface,
        borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 30, gap: 14 }}>
          <View style={{ width: 42, height: 5, borderRadius: 9, backgroundColor: colors.line, alignSelf: 'center' }} />
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  </Modal>;
}

export function Message({ children }: PropsWithChildren) {
  const { colors } = usePreferences();
  return <Label accessibilityRole="alert" accessibilityLiveRegion="polite"
    style={{ color: colors.dangerText }}>{children}</Label>;
}

/**
 * The segmented track both designs draw as `.seg`: a `colors.surface2` strip of `borderRadius` 14
 * with `padding: 4` and `gap: 4`, holding equal-width options 44px high at `borderRadius` 11, each
 * a row with `gap: 8` centred, labelled Tajawal_700Bold 14 and icons at 20.
 *
 * Two tones, because the canvas draws the same track two ways:
 * - `pill` — the chosen option is a `colors.surface` tile with `colors.text` on it, the rest
 *   `colors.muted` on nothing — Account's language and theme rows, which `PreferencesControls`
 *   used to hand-roll inline.
 * - `solid` — the chosen option is filled `colors.primary` with `colors.onPrimary` on it and the
 *   canvas's `0 4px 12px rgba(31,78,140,.28)` lift (`shadowColor: '#1F4E8C'`, offset 0/4, opacity
 *   .28, radius 12, `elevation: 4`). This is sign-in's Branch | Driver switch, `.mode-on`.
 *
 * The track is `accessibilityRole="radiogroup"` labelled by `label`; each option is a `radio` with
 * `accessibilityState={{ selected, disabled }}`.
 */
export function Segmented<T extends string>({ label, value, options, tone = 'pill', disabled = false, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: string }[];
  tone?: 'pill' | 'solid';
  disabled?: boolean;
  onChange: (value: T) => void;
}): ReactNode {
  const { colors } = usePreferences();
  return <View accessibilityRole="radiogroup" accessibilityLabel={label}
    style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: 14, padding: 4, gap: 4 }}>
    {options.map(option => {
      const selected = option.value === value;
      const solid = selected && tone === 'solid';
      const foreground = solid ? colors.onPrimary : selected ? colors.text : colors.muted;
      return <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label}
        accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => onChange(option.value)}
        style={{ flex: 1, minWidth: 0, height: minTouch, borderRadius: 11, flexDirection: 'row',
          gap: 8, alignItems: 'center', justifyContent: 'center',
          backgroundColor: solid ? colors.primary : selected ? colors.surface : 'transparent',
          ...(solid ? { shadowColor: colors.modeShadow, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: .28, shadowRadius: 12, elevation: 4 } : {}) }}>
        {option.icon ? <Icon name={option.icon} size={20} color={foreground} tint={softFill(foreground)} /> : null}
        <Label style={{ fontFamily: 'Tajawal_700Bold', fontSize: 14, color: foreground,
          textAlign: 'center', flexShrink: 1 }}>{option.label}</Label>
      </Pressable>;
    })}
  </View>;
}

/**
 * The canvas's `.err`: an 18px icon and a line of Tajawal_700Bold 13 / lineHeight 19.5, both in
 * `colors.dangerText`, in a row with `gap: 6` and `alignItems: 'flex-start'` so a wrapped sentence
 * keeps the icon beside its first line. `accessibilityRole="alert"`, announced politely.
 */
export function ErrorLine({ icon = 'warn', children, style }: PropsWithChildren<{
  // `null` is the summary variant, and it does two things at once: no icon, and the text centred.
  // The create form's «أكمل الحقول المحددة بالأحمر» is drawn that way — no icon, because the
  // fields it points at are the ones carrying them, and centred under the button it belongs to.
  // Centring has to happen on the Label rather than the row, because the Label is `flex: 1` and
  // fills the row whatever the row's `justifyContent` says.
  icon?: string | null; style?: StyleProp<ViewStyle>;
}>): ReactNode {
  const { colors } = usePreferences();
  return <View accessibilityRole="alert" accessibilityLiveRegion="polite"
    style={[{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }, style]}>
    {icon ? <Icon name={icon} size={18} color={colors.dangerText} tint={softFill(colors.dangerText)} /> : null}
    <Label style={{ flex: 1, fontFamily: 'Tajawal_700Bold', fontSize: 13,
      lineHeight: 19.5, color: colors.dangerText, textAlign: icon === null ? 'center' : 'auto' }}>{children}</Label>
  </View>;
}

/**
 * The same line on its own `colors.dangerSoft` block — `paddingVertical: 10`,
 * `paddingHorizontal: 12`, `borderRadius: 12`. The canvas uses it for the three failures that are
 * about the attempt rather than a field: offline, wrong credentials, locked out.
 */
export function ErrorBanner({ icon = 'warn', children }: PropsWithChildren<{ icon?: string }>): ReactNode {
  const { colors } = usePreferences();
  return <ErrorLine icon={icon} style={{ backgroundColor: colors.dangerSoft, paddingVertical: 10,
    paddingHorizontal: 12, borderRadius: 12 }}>{children}</ErrorLine>;
}

/**
 * The canvas's toast — the line that says a thing happened, after it has happened.
 *
 * Shape, from the canvas: `position: absolute`, `start: 16`, `end: 16`, `top: 52`, `zIndex: 60`,
 * a `colors.surface` card with a 1px `colors.line` border, `borderRadius: 16`,
 * `paddingVertical: 12`, `paddingHorizontal: 14`, a row with `gap: 10` and `alignItems: 'center'`,
 * the overlay shadow (`colors.overlayShadow`, offset 0/12, opacity .16 light / .35 dark, radius 30,
 * `elevation: 8` — the same block `AuthCard` uses), a `seal` icon at 24 in `colors.success`, then
 * the text as Tajawal_700Bold 14 / lineHeight 20.3 in `colors.text`, `flexShrink: 1` so a long
 * sentence wraps inside the card instead of pushing the icon out.
 *
 * `text` is the whole of its state: null renders nothing. It fades in over 200ms — the canvas's
 * `cwfade .2s ease-out` — and calls `onDone` 3200ms after it appeared, which is the canvas's own
 * timeout. Opacity is safe on the native driver; `backgroundColor` would not be, see the note in
 * `onboarding.tsx`. A new `text` restarts both the fade and the timer, so two toasts in a row read
 * as two rather than one that overstays.
 *
 * Announced with `accessibilityLiveRegion="polite"` and `accessibilityRole="alert"`: React Native
 * has no 'status' role, and polite is what the canvas's `role="status"` means — say it when the
 * screen reader next pauses, do not interrupt.
 */
export function Toast({ text, onDone }: { text: string | null; onDone: () => void }): ReactNode {
  const { colors, theme } = usePreferences();
  const opacity = useRef(new Animated.Value(0)).current;
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);
  useEffect(() => {
    opacity.setValue(0);
    if (text === null) return;
    const fade = Animated.timing(opacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true });
    fade.start();
    const timer = setTimeout(() => done.current(), 3200);
    return () => { clearTimeout(timer); fade.stop(); };
  }, [text, opacity]);
  if (text === null) return null;
  return <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" accessibilityRole="alert"
    style={{ position: 'absolute', start: 16, end: 16, top: 52, zIndex: 60, opacity,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 16,
      paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', gap: 10, alignItems: 'center',
      shadowColor: colors.overlayShadow, shadowOffset: { width: 0, height: 12 },
      shadowOpacity: theme === 'dark' ? .35 : .16, shadowRadius: 30, elevation: 8 }}>
    <Icon name="seal" size={24} color={colors.success} tint={softFill(colors.success)} />
    <Label style={{ fontFamily: 'Tajawal_700Bold', fontSize: 14, lineHeight: 20.3, flexShrink: 1 }}>{text}</Label>
  </Animated.View>;
}

export function Loading() {
  const { copy, colors } = usePreferences();
  return <View style={{ gap: 8 }} accessibilityState={{ busy: true }}>
    <ActivityIndicator color={colors.primary} accessibilityLabel={copy.shared.loading} />
    <Label>{copy.shared.loading}</Label>
  </View>;
}

export function ErrorState({ title, body, onRetry }: { title?: string; body?: string; onRetry: () => void }) {
  const { copy, side } = usePreferences();
  // The two designs were approved separately and word this state differently, so a shared component
  // still has to ask which side it is rendering for.
  const fallback = side === 'branch'
    ? { title: copy.branch.loadErrT, body: copy.branch.loadErrB, retry: copy.branch.retry }
    : { title: copy.driver.errTitle, body: copy.driver.errBody, retry: copy.driver.retry };
  return <Card><Icon name="cloudX" /><Title>{title ?? fallback.title}</Title>
    <Message>{body ?? fallback.body}</Message>
    <Button label={fallback.retry} onPress={onRetry} />
  </Card>;
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return <Card><Icon name="info" /><Label>{title}</Label>{body ? <Label>{body}</Label> : null}</Card>;
}

export function OfflineBar() {
  const online = useOnline();
  const { colors, copy, side } = usePreferences();
  if (online) return null;
  // The branch promises what it typed is kept on screen; the driver's wording promises the loaded
  // data is. Same component, two approved sentences.
  const text = side === 'branch'
    ? { head: copy.branch.offT, body: copy.branch.offB }
    : { head: copy.driver.offline, body: copy.driver.offlineSub };
  return <View accessibilityRole="alert" style={{ padding: 14, borderRadius: 12,
    backgroundColor: colors.warningSoft, gap: 8 }}>
    <Icon name="wifiOff" color={colors.warning} /><Label style={{ color: colors.warning }}>{text.head}</Label>
    <Label>{text.body}</Label>
  </View>;
}

export function AppSplash() {
  const { side, copy } = usePreferences();
  return <Screen><View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
    <Icon name={side === 'branch' ? 'store' : 'truck'} />
    <Title>{side === 'branch' ? copy.branch.splashB : copy.driver.appName}</Title>
    <Label>{side === 'branch' ? copy.branch.splashA : copy.driver.tagline}</Label>
    <Loading /><OfflineBar />
  </View></Screen>;
}

/**
 * Language and theme as two 44×44 buttons, for the screens that come before sign-in.
 *
 * Those screens have nowhere else to put them — Account is behind the password — and a phone that
 * opens in Arabic would otherwise have no way to reach English. The full controls used to sit at
 * the bottom of the password screen and took a third of it, which is what Ahmed objected to, so
 * this is the same two icons the Account screen uses, shrunk to the canvas's `.hb` hero button:
 * 44×44, radius 14, on a tenth-white tile over navy, or on `surface2` anywhere else.
 *
 * The globe is a straight toggle because there are exactly two languages. The moon opens a sheet,
 * because there are three themes and one of them is «حسب النظام».
 */
export function PreferencesIcons({ onDark = false }: { onDark?: boolean } = {}) {
  const { copy, colors, language, themeChoice, setLanguage, setTheme } = usePreferences();
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const foreground = onDark ? colors.onPrimary : colors.text;
  async function update(action: () => Promise<void>) {
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
  }
  const button = (icon: string, label: string, onPress: () => void) =>
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={onPress}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 14, alignItems: 'center',
        justifyContent: 'center', opacity: busy ? .5 : pressed ? .78 : 1,
        backgroundColor: onDark ? branchArtwork.heroTile : colors.surface2 })}>
      <Icon name={icon} size={22} color={foreground} tint={softFill(foreground)} />
    </Pressable>;
  return <View style={{ flexDirection: 'row', gap: 8 }}>
    {button('globe', copy.branch.language, () => void update(() => setLanguage(language === 'ar' ? 'en' : 'ar')))}
    {button('moon', copy.branch.theme, () => setSheet(true))}
    {sheet ? <Sheet onClose={() => setSheet(false)}>
      <Title style={{ fontSize: 18 }}>{copy.branch.theme}</Title>
      <Segmented label={copy.branch.theme} value={themeChoice} disabled={busy}
        options={(['light', 'dark', 'system'] as const).map(choice => ({ value: choice, label: copy.branch[choice] }))}
        onChange={value => { setSheet(false); void update(() => setTheme(value)); }} />
    </Sheet> : null}
  </View>;
}

export function PreferencesControls({ variant }: { variant?: 'branch' } = {}) {
  const { copy, side, language, themeChoice, setLanguage, setTheme } = usePreferences();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function update(action: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await action(); } catch (error) { setError(error); } finally { setBusy(false); }
  }
  if (variant === 'branch') return <View style={{ gap: 16 }}>
    {[
      { label: copy.branch.language, icon: 'globe', options: [
        { value: 'ar', label: copy.shared.arabic, selected: language === 'ar', action: () => setLanguage('ar') },
        { value: 'en', label: copy.shared.english, selected: language === 'en', action: () => setLanguage('en') },
      ] },
      { label: copy.branch.theme, icon: 'moon', options: (['light', 'dark', 'system'] as const).map(choice => ({
        value: choice, label: copy.branch[choice], selected: themeChoice === choice, action: () => setTheme(choice),
      })) },
    ].map(group => <View key={group.icon} style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name={group.icon} size={20} />
        <Label style={{ fontFamily: 'Tajawal_800ExtraBold' }}>{group.label}</Label></View>
      <Segmented label={group.label} tone="pill" disabled={busy}
        value={group.options.find(option => option.selected)?.value ?? ''} options={group.options}
        onChange={value => { const option = group.options.find(option => option.value === value);
          if (option) void update(option.action); }} />
    </View>)}
    {error ? <Message>{errorMessage(error, copy, side)}</Message> : null}
  </View>;
  return <View style={{ gap: 8 }}>
    <Label>{copy.branch.language}</Label>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Button label={copy.shared.arabic} secondary selected={language === 'ar'} disabled={busy}
        onPress={() => void update(() => setLanguage('ar'))} />
      <Button label={copy.shared.english} secondary selected={language === 'en'} disabled={busy}
        onPress={() => void update(() => setLanguage('en'))} />
    </View>
    <Label>{copy.branch.theme}</Label>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {(['light', 'dark', 'system'] as const).map(choice => <Button key={choice}
        label={copy.branch[choice]} selected={choice === themeChoice} secondary disabled={busy}
        onPress={() => void update(() => setTheme(choice))} />)}
    </View>
    {error ? <Message>{errorMessage(error, copy, side)}</Message> : null}
  </View>;
}
