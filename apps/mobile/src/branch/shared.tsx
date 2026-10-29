import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect, Text as SvgText } from 'react-native-svg';
import type { MaterialRow, RequestListRow } from '@/data/mock/branch';
import { interpolate, ltr } from '@/i18n/copy';
import { usePreferences } from '@/providers/preferences';
import { Button, Card, Icon, Label, Screen, Sheet, Title } from '@/ui/components';
import { materialIcon } from '@/ui/icons';
import { branchArtwork, materialSoft, minTouch, softFill } from '@/ui/tokens';
import { useBranch } from './state';

export const styles = StyleSheet.create({
  body: { padding: 16, paddingTop: 8, paddingBottom: 28, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  card: { borderRadius: 18, padding: 16, gap: 12 },
  h1: { fontSize: 24, lineHeight: 32.4 },
  h2: { fontSize: 18, lineHeight: 24.3 },
  bold: { fontFamily: 'Tajawal_700Bold' },
  heavy: { fontFamily: 'Tajawal_800ExtraBold' },
});
export function useBranchFormat() {
  const { language, copy, theme, colors } = usePreferences();
  const t = copy.branch;
  const locale = language === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB';
  const date = (value: string | null, long = false) => value ? new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Riyadh', day: 'numeric', month: 'short', ...(long ? { weekday: 'long' as const } : {}),
  }).format(new Date(value.length === 10 ? `${value}T12:00:00+03:00` : value)) : t.notSet;
  const stamp = (value: string | null) => value ? `${date(value)} · ${new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Riyadh', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(value))}` : '';
  const name = (row: { name_ar: string; name_en: string }) => language === 'ar' ? row.name_ar : row.name_en;
  const requestName = (row: RequestListRow) => [language === 'ar' ? row.material_name_ar : row.material_name_en,
    language === 'ar' ? row.subtype_name_ar : row.subtype_name_en].filter(Boolean).join(' · ');
  const kg = (value: number | null) => `${(value ?? 0).toLocaleString('en-US')} ${t.kgUnit}`;
  // Isolated, not merely right-styled: a phone number is digits and a '+' in an Arabic
  // paragraph, which the bidi algorithm will happily reverse. See `ltr`.
  const phone = (value: string | null) => value?.startsWith('05')
    ? ltr(`${copy.shared.phonePrefix} ${value.slice(1, 3)} ${value.slice(3, 6)} ${value.slice(6)}`) : value ?? '';
  const materialStyle = (m: MaterialRow) => ({ color: theme === 'dark' ? m.color_dark : m.color_light,
    background: materialSoft[theme][m.code as keyof typeof materialSoft.light] ?? colors.surface2,
    icon: materialIcon[m.icon] ?? 'box' });
  const status = (row: RequestListRow) => {
    switch (row.status) {
      case 'scheduled': return { label: interpolate(t.st_sched, { d: date(row.visit_day, true) }), icon: 'cal', color: colors.link, background: colors.primarySoft };
      case 'needs_decision': return { label: t.st_dec, icon: 'headset', color: colors.warning, background: colors.warningSoft };
      case 'completed': return { label: t.st_done, icon: 'seal', color: colors.success, background: colors.successSoft };
      case 'closed': return { label: t.st_closed, icon: 'lock', color: colors.muted, background: colors.surface2 };
      case 'cancelled': return { label: t.st_cancel, icon: 'x', color: colors.muted, background: colors.surface2 };
      default: return { label: t.st_await, icon: 'clock', color: colors.muted, background: colors.surface2 };
    }
  };
  return { t, colors, language, name, date, stamp, requestName, kg, phone, materialStyle, status };
}
export function Muted({ children, style }: PropsWithChildren<{ style?: React.ComponentProps<typeof Label>['style'] }>) {
  const { colors } = usePreferences();
  return <Label style={[{ color: colors.muted, fontSize: 14, lineHeight: 23.1 }, style]}>{children}</Label>;
}
export function Tile({ icon, color, background, size = 44, iconSize = 24 }: {
  icon: string; color?: string; background?: string; size?: number; iconSize?: number;
}) {
  const { colors } = usePreferences();
  return <View style={{ width: size, height: size, borderRadius: size === 44 ? 13 : 16,
    backgroundColor: background ?? colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
    <Icon name={icon} size={iconSize} color={color ?? colors.primary} tint={color ? `${color}33` : undefined} />
  </View>;
}
export function IconButton({ icon, label, onPress, style }: { icon: string; label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { colors } = usePreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={[{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surface2,
      alignItems: 'center', justifyContent: 'center' }, style]}><Icon name={icon} color={colors.text} /></Pressable>;
}
export function Pill({ children, color, background, icon }: PropsWithChildren<{ color?: string; background?: string; icon?: string }>) {
  const { colors } = usePreferences();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28,
    paddingVertical: 2, paddingHorizontal: 10, borderRadius: 999, alignSelf: 'flex-start',
    backgroundColor: background ?? colors.surface2, flexShrink: 1 }}>
    {icon ? <Icon name={icon} size={15} color={color ?? colors.muted} /> : null}
    <Label style={{ color: color ?? colors.muted, fontSize: 12.5, lineHeight: 16.25,
      fontFamily: 'Tajawal_700Bold', flexShrink: 1 }}>{children}</Label>
  </View>;
}
/**
 * Who to call, and about what. One of these is what `useBranch().contact` holds while the contact
 * sheet is open — the material's manager, or the operations team.
 */
export type ContactTarget = {
  title: string;
  body: string;
  /** Raw, as the database stores it: `05XXXXXXXX`, or a unified `9200XXXXX`. */
  phone: string;
  icon: string;
  color?: string;
  background?: string;
};

/**
 * The designed contact sheet, which until now was a native `Alert.alert` carrying the number as
 * text — the prototype could not dial, so it printed `dialToast` instead ("in the app this button
 * opens the call directly"), and we copied the apology rather than the button. This is the button.
 *
 * From the canvas, top to bottom inside `Sheet`:
 * - a row, `gap: 12`: a `Tile` 52 / icon 28 / `borderRadius: 16` in the target's own colours, then
 *   the title as `styles.h2` on `styles.grow`;
 * - the body as a `Label` at 13.5 / lineHeight 21.6 in `colors.text` — the canvas's `.sub` but
 *   recoloured to text, not muted;
 * - the number row: `direction: 'ltr'`, `backgroundColor: colors.surface2`, `borderRadius: 14`,
 *   `paddingStart: 14`, `paddingEnd: 6`, `paddingVertical: 6`, `minHeight: 56`, the number pushed
 *   apart from the copy button (`justifyContent: 'space-between'`). The number is Tajawal_800ExtraBold
 *   20 with `letterSpacing: .6` (the canvas's .03em of 20px) and `selectable` so it can be picked up
 *   by hand too. The copy button is a 44-high `colors.surface` tile, `borderRadius: 10`,
 *   `paddingHorizontal: 12`, holding an 18px `copy` icon and `t.copy` in `colors.link` — and it says
 *   `t.copied` for two seconds after a copy, which is the canvas's own `sh.copyLabel` switch.
 * - the two actions, side by side in a row with `gap: 10`, each `flex: 1`: `t.call` as the primary
 *   branch button with the `phone` icon, and `t.whatsapp` as a `tone="muted"` one with the `chat`
 *   icon in `colors.success`.
 *
 * Two departures from the canvas, both because this sheet now does the thing instead of describing
 * it:
 * - **WhatsApp only for a mobile.** `materials.contact_phone` accepts a unified `9200XXXXX` number,
 *   which has no WhatsApp account, and the standing rule for this app is that a button that cannot
 *   work is not drawn. So the row holds both buttons for an `05…` number and only `t.call`, full
 *   width, for anything else.
 * - **`dialToast` is not used.** It is a prototype-only string; the buttons open the dialer and
 *   WhatsApp for real, through `Linking`. Neither places a call or sends a message on its own — the
 *   dialer opens with the number filled in and waits for the person.
 *
 * `tel:` takes the number as stored. `wa.me` takes it international with no punctuation, so an
 * `05…` number becomes `966` + the nine digits after the leading zero.
 */
export function ContactSheet({ target, onClose }: { target: ContactTarget; onClose: () => void }): ReactNode {
  const f = useBranchFormat();
  const { t, colors } = f;
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; if (timer.current) clearTimeout(timer.current); };
  }, []);
  // Nothing here is announced when it fails, and that is a decision rather than an oversight. The
  // three ways out of this sheet — the clipboard, the dialer, WhatsApp — are the device's to
  // refuse, and **no designed copy exists for any of them**: the canvas never dialled, so it never
  // had to say so. The nearest keys we have are about loading data, and «تعذّر تحميل البيانات» over
  // a dialer that would not open is a worse answer than none. If Ahmed finds a tap that does
  // nothing on a real phone, that is when the sentence gets written and added here.
  async function copyNumber() {
    try {
      await Clipboard.setStringAsync(target.phone);
      if (!active.current) return;
      if (timer.current) clearTimeout(timer.current);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch { /* see above */ }
  }
  const open = (url: string) => () => void Linking.openURL(url).catch(() => {});
  const mobile = target.phone.startsWith('05');
  return <Sheet onClose={onClose}>
    <View style={styles.row}>
      <Tile icon={target.icon} color={target.color ?? colors.primary} background={target.background ?? colors.primarySoft} size={52} iconSize={28} />
      <Title style={[styles.h2, styles.grow]}>{target.title}</Title>
    </View>
    <Label style={{ fontSize: 13.5, lineHeight: 21.6 }}>{target.body}</Label>
    <View style={{ direction: 'ltr', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, backgroundColor: colors.surface2, borderRadius: 14, paddingStart: 14, paddingEnd: 6, paddingVertical: 6, minHeight: 56 }}>
      <Label selectable style={[styles.heavy, { fontSize: 20, letterSpacing: .6, flexShrink: 1 }]}>
        {mobile ? f.phone(target.phone) : ltr(target.phone)}
      </Label>
      <Pressable accessibilityRole="button" onPress={() => void copyNumber()}
        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
          backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12 }}>
        <Icon name="copy" size={18} color={colors.link} tint={softFill(colors.link)} />
        <Label accessibilityLiveRegion="polite" style={[styles.bold, { fontSize: 14, color: colors.link }]}>{copied ? t.copied : t.copy}</Label>
      </Pressable>
    </View>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Button variant="branch" icon="phone" label={t.call} style={{ flex: 1 }} onPress={open(`tel:${target.phone}`)} />
      {/* Not a `Button`: this one is `colors.surface2` carrying `colors.success` on both its icon
          and its label, and the branch variant's tones each fix their own foreground. One
          hand-rolled button beside a real one is the smaller cost — every value here is the
          branch variant's own, so the two stay the same shape. */}
      {mobile ? <Pressable accessibilityRole="button" onPress={open(`https://wa.me/966${target.phone.slice(1)}`)}
        style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 14, paddingHorizontal: 16,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface2, opacity: pressed ? .78 : 1 })}>
        <Icon name="chat" color={colors.success} tint={softFill(colors.success)} />
        <Label style={[styles.heavy, { fontSize: 16, textAlign: 'center', color: colors.success }]}>{t.whatsapp}</Label>
      </Pressable> : null}
    </View>
  </Sheet>;
}

