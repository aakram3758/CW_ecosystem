import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { Image, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { usePreferences } from '@/providers/preferences';
import { Button, Card, ErrorState, Icon, Label, Screen, Skeleton, Title } from '@/ui/components';
import { IconButton, Muted, Pill, Tile, useSignedPhoto, Footer } from '@/ui/role-shared';
import { useDateFormat } from '@/ui/date';
import { ltr } from '@/i18n/copy';
import { materialSoft, outcomeRing } from '@/ui/tokens';
import type { RequestListRow } from '@/data/rows';
import { stopState, type Outcome } from './model';
import { useDriver, type Tab } from './state';

export { IconButton, Muted, Pill, Tile, useSignedPhoto, Footer } from '@/ui/role-shared';
export const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 24, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  card: { padding: 14, borderRadius: 18, gap: 14, borderWidth: 0 },
  h1: { fontSize: 22, lineHeight: 29.7 }, h2: { fontSize: 18, lineHeight: 24.3 },
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
    label: t[`st_${kind}`], icon: kind === 'full' ? 'check' : kind === 'partial' ? 'scale' : kind === 'failed' ? 'x-circle' : 'clock',
    color: kind === 'full' ? colors.success : kind === 'partial' ? colors.accent : kind === 'failed' ? colors.dangerText : colors.muted,
    background: kind === 'full' ? colors.successSoft : kind === 'partial' ? colors.accentSoft : kind === 'failed' ? colors.dangerSoft : colors.surface2,
  });
  const materialStyle = (row: RequestListRow) => ({ color: (theme === 'dark' ? row.material_color_dark : row.material_color_light) ?? colors.primary,
    background: materialSoft[theme][row.material_code as keyof typeof materialSoft.light] ?? colors.surface2 });
  return { t, colors, language, locale, local, title, material, kg, phone, time, date, stamp, status, materialStyle };
}

