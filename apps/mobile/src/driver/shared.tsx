import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { Image, Linking, Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { usePreferences } from '@/providers/preferences';
import { Skeleton } from './visual';
import { useSignedPhoto } from '@/ui/role-shared';
import { useDateFormat } from '@/ui/date';
import { interpolate, ltr } from '@/i18n/copy';
import { materialSoft, outcomeRing } from '@/ui/tokens';
import type { RequestListRow } from '@/data/rows';
import { decision, stopState, type Outcome } from './model';
import { useDriver, type Tab } from './state';
import { Icon } from './icons';
import { Button, Card, Label, Muted, Motion, Screen, Title, press, useShadows } from './visual';
export { Muted } from './visual';
const photoInk = '#05080C', white = '#FFFFFF', photoOverlay = 'rgba(0,0,0,.55)', closeFill = 'rgba(255,255,255,.14)', captionWhite = 'rgba(255,255,255,.85)', navShadow = '#0B1B2E';
export const styles = StyleSheet.create({
 body: { padding: 16, paddingBottom: 24, gap: 14 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, grow: { flex: 1, minWidth: 0 },
 card: { padding: 14, borderRadius: 18, gap: 14 }, h1: { fontSize: 22, lineHeight: 29.7 }, h2: { fontSize: 18, lineHeight: 23.4 },
 bold: { fontFamily: 'Tajawal_700Bold' }, heavy: { fontFamily: 'Tajawal_800ExtraBold' },
});
export function useDriverFormat() {
  const { copy, language, colors, theme } = usePreferences();
  const { date, stamp, locale } = useDateFormat();
  const t = copy.driver;
  const local = (ar: string | null | undefined, en: string | null | undefined) => (language === 'en' ? en || ar : ar) ?? '';
  const title = (row: RequestListRow) => `${local(row.chain_name_ar, row.chain_name_en)} #${row.branch_number ?? ''} – ${local(row.district_name_ar, row.district_name_en)}`;
  const material = (row: RequestListRow) => [local(row.material_name_ar, row.material_name_en), local(row.subtype_name_ar, row.subtype_name_en)].filter(Boolean).join(' · ');
  const kg = (value: number | null) => value === null ? '' : `${value.toLocaleString('en-US')} ${t.kg}`;
  const phone = (value: string) => ltr(value.startsWith('05') ? `+966 ${value.slice(1, 3)} ${value.slice(3, 6)} ${value.slice(6)}` : value.startsWith('5') && value.length === 9 ? `+966 ${value}` : value);
  const time = (value: string | null) => value ? new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Riyadh', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : '';
  const status = (kind: Outcome | 'todo') => ({
    label: t[`st_${kind}`], icon: kind === 'full' ? 'check-circle' : kind === 'partial' ? 'circle-half' : kind === 'failed' ? 'x-circle' : 'circle-dashed',
    color: kind === 'full' ? colors.success : kind === 'partial' ? colors.accentText : kind === 'failed' ? colors.dangerText : colors.muted,
    background: kind === 'full' ? colors.successSoft : kind === 'partial' ? colors.accentSoft : kind === 'failed' ? colors.dangerSoft : colors.surface2,
  });
  const materialStyle = (row: RequestListRow) => ({ color: (theme === 'dark' ? row.material_color_dark : row.material_color_light) ?? colors.primary,
    background: materialSoft[theme][row.material_code as keyof typeof materialSoft.light] ?? colors.surface2 });
  return { t, colors, language, locale, local, title, material, kg, phone, time, date, stamp, status, materialStyle };
}

export function Tile({ icon, color, background, size = 44, iconSize = 24, radius = 14, weight }: { icon: string; color?: string; background?: string; size?: number; iconSize?: number; radius?: number; weight?: 'bold' | 'fill' | 'duotone' }) {
  const { colors } = usePreferences(); return <View style={{ width: size, height: size, flexShrink: 0, borderRadius: radius, backgroundColor: background ?? colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
    <Icon name={icon} size={iconSize} color={color ?? colors.primary} weight={weight} /></View>;
}
export function IconButton({ icon, label, onPress, style, color, size = 22, disabled }: { icon: string; label: string; onPress: () => void; style?: StyleProp<ViewStyle>; color?: string; size?: number; disabled?: boolean }) {
  const { colors } = usePreferences(); return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={[{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, style]}><Icon name={icon} color={color ?? colors.text} size={size} /></Pressable>;
}
export function Pill({ children, color, background, icon, dot, height = 28, radius = 9, fontSize = 13, weight = 700, padding = 10, iconSize = 15, iconWeight }: PropsWithChildren<{
  color?: string; background?: string; icon?: string; dot?: boolean; height?: number; radius?: number; fontSize?: number; weight?: 700 | 800; padding?: number; iconSize?: number; iconWeight?: 'fill' | 'duotone' | 'bold';
}>) {
  const { colors } = usePreferences(); const fg = color ?? colors.muted;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: dot ? 6 : 4, height, paddingHorizontal: padding, borderRadius: radius, alignSelf: 'flex-start', backgroundColor: background ?? colors.surface2 }}>
    {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fg }} /> : null}{icon ? <Icon name={icon} size={iconSize} color={fg} weight={iconWeight} /> : null}
    <Label style={{ color: fg, fontSize, fontFamily: weight === 800 ? 'Tajawal_800ExtraBold' : 'Tajawal_700Bold' }}>{children}</Label></View>;
}
export function Footer({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { colors } = usePreferences(); const insets = useSafeAreaInsets();
  return <View style={[{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: Math.max(28, insets.bottom), gap: 8, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line }, style]}>{children}</View>;
}
export function PageFrame({ title, subtitle, onBack, trailing, footer, children, contentStyle, titleSize, close = false, backDisabled, afterHeader, motion = 'fade' }: PropsWithChildren<{
  title: string; subtitle?: ReactNode; onBack?: () => void; trailing?: ReactNode; footer?: ReactNode; contentStyle?: StyleProp<ViewStyle>; titleSize?: number; close?: boolean; backDisabled?: boolean; afterHeader?: ReactNode; motion?: 'fade' | 'up';
}>) {
  const { t, colors } = useDriverFormat();
  return <Screen safeColor={colors.surface} motion={motion} contentStyle={[styles.body, contentStyle]} header={<><View style={[styles.row, { height: 61, paddingHorizontal: onBack ? 16 : 20, backgroundColor: colors.surface, borderBottomWidth: afterHeader ? 0 : 1, borderBottomColor: colors.line }]}>
    {onBack ? <IconButton icon={close ? 'x' : 'back'} size={close ? 20 : 22} disabled={backDisabled} label={close ? t.close : t.back} onPress={onBack} /> : null}
    <View style={styles.grow}><Title numberOfLines={1} style={{ fontSize: titleSize ?? (onBack ? 21 : 22), lineHeight: (titleSize ?? (onBack ? 21 : 22)) * 1.3 }}>{title}</Title>
      {typeof subtitle === 'string' ? <Muted numberOfLines={1} style={{ fontSize: 14 }}>{subtitle}</Muted> : subtitle}</View>{trailing}
  </View>{afterHeader}</>} footer={footer}>{children}</Screen>;
}
export function BottomNav() {
  const data = useDriver(); const { t, colors } = useDriverFormat();
  const items: { key: Tab; label: string; icon: string }[] = [{ key: 'home', label: t.navToday, icon: 'house' }, { key: 'upcoming', label: t.navUpcoming, icon: 'calendar-blank' }, { key: 'history', label: t.navHistory, icon: 'clock-counter-clockwise' }, { key: 'account', label: t.navAccount, icon: 'user' }];
  return <View accessibilityLabel={t.navAria} style={{ flexDirection: 'row', height: 88, paddingHorizontal: 6, paddingTop: 8, paddingBottom: 22, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line,
    shadowColor: navShadow, shadowOffset: { width: 0, height: -6 }, shadowRadius: 20, shadowOpacity: .08, elevation: 5 }}>
    {items.map(item => { const active = data.page === item.key || item.key === 'home' && data.page === 'plan'; return <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => data.setPage(item.key)} style={{ flex: 1, minHeight: 56, gap: 3, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 58, height: 30, borderRadius: 15, backgroundColor: active ? colors.primarySoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Icon name={item.icon} weight={active ? 'fill' : 'duotone'} color={active ? colors.primary : colors.muted} /></View>
      <Label style={{ fontFamily: active ? 'Tajawal_800ExtraBold' : 'Tajawal_700Bold', fontSize: 13, color: active ? colors.primary : colors.muted }}>{item.label}</Label></Pressable>; })}
  </View>;
}
export function LoadingCards({ home = false }: { home?: boolean }) {
  if (home) return <View accessibilityState={{ busy: true }} style={{ gap: 14 }}><Skeleton width="46%" height={26} /><Skeleton height={10} />
    <View style={styles.row}><Skeleton width={58} height={58} radius={18} /><View style={[styles.grow, { gap: 8 }]}><Skeleton width="70%" height={18} /><Skeleton width="45%" height={14} /></View></View><Skeleton height={56} radius={16} /></View>;
  return <View accessibilityState={{ busy: true }} style={{ gap: 12 }}><Skeleton height={54} radius={14} />{[0, 1, 2, 3].map(n => <Card key={n} style={styles.row}><Skeleton width={52} height={52} radius={16} /><View style={[styles.grow, { gap: 10 }]}><Skeleton width="70%" height={16} /><Skeleton width="46%" height={12} /></View></Card>)}</View>;
}
export function ErrorState({ onRetry, home = false }: { onRetry: () => void; home?: boolean }) {
  const { colors, copy } = usePreferences(); const t = copy.driver;
  return <View accessibilityRole="alert" style={{ flex: home ? undefined : 1, alignItems: 'center', justifyContent: 'center', gap: home ? 10 : 12, paddingHorizontal: home ? 4 : 20, paddingTop: home ? 6 : 0, paddingBottom: home ? 6 : 60 }}>
    <Tile icon="warning-circle" size={home ? 64 : 76} radius={home ? 20 : 24} iconSize={home ? 34 : 40} color={colors.dangerText} background={colors.dangerSoft} />
    <Title style={{ fontSize: home ? 18 : 20, textAlign: 'center' }}>{t.errTitle}</Title><Muted style={{ fontSize: home ? 15 : 16, textAlign: 'center' }}>{t.errBody}</Muted>
    <Button label={t.retry} icon="arrows-clockwise" iconSize={16} onPress={onRetry} style={{ marginTop: home ? 0 : 6, height: home ? 54 : 56, borderRadius: home ? 14 : 16, paddingHorizontal: 28, alignSelf: home ? 'stretch' : 'center' }} />
  </View>;
}
export function EmptyState({ title, body, icon = 'clipboard-text', action }: { title: string; body?: string; icon?: string; action?: { label: string; icon?: string; onPress: () => void } }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: action ? 10 : 12, paddingHorizontal: 24, paddingTop: action ? 40 : 0, paddingBottom: action ? 40 : 60 }}>
    <Tile icon={icon} size={action ? 80 : 84} radius={action ? 26 : 28} iconSize={action ? 42 : 44} /><Title style={{ fontSize: action ? 19 : 20, lineHeight: (action ? 19 : 20) * 1.35, textAlign: 'center' }}>{title}</Title>
    {body ? <Muted style={{ fontSize: action ? 15 : 16, textAlign: 'center' }}>{body}</Muted> : null}{action ? <Button {...action} fontSize={15} style={{ marginTop: 4, height: 52, paddingHorizontal: 22 }} /> : null}</View>;
}
export function OpsButton({ wrong = false, centered = false }: { wrong?: boolean; centered?: boolean }) {
  const data = useDriver(); const { t, colors } = useDriverFormat();
  if (!data.context.opsPhone) return wrong ? <Muted style={{ fontSize: 14 }}>{t.wrongEntry}</Muted> : null;
  return <Button tone="text" icon="headset" iconSize={wrong ? 18 : 16} fontSize={wrong ? 14 : 16} weight={wrong ? 700 : 800} textColor={colors.link} label={wrong ? t.wrongEntry : t.contactOps} onPress={data.openOps}
    style={{ minHeight: wrong ? centered ? 48 : 44 : 52, paddingHorizontal: 0, gap: wrong ? 6 : 8, justifyContent: centered || !wrong ? 'center' : 'flex-start' }} />;
}
export function ChangeBanner({ plan = false }: { plan?: boolean }) {
  const data = useDriver(); const f = useDriverFormat(); const n = data.change; if (!n) return null;
  if (plan) return <View style={[styles.row, { gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: f.colors.accentSoft }]}><Icon name="bell-ringing" color={f.colors.accent} />
    <View style={styles.grow}><Title style={{ fontSize: 15 }}>{f.local(n.title_ar, n.title_en)}</Title><Muted style={{ fontSize: 14 }}>{f.local(n.body_ar, n.body_en)}</Muted></View>
    <IconButton icon="x" label={f.t.gotIt} onPress={data.dismissChange} size={18} color={f.colors.muted} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'transparent' }} /></View>;
  return <Motion kind="up" style={[styles.row, { alignItems: 'flex-start', backgroundColor: f.colors.surface, borderWidth: 1.5, borderColor: f.colors.accent, borderRadius: 18, padding: 14 }]}>
    <Tile icon="bell-ringing" background={f.colors.accentSoft} color={f.colors.accent} /><View style={[styles.grow, { gap: 4 }]}><Title style={{ fontSize: 16 }}>{f.local(n.title_ar, n.title_en)}</Title><Muted style={{ fontSize: 14 }}>{f.local(n.body_ar, n.body_en)}</Muted>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}><Button label={f.t.view} fontSize={14} style={{ minHeight: 44, borderRadius: 12 }} onPress={() => data.setPage('plan')} /><Button label={f.t.gotIt} fontSize={14} weight={700} tone="outline" style={{ minHeight: 44, borderRadius: 12, backgroundColor: 'transparent' }} onPress={data.dismissChange} /></View></View></Motion>;
}
export function MaterialPill({ row, height = 28, fontSize = 13, radius = 9, padding = 10 }: { row: RequestListRow; height?: number; fontSize?: number; radius?: number; padding?: number }) {
  const f = useDriverFormat(); return <Pill {...f.materialStyle(row)} dot height={height} fontSize={fontSize} radius={radius} padding={padding}>{f.material(row)}</Pill>;
}
export function Weight({ row }: { row: RequestListRow }) { const f = useDriverFormat(); return <View style={[styles.row, { gap: 4 }]}><Icon name="scales" size={18} color={f.colors.muted} /><Muted style={[styles.bold, { fontSize: 14 }]}>{f.kg(row.kg)}</Muted></View>; }
/** Operations' decision on a stop recorded today, under its outcome; nothing while there is none to tell. */
export function DecisionLine({ row, fontSize = 13 }: { row: RequestListRow; fontSize?: number }) {
  const data = useDriver(); const f = useDriverFormat(); const d = decision(row, data.today);
  if (!d) return null;
  const icon = d.kind === 'pending' ? 'clock-counter-clockwise' : d.kind === 'rescheduled' ? 'calendar-check' : d.kind === 'closed' ? 'lock-simple' : 'x-circle';
  const text = d.kind === 'pending' ? f.t.decisionPending : d.kind === 'rescheduled' ? interpolate(f.t.decisionRescheduled, { date: f.date(d.day, true) })
    : d.kind === 'closed' ? f.t.decisionClosed : f.t.decisionCancelled;
  return <View style={[styles.row, { gap: 5 }]}><Icon name={icon} size={fontSize + 3} color={f.colors.muted} /><Muted style={[styles.bold, { fontSize, flexShrink: 1 }]}>{text}</Muted></View>;
}
export function StopCard({ row, readOnly = false }: { row: RequestListRow; readOnly?: boolean }) {
  const data = useDriver(); const f = useDriverFormat(); const kind = stopState(row, data.today); const st = f.status(kind); const { shadow } = useShadows();
  const suggested = !readOnly && data.suggestion?.row.id === row.id; const done = !readOnly && kind !== 'todo';
  if (done) return <Pressable onPress={() => row.id && data.openStop(row.id)} accessibilityRole="button" style={[styles.row, { gap: 10, paddingVertical: 10, paddingHorizontal: 14, minHeight: 60, borderWidth: 1, borderColor: f.colors.line, borderRadius: 14, backgroundColor: f.colors.surface2 }]}>
    <Icon name={st.icon} weight="fill" size={26} color={st.color} /><View style={styles.grow}><Label style={[styles.bold, { fontSize: 15 }]}>{f.title(row)}</Label><Muted style={{ fontSize: 13 }}>{f.material(row)} · {f.time(row.last_attempt_at)}</Muted><DecisionLine row={row} /></View><Pill {...st} padding={9} weight={800}>{st.label}</Pill></Pressable>;
  const content = <><Tile icon="storefront" size={readOnly ? 48 : 52} radius={readOnly ? 15 : 16} iconSize={readOnly ? 26 : 28} {...f.materialStyle(row)} />
    <View style={[styles.grow, { gap: readOnly ? 6 : 7 }]}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}><Label style={[styles.heavy, { fontSize: readOnly ? 16 : 17, lineHeight: (readOnly ? 16 : 17) * 1.3 }]}>{f.title(row)}</Label>
      {suggested ? <Pill color={f.colors.accentText} background={f.colors.accentSoft} height={24} radius={7} padding={8} fontSize={12} weight={800}>{f.t.suggestedTag}</Pill> : null}</View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><MaterialPill row={row} /><Weight row={row} />{!readOnly ? <Pill {...st} icon={st.icon} padding={9}>{st.label}</Pill> : null}</View>
      {!readOnly && row.id && data.drafts[row.id]?.kind ? <View style={[styles.row, { gap: 4 }]}><Icon name="note-pencil" size={16} color={f.colors.accentText} /><Label style={[styles.heavy, { fontSize: 13, color: f.colors.accentText }]}>{f.t.draftTag}</Label></View> : null}</View>
    {!readOnly ? <Icon name="fwd" color={f.colors.muted} size={18} /> : null}</>;
  const box: StyleProp<ViewStyle> = [shadow, styles.row, { minHeight: readOnly ? 80 : 96, paddingVertical: readOnly ? 12 : 14, paddingHorizontal: 14, borderRadius: 18, backgroundColor: f.colors.surface, borderWidth: readOnly ? 0 : suggested ? 2 : 1, borderColor: suggested ? f.colors.accent : 'transparent' }];
  return readOnly ? <View style={box}>{content}</View> : <Pressable accessibilityRole="button" onPress={() => row.id && data.openStop(row.id)} style={state => [box, press(state)]}>{content}</Pressable>;
}
export function ProgressRing({ kinds, size = 136, history = false }: { kinds: (Outcome | 'todo')[]; size?: number; history?: boolean }) {
  const { t, colors } = useDriverFormat(); const remaining = kinds.filter(k => k === 'todo').length;
  const stroke = size === 136 ? 15 : size === 96 ? 11 : 7; const radius = (size - stroke) / 2; const circumference = 2 * Math.PI * radius;
  const segment = circumference / Math.max(1, kinds.length);
  // ringBg's gap is degrees, not pixels, and disappears above sixteen stops.
  const gap = kinds.length <= 16 ? circumference * Math.min(3, 360 / Math.max(1, kinds.length) * .3) / 360 : 0;
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={t.progress} accessibilityValue={{ min: 0, max: kinds.length, now: kinds.length - remaining }} style={{ width: size, height: size, flexShrink: 0 }}>
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}><Circle cx={size / 2} cy={size / 2} r={radius} stroke={kinds.length ? colors.surface : colors.ringTodo} strokeWidth={stroke} fill="none" />
      {kinds.map((kind, i) => <Circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors[outcomeRing[kind]]} strokeWidth={stroke} strokeDasharray={`${segment - gap} ${circumference - segment + gap}`} strokeDashoffset={-i * segment} rotation={-90} origin={`${size / 2}, ${size / 2}`} />)}</Svg>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Label style={[styles.heavy, { fontSize: size === 136 ? 44 : size === 96 ? 28 : 18, lineHeight: size === 136 ? 44 : size === 96 ? 28 : 18 }]}>{history ? kinds.length : remaining}</Label>
      <Muted style={{ fontFamily: size === 136 ? 'Tajawal_800ExtraBold' : 'Tajawal_700Bold', fontSize: size === 136 ? 14 : size === 96 ? 12 : 9, lineHeight: size === 136 ? 18.2 : size === 96 ? 15.6 : 10.8, marginTop: size === 136 ? 4 : size === 96 ? 3 : 0 }}>{history ? t.visitsUnit : size < 96 ? t.leftShort : remaining === 1 ? t.left1 : t.left}</Muted></View></View>;
}
export function Legend({ kinds, history = false }: { kinds: (Outcome | 'todo')[]; history?: boolean }) {
  const f = useDriverFormat(); return <View style={[styles.grow, { gap: history ? 8 : 9 }]}>{(['full', 'partial', 'failed'] as const).map(kind => <View key={kind} style={[styles.row, { gap: 8 }]}><View style={{ width: 14, height: 14, borderRadius: 5, backgroundColor: f.colors[outcomeRing[kind]] }} /><Label style={[styles.grow, styles.bold, { fontSize: 15 }]}>{f.status(kind).label}</Label><Label style={[styles.heavy, { fontSize: 15 }]}>{kinds.filter(k => k === kind).length}</Label></View>)}</View>;
}
export function StoredPhoto({ path, label, height = 170, enlarge = false, caption, labelFirst = false }: { path: string; label: string; height?: number; enlarge?: boolean; caption?: string; labelFirst?: boolean }) {
  const photo = useSignedPhoto(path); const f = useDriverFormat(); const [failed, setFailed] = useState(false); const [big, setBig] = useState(false); const insets = useSafeAreaInsets();
  if (photo.isPending) return <Skeleton height={height} radius={16} />;
  if (!photo.data || failed) return <ErrorState onRetry={() => { setFailed(false); void photo.refetch(); }} />;
  const captionLabel = <Muted style={[styles.bold, { fontSize: 13 }]}>{label}</Muted>;
  return <View style={{ gap: 8 }}>{labelFirst ? captionLabel : null}<Pressable disabled={!enlarge} accessibilityRole={enlarge ? 'button' : 'image'} accessibilityLabel={label} onPress={() => setBig(true)}>
    <Image source={{ uri: photo.data }} accessibilityLabel={label} onError={() => setFailed(true)} style={{ width: '100%', height, borderRadius: 16 }} />
    {enlarge ? <View style={{ position: 'absolute', bottom: 10, left: 10 }}><Pill icon="magnifying-glass-plus" iconSize={18} height={34} radius={10} color={white} background={photoOverlay}>{f.t.tapEnlarge}</Pill></View> : null}</Pressable>{!labelFirst ? captionLabel : null}
    {big ? <Modal onRequestClose={() => setBig(false)} animationType="fade"><View style={{ flex: 1, backgroundColor: photoInk, direction: f.language === 'ar' ? 'rtl' : 'ltr' }}>
      <View style={[styles.row, { paddingTop: insets.top + 5, paddingHorizontal: 16, paddingBottom: 12 }]}><IconButton icon="x" label={f.t.close} onPress={() => setBig(false)} color={white} size={20} style={{ borderRadius: 24, backgroundColor: closeFill }} /><Label style={[styles.heavy, { fontSize: 17, color: white }]}>{label}</Label></View>
      <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 40 }}><Image source={{ uri: photo.data }} resizeMode="contain" style={{ width: '100%', height: 470, maxHeight: '100%' }} /></View>
      {caption ? <View style={[styles.row, { justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 34 }]}><Label style={[styles.bold, { fontSize: 15, color: captionWhite }]}>{f.t.declared}</Label><Label style={[styles.heavy, { fontSize: 15, color: white }]}>{caption}</Label></View> : null}</View></Modal> : null}</View>;
}
export async function openDeviceUrl(url: string, onError: () => void) { try { await Linking.openURL(url); } catch { onError(); } }
