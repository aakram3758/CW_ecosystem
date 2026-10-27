import { useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text,
  TextInput, View, type TextInputProps, type TextProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { icons } from '@/ui/icons';
import { minTouch, type as typography } from '@/ui/tokens';
import { usePreferences } from '@/providers/preferences';
import { useOnline } from '@/providers/query';
import { errorMessage } from '@/data/errors';

export function Label({ style, ...props }: TextProps) {
  const { colors, language } = usePreferences();
  return <Text {...props} style={[{ fontFamily: 'Tajawal_400Regular', fontSize: typography.baseSize,
    lineHeight: typography.baseSize * typography.lineHeight, color: colors.text,
    textAlign: language === 'ar' ? 'right' : 'left', writingDirection: language === 'ar' ? 'rtl' : 'ltr' }, style]} />;
}

export function Title({ children }: PropsWithChildren) {
  return <Label accessibilityRole="header" style={{ fontFamily: 'Tajawal_800ExtraBold', fontSize: 28,
    lineHeight: 28 * typography.lineHeight }}>{children}</Label>;
}

export function Icon({ name, color }: { name: string; color?: string }) {
  const { colors } = usePreferences();
  const icon = icons[name];
  return <Svg viewBox="0 0 24 24" width={24} height={24} accessible={false}>
    {icon.f ? <Path d={icon.f} fill={colors.primarySoft} /> : null}
    <Path d={icon.s} stroke={color ?? colors.primary} strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>;
}

export function Button({ label, onPress, disabled = false, secondary = false, selected }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; selected?: boolean;
}) {
  const { colors } = usePreferences();
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

export function Screen({ children }: PropsWithChildren) {
  const { colors } = usePreferences();
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 24 }}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function Card({ children }: PropsWithChildren) {
  const { colors } = usePreferences();
  return <View style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1,
    borderColor: colors.line, padding: 14, gap: 14 }}>{children}</View>;
}

export function Field({ label, error, prefix, ...props }: TextInputProps & {
  label: string; error?: string; prefix?: string;
}) {
  const { colors, language } = usePreferences();
  return <View style={{ gap: 8 }}>
    <Label>{label}</Label>
    <View style={{ flexDirection: 'row', alignItems: 'center', direction: prefix ? 'ltr' : undefined,
      borderWidth: 1, borderColor: error ? colors.danger : colors.line, borderRadius: 12,
      backgroundColor: colors.surface, paddingHorizontal: 14 }}>
      {prefix ? <Label style={{ writingDirection: 'ltr', textAlign: 'left' }}>{prefix}</Label> : null}
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props}
      style={[{ flex: 1, minHeight: minTouch, padding: 14, color: colors.text,
        fontFamily: 'Tajawal_400Regular', fontSize: typography.baseSize,
        textAlign: language === 'ar' ? 'right' : 'left' }, props.style]} />
    </View>
    {error ? <Message>{error}</Message> : null}
  </View>;
}

export function Message({ children }: PropsWithChildren) {
  const { colors } = usePreferences();
  return <Label accessibilityRole="alert" accessibilityLiveRegion="polite"
    style={{ color: colors.dangerText }}>{children}</Label>;
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

export function PreferencesControls() {
  const { copy, side, language, themeChoice, setLanguage, setTheme } = usePreferences();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function update(action: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await action(); } catch (error) { setError(error); } finally { setBusy(false); }
  }
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