export function PageFrame({ title, subtitle, onBack, trailing, footer, children }: PropsWithChildren<{
  title: string; subtitle?: string; onBack?: () => void; trailing?: ReactNode; footer?: ReactNode;
}>) {
  const { t, colors, language } = useDriverFormat();
  return <Screen contentStyle={styles.body} header={<View style={[styles.row, { padding: 16, minHeight: 61,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line }]}>
    {onBack ? <IconButton icon={language === 'ar' ? 'caretR' : 'caretL'} label={t.back} onPress={onBack} /> : null}
    <View style={styles.grow}><Title style={styles.h1}>{title}</Title>{subtitle ? <Muted>{subtitle}</Muted> : null}</View>{trailing}
  </View>} footer={footer}>{children}</Screen>;
}
export function BottomNav() {
  const data = useDriver(); const { t, colors } = useDriverFormat();
  const items: { key: Tab; label: string; icon: string }[] = [
    { key: 'home', label: t.navToday, icon: 'house' }, { key: 'upcoming', label: t.navUpcoming, icon: 'cal' },
    { key: 'history', label: t.navHistory, icon: 'clock' }, { key: 'account', label: t.navAccount, icon: 'user' },
  ];
  return <View accessibilityLabel={t.navAria} style={{ flexDirection: 'row', paddingHorizontal: 6, paddingTop: 8,
    paddingBottom: 22, minHeight: 88, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line }}>
    {items.map(item => { const active = data.page === item.key || item.key === 'home' && data.page === 'plan';
      return <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => data.setPage(item.key)}
        style={{ flex: 1, minHeight: 56, gap: 3, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 58, height: 30, borderRadius: 15, backgroundColor: active ? colors.primarySoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={item.icon} color={active ? colors.link : colors.muted} /></View>
        <Label style={[styles.bold, { fontSize: 13, color: active ? colors.link : colors.muted }]}>{item.label}</Label>
      </Pressable>;
    })}
  </View>;
}
export function LoadingCards() { return <View accessibilityState={{ busy: true }} style={{ gap: 14 }}>
  <Skeleton height={26} width="46%" /><Skeleton height={10} /><Skeleton height={96} radius={18} /><Skeleton height={96} radius={18} />
</View>; }
export function OpsButton({ wrong = false }: { wrong?: boolean }) {
  const data = useDriver(); const { t } = useDriverFormat();
  if (!data.context.opsPhone) return wrong ? <Muted>{t.wrongEntry}</Muted> : null;
  return <Button variant="branch" tone="muted" icon="headset" label={wrong ? t.wrongEntry : t.contactOps} onPress={data.openOps} />;
}
export function ChangeBanner() {
  const data = useDriver(); const f = useDriverFormat(); const n = data.change;
  if (!n) return null;
  return <Card style={[styles.card, styles.row, { borderWidth: 1.5, borderColor: f.colors.accent }]}>
    <Tile icon="bell" background={f.colors.accentSoft} color={f.colors.accent} />
    <View style={styles.grow}><Title style={{ fontSize: 16 }}>{f.local(n.title_ar, n.title_en)}</Title>
      <Muted>{f.local(n.body_ar, n.body_en)}</Muted>
      <View style={styles.row}><Button variant="branch" label={f.t.view} onPress={() => data.setPage('plan')} />
        <Button variant="branch" tone="outline" label={f.t.gotIt} onPress={data.dismissChange} /></View>
    </View>
  </Card>;
}
export function MaterialPill({ row }: { row: RequestListRow }) {
  const f = useDriverFormat(); return <Pill {...f.materialStyle(row)}>{f.material(row)}</Pill>;
}
export function StopCard({ row, readOnly = false }: { row: RequestListRow; readOnly?: boolean }) {
  const data = useDriver(); const f = useDriverFormat(); const kind = stopState(row, data.today); const st = f.status(kind);
  const suggested = !readOnly && data.suggestion?.row.id === row.id;
  const done = !readOnly && kind !== 'todo';
  const content = <Card style={[styles.card, styles.row, { minHeight: done ? 60 : readOnly ? 80 : 96,
    paddingVertical: done ? 10 : 14, borderRadius: done ? 14 : 18,
    backgroundColor: done ? f.colors.surface2 : f.colors.surface, borderWidth: suggested ? 2 : done ? 1 : 0,
    borderColor: suggested ? f.colors.accent : f.colors.line }]}>
    <Tile icon={done ? st.icon : 'store'} size={done ? 36 : 52} {...(done ? st : f.materialStyle(row))} />
    <View style={[styles.grow, { gap: 7 }]}><Label style={[styles.heavy, { fontSize: done ? 15 : 17 }]}>{f.title(row)}</Label>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}><MaterialPill row={row} /><Muted>{f.kg(row.kg)}</Muted>
        {!readOnly ? <Pill {...st} icon={st.icon}>{st.label}</Pill> : null}</View>
      {done ? <Muted>{f.time(row.last_attempt_at)}</Muted> : null}
      {suggested ? <Pill color={f.colors.accentText} background={f.colors.accentSoft} icon="navigation-arrow">{f.t.suggestedTag}</Pill> : null}
      {!readOnly && row.id && data.drafts[row.id]?.kind ? <Muted style={{ color: f.colors.accentText }}>{f.t.draftTag}</Muted> : null}
    </View>
  </Card>;
  return readOnly ? content : <Pressable accessibilityRole="button" onPress={() => row.id && data.openStop(row.id)}>{content}</Pressable>;
}
export function ProgressRing({ kinds, size = 136, history = false }: { kinds: (Outcome | 'todo')[]; size?: number; history?: boolean }) {
  const { t, colors, status } = useDriverFormat(); const remaining = kinds.filter(k => k === 'todo').length;
  const stroke = size === 136 ? 15 : size === 96 ? 11 : 7;
  const radius = (size - stroke) / 2; const circumference = 2 * Math.PI * radius;
  const segment = circumference / Math.max(1, kinds.length); const gap = Math.min(3, segment / 5);
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={t.progress}
    accessibilityValue={{ min: 0, max: kinds.length, now: kinds.length - remaining }} style={{ width: size, height: size }}>
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.ringTodo} strokeWidth={stroke} fill="none" />
      {kinds.map((kind, i) => <Circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={colors[outcomeRing[kind]]} strokeWidth={stroke}
        strokeDasharray={`${Math.max(.1, segment - gap)} ${circumference - segment + gap}`}
        strokeDashoffset={-i * segment} rotation={-90} origin={`${size / 2}, ${size / 2}`} />)}
    </Svg>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Label style={[styles.heavy, { fontSize: size === 136 ? 44 : size === 96 ? 28 : 18, lineHeight: size === 136 ? 48 : 28 }]}>{history ? kinds.length : remaining}</Label>
      <Muted style={{ fontSize: size < 96 ? 9 : 12 }}>{history ? t.visitsUnit : size < 96 ? t.leftShort : remaining === 1 ? t.left1 : t.left}</Muted>
    </View>
  </View>;
}
export function Legend({ kinds }: { kinds: (Outcome | 'todo')[] }) {
  const f = useDriverFormat();
  return <View style={[styles.grow, { gap: 9 }]}>{(['full', 'partial', 'failed'] as const).map(kind => <View key={kind} style={[styles.row, { gap: 8 }]}>
    <View style={{ width: 14, height: 14, borderRadius: 5, backgroundColor: f.colors[outcomeRing[kind]] }} />
    <Label style={[styles.grow, styles.bold, { fontSize: 15 }]}>{f.status(kind).label}</Label>
    <Label style={styles.heavy}>{kinds.filter(k => k === kind).length}</Label>
  </View>)}</View>;
}
/** Private photos never use a made-up scale drawing when the URL or native image fails. */
export function StoredPhoto({ path, label, height = 170, enlarge = false, caption }: { path: string; label: string; height?: number; enlarge?: boolean; caption?: string }) {
  const photo = useSignedPhoto(path); const f = useDriverFormat(); const [failed, setFailed] = useState(false); const [big, setBig] = useState(false);
  if (photo.isPending) return <Skeleton height={height} radius={16} />;
  if (!photo.data || failed) return <ErrorState onRetry={() => { setFailed(false); void photo.refetch(); }} />;
  const uri = photo.data;
  return <View style={{ gap: 8 }}>
    <Pressable disabled={!enlarge} accessibilityRole={enlarge ? 'button' : 'image'} accessibilityLabel={label} onPress={() => setBig(true)}>
      <Image source={{ uri }} accessibilityLabel={label} onError={() => setFailed(true)} style={{ width: '100%', height, borderRadius: 16 }} />
      {enlarge ? <View style={{ position: 'absolute', bottom: 10, start: 10 }}><Pill icon="magnifying-glass-plus">{f.t.tapEnlarge}</Pill></View> : null}
    </Pressable><Muted>{label}</Muted>
    {big ? <Modal onRequestClose={() => setBig(false)} animationType="fade"><SafeAreaView style={{ flex: 1, backgroundColor: f.colors.navy, direction: f.language === 'ar' ? 'rtl' : 'ltr' }}>
      <View style={[styles.row, { padding: 16 }]}><IconButton icon="x" label={f.t.close} onPress={() => setBig(false)} /><Label style={{ color: f.colors.onPrimary }}>{label}</Label></View>
      <Image source={{ uri }} resizeMode="contain" style={{ flex: 1, width: '100%' }} />
      {caption ? <Label style={{ padding: 20, color: f.colors.onPrimary }}>{caption}</Label> : null}
    </SafeAreaView></Modal> : null}
  </View>;
}
export async function openDeviceUrl(url: string, onError: () => void) { try { await Linking.openURL(url); } catch { onError(); } }