export function Header({ title, onBack, trailing }: { title: string; onBack?: () => void; trailing?: ReactNode }) {
  const { language, copy } = usePreferences();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
    {onBack ? <IconButton icon={language === 'ar' ? 'caretR' : 'caretL'} label={copy.branch.back} onPress={onBack} /> : <View style={{ width: 48 }} />}
    <Title style={[styles.h2, styles.grow, { textAlign: 'center', lineHeight: 23.4 }]}>{title}</Title>
    {/* 48 wide when it holds an icon button, so it balances the back button and leaves the title
        centred — but only a minimum. The location screen puts the «مرة واحدة» pill here, and in a
        48px box it wrapped into a circle. The canvas's header is a grid whose end column the pill
        simply overflows; this is the same intent without relying on overflow. */}
    <View style={{ minWidth: 48, alignItems: 'flex-end', justifyContent: 'center' }}>{trailing}</View>
  </View>;
}
export function Footer({ children }: PropsWithChildren) {
  const { colors } = usePreferences();
  return <View style={{ padding: 16, paddingTop: 12, paddingBottom: 28, gap: 8, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.line }}>{children}</View>;
}
export function BottomNav() {
  const { page, navigate, notifications } = useBranch();
  const { t, colors } = useBranchFormat();
  const unread = notifications.filter(n => !n.read_at).length;
  return <View accessibilityLabel={t.navLabel} style={{ flexDirection: 'row', paddingHorizontal: 6,
    paddingTop: 8, paddingBottom: 22, minHeight: 88, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line }}>
    {([{ key: 'home', label: t.navHome, icon: 'house' }, { key: 'reqs', label: t.navReqs, icon: 'clip' },
      { key: 'notifs', label: t.navNotifs, icon: 'bell' }, { key: 'acc', label: t.navAcc, icon: 'user' }] as const).map(item => {
      const active = page === item.key;
      return <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.label}
        accessibilityState={{ selected: active }} onPress={() => navigate(item.key)}
        style={{ flex: 1, minHeight: minTouch, gap: 3, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
        <View style={{ width: 56, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
          backgroundColor: active ? colors.primarySoft : 'transparent' }}>
          <Icon name={item.icon} color={active ? colors.link : colors.muted} />
          {item.key === 'notifs' && unread > 0 ? <View style={{ position: 'absolute', top: -4, end: 6,
            minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 999, backgroundColor: colors.danger }}>
            <Label style={{ color: colors.onPrimary, fontSize: 11, lineHeight: 18, textAlign: 'center', fontFamily: 'Tajawal_800ExtraBold' }}>{unread}</Label>
          </View> : null}
        </View>
        <Label style={{ color: active ? colors.link : colors.muted, fontSize: 12, fontFamily: 'Tajawal_700Bold', textAlign: 'center' }}>{item.label}</Label>
      </Pressable>;
    })}
  </View>;
}
export function PageFrame({ title, children, onBack, footer, trailing, top }: PropsWithChildren<{
  title: string; onBack?: () => void; footer?: ReactNode; trailing?: ReactNode; top?: ReactNode;
}>) {
  return <Screen header={<><Header title={title} onBack={onBack} trailing={trailing} />{top}</>}
    footer={footer} contentStyle={styles.body}>{children}</Screen>;
}
export function RequestCard({ row }: { row: RequestListRow }) {
  const { openRequest, materials } = useBranch();
  const f = useBranchFormat();
  const material = materials.find(m => m.id === row.material_id);
  const st = f.status(row);
  return <Pressable accessibilityRole="button" onPress={() => row.id && openRequest(row.id)}>
    <Card style={[styles.card, styles.row, { paddingVertical: 12, paddingHorizontal: 14 }]}>
      {material ? <Tile {...{ ...f.materialStyle(material), icon: f.materialStyle(material).icon }} /> : null}
      <View style={[styles.grow, { gap: 6, alignItems: 'flex-start' }]}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Label style={[styles.heavy, { fontSize: 16 }]}>{f.requestName(row)}</Label>
          <Muted style={{ fontSize: 13 }}>{interpolate(f.t.no, { id: row.number ?? '' })} · {f.kg(row.kg)}</Muted>
        </View>
        <Pill color={st.color} background={st.background} icon={st.icon}>{st.label}</Pill>
      </View>
      <Icon name={f.language === 'ar' ? 'caretL' : 'caretR'} color={f.colors.muted} />
    </Card>
  </Pressable>;
}
export function Photo({ kg, material, size = 104 }: { kg: number; material: MaterialRow; size?: number }) {
  const { t, materialStyle } = useBranchFormat();
  const color = materialStyle(material).color;
  return <View accessible accessibilityRole="image" accessibilityLabel={t.branchPhoto} style={{ width: size, height: size, borderRadius: 16, overflow: 'hidden' }}>
    <Svg width={size} height={size} viewBox="0 0 104 104">
      <Defs><LinearGradient id="photo" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={branchArtwork.photoTop} /><Stop offset="1" stopColor={branchArtwork.photoBottom} /></LinearGradient></Defs>
      <Rect width="104" height="104" fill="url(#photo)" />
      <Rect x="12" y="60" width="80" height="34" rx="6" fill={color} opacity={.9} />
      <Rect x="18" y="34" width="68" height="26" rx="5" fill={color} opacity={.7} />
      <Rect x="14" y="12" width="76" height="24" rx="5" fill={branchArtwork.display} />
      <SvgText x="20" y="29" fill={branchArtwork.digits} fontSize="13" fontFamily="monospace">{`${kg.toFixed(1)} ${t.kgUnit}`}</SvgText>
    </Svg>
  </View>;
}
