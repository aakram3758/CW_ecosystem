import { useEffect, useRef, type PropsWithChildren, type ReactNode, type ComponentProps } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextProps, type TextInputProps, type ViewStyle, type StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePreferences } from '@/providers/preferences';
import { Icon } from './icons';
import { Skeleton as SharedSkeleton } from '@/ui/components';

const ink = '#0B1B2E', black = '#000000';
export const press = ({ pressed }: { pressed: boolean }) => ({ transform: [{ scale: pressed ? .98 : 1 }] });
export function useShadows() {
  const { theme } = usePreferences(); const dark = theme === 'dark';
  return { shadow: { shadowColor: dark ? black : ink, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, shadowOpacity: dark ? .28 : .07, elevation: 3 },
    shadowLg: { shadowColor: dark ? black : ink, shadowOffset: { width: 0, height: 14 }, shadowRadius: 34, shadowOpacity: dark ? .5 : .16, elevation: 8 } };
}
export function Motion({ children, kind = 'fade', style }: PropsWithChildren<{ kind?: 'fade' | 'up' | 'pop'; style?: StyleProp<ViewStyle> }>) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(value, { toValue: 1, duration: kind === 'pop' ? 500 : kind === 'up' ? 280 : 220,
      easing: kind === 'pop' ? Easing.bezier(.2, .9, .3, 1.2) : Easing.out(Easing.ease), useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [kind, value]);
  return <Animated.View style={[style, { opacity: value, transform: kind === 'up' ? [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }]
    : kind === 'pop' ? [{ scale: value.interpolate({ inputRange: [0, .6, 1], outputRange: [.5, 1.08, 1] }) }] : [] }]}>{children}</Animated.View>;
}
export function Label({ style, ...props }: TextProps) {
  const { colors } = usePreferences();
  const flat = StyleSheet.flatten(style); const size = flat?.fontSize ?? 15;
  // font-size alone inherits the canvas root's 1.5; its font shorthands reset to normal.
  return <Text {...props} style={[{ fontFamily: 'Tajawal_400Regular', fontSize: size, lineHeight: flat?.fontFamily ? undefined : size * 1.5, color: colors.text, textAlign: 'auto' }, style]} />;
}
export function Title({ style, ...props }: TextProps) { return <Label accessibilityRole="header" {...props} style={[{ fontFamily: 'Tajawal_800ExtraBold', fontSize: 20 }, style]} />; }
export function Muted({ style, ...props }: TextProps) { const { colors } = usePreferences(); return <Label {...props} style={[{ color: colors.muted, fontSize: 15 }, style]} />; }
export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { colors } = usePreferences(); const { shadow } = useShadows();
  return <View style={[shadow, { backgroundColor: colors.surface, padding: 14, borderRadius: 18, gap: 14 }, style]}>{children}</View>;
}
export function Button({ label, onPress, disabled, busy, icon, endIcon, endIconSize = 18, iconSize = 22, iconColor, fontSize = 16, weight = 800, tone = 'primary', style, textColor, cwPress = false, selected }: {
  label: string; onPress: () => void; disabled?: boolean; busy?: boolean; icon?: string; endIcon?: string; endIconSize?: number; iconSize?: number; iconColor?: string; fontSize?: number; weight?: 700 | 800;
  tone?: 'primary' | 'outline' | 'muted' | 'text' | 'danger' | 'gold'; style?: StyleProp<ViewStyle>; textColor?: string; cwPress?: boolean; selected?: boolean;
}) {
  const { colors } = usePreferences();
  const fg = textColor ?? (disabled && !busy ? colors.muted : tone === 'outline' || tone === 'muted' ? colors.text : tone === 'text' ? colors.link : tone === 'gold' ? ink : colors.onPrimary);
  const bg = disabled && !busy ? colors.surface2 : tone === 'outline' ? colors.surface : tone === 'muted' || tone === 'text' ? 'transparent' : tone === 'gold' ? colors.gold : tone === 'danger' ? colors.dangerText : colors.primary;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy, selected }} disabled={disabled} onPress={onPress}
    style={state => [{ minHeight: 52, borderRadius: 14, paddingHorizontal: 16, backgroundColor: bg, borderWidth: tone === 'outline' ? 1.5 : 0, borderColor: colors.line,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, style, cwPress && press(state)]}>
    {busy ? <Spinner color={fg} size={iconSize} /> : icon ? <Icon name={icon} size={iconSize} color={iconColor ?? fg} weight={icon === 'phone' ? 'bold' : undefined} /> : null}
    <Label style={{ fontFamily: weight === 800 ? 'Tajawal_800ExtraBold' : 'Tajawal_700Bold', fontSize, color: fg, textAlign: 'center', flexShrink: 1 }}>{label}</Label>
    {endIcon ? <Icon name={endIcon} size={endIconSize} color={fg} /> : null}
  </Pressable>;
}
export function Spinner({ color, size }: { color: string; size: number }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => { const loop = Animated.loop(Animated.timing(value, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })); loop.start(); return () => loop.stop(); }, [value]);
  return <Animated.View style={{ transform: [{ rotate: value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}><Icon name="circle-notch" weight="bold" color={color} size={size} /></Animated.View>;
}
export function Screen({ children, header, footer, contentStyle, safeColor, topInset = true, motion = 'fade' }: PropsWithChildren<{
  header?: ReactNode; footer?: ReactNode; contentStyle?: StyleProp<ViewStyle>; safeColor?: string; topInset?: boolean; motion?: 'fade' | 'up';
}>) {
  const { colors } = usePreferences(); const insets = useSafeAreaInsets();
  return <Motion kind={motion} style={{ flex: 1, backgroundColor: safeColor ?? colors.bg, paddingTop: topInset ? insets.top : 0 }}>
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}<ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[{ flexGrow: 1, padding: 16, paddingBottom: 24, gap: 14 }, contentStyle]}>{children}</ScrollView>{footer}
    </KeyboardAvoidingView>
  </Motion>;
}
// Same native Modal/backdrop/back-button behaviour as the shared Sheet; its frame has no styling props.
export function Sheet({ children, onClose }: PropsWithChildren<{ onClose: () => void }>) {
  const { colors, language, copy } = usePreferences(); const insets = useSafeAreaInsets();
  return <Modal transparent animationType="fade" onRequestClose={onClose}><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim, direction: language === 'ar' ? 'rtl' : 'ltr' }}>
    <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={copy.driver.close} onPress={onClose} />
    <Motion kind="up" style={{ maxHeight: '90%', backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26 }}>
      <ScrollView accessibilityViewIsModal keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: Math.max(32, insets.bottom), gap: 16 }}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 9, backgroundColor: colors.line }} />{children}
      </ScrollView>
    </Motion>
  </View></Modal>;
}
export function Segmented<T extends string>({ label, value, onChange, options, height = 46, fontSize = 15 }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: string }[]; height?: number; fontSize?: number;
}) {
  const { colors } = usePreferences(); const { shadow } = useShadows();
  return <View accessibilityLabel={label} style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: colors.surface2 }}>
    {options.map(o => <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityState={{ selected: o.value === value }}
      style={[o.value === value && shadow, { flex: 1, height, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: o.value === value ? colors.surface : 'transparent' }]}>
      {o.icon ? <Icon name={o.icon} size={18} color={o.value === value ? colors.text : colors.muted} /> : null}
      <Label style={{ fontFamily: 'Tajawal_800ExtraBold', fontSize, color: o.value === value ? colors.text : colors.muted }}>{o.label}</Label>
    </Pressable>)}
  </View>;
}
export function Field({ label, error, style, ...props }: TextInputProps & { label?: string; error?: string }) {
  const { colors } = usePreferences();
  return <View style={{ gap: 8 }}>{label ? <Label style={{ fontFamily: 'Tajawal_700Bold', fontSize: 15 }}>{label}</Label> : null}
    <TextInput {...props} placeholderTextColor={colors.muted} style={[{ borderRadius: 14, borderWidth: 1.5, borderColor: error ? colors.danger : colors.line, backgroundColor: colors.surface, color: colors.text,
      paddingVertical: 12, paddingHorizontal: 14, fontFamily: 'Tajawal_700Bold', fontSize: 16, lineHeight: 24, textAlign: 'auto', textAlignVertical: props.multiline ? 'top' : 'center' }, style]} />
    {error ? <ErrorLine>{error}</ErrorLine> : null}
  </View>;
}
export function ErrorLine({ children }: PropsWithChildren) { const { colors } = usePreferences(); return <Label accessibilityRole="alert" style={{ color: colors.dangerText, fontSize: 15 }}>{children}</Label>; }

export function Skeleton({ style, ...props }: ComponentProps<typeof SharedSkeleton>) { const { colors } = usePreferences(); return <SharedSkeleton {...props} style={[{ backgroundColor: colors.skeleton }, style]} />; }
