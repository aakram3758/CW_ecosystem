import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useAuth } from '@/providers/auth';
import { usePreferences } from '@/providers/preferences';
import { Button, Card, ErrorLine, Label, Screen, Sheet, Title, Segmented, Motion, press } from './visual';
import { Icon } from './icons';
import { DistrictHeader } from './home';
import { errorMessage } from '@/data/errors';
import { interpolate } from '@/i18n/copy';
const navy = '#0B2340', gold = '#E8CE84', white = '#FFFFFF', logoutRed = '#B3382C', successGreen = '#46C489', successRed = '#F49A90', successLine = 'rgba(255,255,255,.07)', successGoldLine = 'rgba(232,206,132,.2)', successWhite = 'rgba(255,255,255,.82)', successNote = 'rgba(255,255,255,.08)', successTrack = 'rgba(255,255,255,.14)';
const successRings = { full: 'rgba(70,196,137,.18)', partial: 'rgba(232,206,132,.18)', failed: 'rgba(244,154,144,.18)' };
import { useDriver } from './state';
import { groupStops, stopState } from './model';
import { EmptyState, ErrorState, BottomNav, LoadingCards, Muted, OpsButton, PageFrame, Pill, StopCard, Tile, styles, useDriverFormat } from './shared';

export function NextPlanScreen() {
  const data = useDriver(); const f = useDriverFormat(); const plan = data.next.data;
  return <PageFrame title={f.t.upTitle} trailing={<Pill icon="lock-simple" iconSize={16} height={32} radius={10} padding={12}>{f.t.viewOnly}</Pill>} footer={<BottomNav />} contentStyle={data.next.isPending || data.next.isError || !plan ? { padding: 16, gap: 12 } : { paddingBottom: 32, gap: 16 }}>
    {data.next.isPending ? <LoadingCards /> : data.next.isError ? <ErrorState onRetry={() => void data.next.refetch()} /> : !plan ?
      <EmptyState icon="calendar-blank" title={f.t.upEmpty} body={f.t.upEmptySub} /> : <>
        <Card style={[styles.card, styles.row, { borderRadius: 20, padding: 16, gap: 14 }]}><Tile icon="calendar-check" size={56} radius={18} iconSize={30} color={f.colors.success} background={f.colors.successSoft} />
          <View style={[styles.grow, { gap: 2 }]}><Title style={styles.h2}>{f.date(plan.day, true)}</Title>
            <Label style={[styles.bold, { fontSize: 15 }]}>{interpolate(f.t.daySummary, { n: plan.rows.length })} · {interpolate(f.t.inDistricts, { n: groupStops(plan.rows, f.language).length })}</Label>
            {/* No approval row means ops assigned these some other way: no time to state, and
                "approved" with nothing after it would be a sentence the data does not support. */}
            {plan.approvedAt ? <Muted style={{ fontSize: 13 }}>{interpolate(f.t.approvedAt, { when: f.stamp(plan.approvedAt) })}</Muted> : null}</View>
          {plan.approvedAt ? <Pill weight={800} color={f.colors.success} background={f.colors.successSoft}>{f.t.approved}</Pill> : null}
        </Card>
        {groupStops(plan.rows, f.language).map(group => <View key={group.id} style={{ gap: 10 }}>
          <DistrictHeader name={group.name} count={group.rows.length} />
          {group.rows.map(row => <StopCard key={row.id} row={row} readOnly />)}</View>)}
      </>}
  </PageFrame>;
}

export function NotificationsScreen() {
  const data = useDriver(); const f = useDriverFormat(); const mark = data.markAllRead;
  useEffect(() => { mark(); }, [mark]);
  return <PageFrame title={f.t.notifTitle} onBack={data.back} contentStyle={{ paddingBottom: 16, gap: 10 }}>
    {data.notifications.isPending ? <LoadingCards /> : data.notifications.isError ? <ErrorState onRetry={() => void data.notifications.refetch()} />
      : !data.notifications.data?.length ? <EmptyState icon="bell" title={f.t.notifEmpty} body={f.t.notifEmptySub} />
        : data.notifications.data.map(n => {
          const changed = n.kind === 'plan_changed' || n.kind === 'plan_updated';
          const plan = n.kind.startsWith('plan_'); const stop = data.rows.find(r => r.id === n.request_id);
          const contents = <Card style={[styles.card, styles.row, { borderWidth: 1.5, borderColor: n.read_at ? 'transparent' : f.colors.primary, alignItems: 'flex-start' }]}>
            <Tile icon={changed ? 'bell-ringing' : plan ? 'calendar-check' : 'clipboard-text'} size={48} radius={15} iconSize={26} color={changed ? f.colors.accent : plan ? f.colors.success : f.colors.primary} background={changed ? f.colors.accentSoft : plan ? f.colors.successSoft : f.colors.primarySoft} /><View style={[styles.grow, { gap: 3 }]}><View style={[styles.row, { justifyContent: 'space-between', gap: 8 }]}><Title style={{ fontSize: 16, flexShrink: 1 }}>{f.local(n.title_ar, n.title_en)}</Title><Muted style={[styles.bold, { fontSize: 13 }]}>{f.time(n.created_at)}</Muted></View><Muted style={{ fontSize: 14 }}>{f.local(n.body_ar, n.body_en)}</Muted>
            </View>{!n.read_at ? <View accessible accessibilityLabel={f.t.unread} style={{ width: 10, height: 10, marginTop: 6, borderRadius: 5, backgroundColor: f.colors.danger }} /> : null}</Card>;
          return plan || stop ? <Pressable key={n.id} accessibilityRole="button" style={press} onPress={() => plan ? data.setPage('plan') : data.openStop(stop!.id!, 'notifications')}>{contents}</Pressable>
            : <View key={n.id}>{contents}</View>;
        })}
    {data.readError ? <ErrorState onRetry={() => mark()} /> : null}
  </PageFrame>;
}

export function AccountScreen() {
  const data = useDriver(); const f = useDriverFormat(); const { copy } = usePreferences(); const auth = useAuth();
  const [logout, setLogout] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  const driver = data.context.driver; const name = f.local(driver.full_name, driver.full_name_en);
  async function leave() { setBusy(true); setError(null); try { await auth.signOut(); } catch (error) { setError(error); setBusy(false); } }
  return <PageFrame title={f.t.accTitle} footer={<BottomNav />} contentStyle={{ paddingBottom: 32 }}>
    <Card style={{ padding: 16, borderRadius: 20 }}><View style={[styles.row, { gap: 14 }]}><View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: navy, alignItems: 'center', justifyContent: 'center' }}><Title style={{ fontSize: 26, color: gold }}>{name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</Title></View>
      <View style={[styles.grow, { gap: 2 }]}><Title style={{ fontSize: 20 }}>{name}</Title>{driver.materials ? <View style={[styles.row, { gap: 6 }]}><Icon name="truck" size={18} color={f.colors.muted} /><Muted style={[styles.bold, { fontSize: 14, flexShrink: 1 }]}>{interpolate(f.t.truckLine, { material: f.local(driver.materials.name_ar, driver.materials.name_en) })}</Muted></View> : null}</View></View>
      <View style={[styles.row, { gap: 10 }]}><View style={[styles.grow, { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: f.colors.surface2 }]}><Muted style={[styles.bold, { fontSize: 13 }]}>{f.t.mobileLabel}</Muted><Title style={{ fontSize: 15 }}>{f.phone(driver.phone)}</Title></View>{driver.cities ? <View style={[styles.grow, { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: f.colors.surface2 }]}><Muted style={[styles.bold, { fontSize: 13 }]}>{f.t.cityLabel}</Muted><Title style={{ fontSize: 15 }}>{f.local(driver.cities.name_ar, driver.cities.name_en)}</Title></View> : null}</View>
    </Card>
    <DriverPreferences />
    <Card style={{ borderRadius: 20, padding: 0, gap: 0, overflow: 'hidden' }}><AccountAction icon="password" label={f.t.changePw} onPress={() => data.setPage('pwd')} />{data.context.opsPhone ? <AccountAction icon="headset" label={f.t.contactOps} onPress={data.openOps} /> : null}<AccountAction icon="sign-out" label={f.t.logout} danger onPress={() => setLogout(true)} /></Card>
    <Muted style={{ textAlign: 'center', fontSize: 13 }}>{f.t.version}</Muted>
    {logout ? <Sheet onClose={() => { if (!busy) setLogout(false); }}><View style={[styles.row, { gap: 14 }]}><Tile icon="sign-out" size={56} radius={18} iconSize={30} color={f.colors.dangerText} background={f.colors.dangerSoft} /><View style={styles.grow}><Title style={{ fontSize: 20 }}>{f.t.logoutQ}</Title><Muted>{f.t.logoutBody}</Muted></View></View>
      {error ? <ErrorLine>{errorMessage(error, copy, 'driver')}</ErrorLine> : null}
      <Button textColor={white} fontSize={18} style={{ height: 58, borderRadius: 16, backgroundColor: logoutRed }} busy={busy} disabled={busy} label={f.t.logout} onPress={() => void leave()} /><Button tone="outline" disabled={busy} style={{ height: 52, borderRadius: 16, backgroundColor: 'transparent' }} label={f.t.cancel} onPress={() => setLogout(false)} /></Sheet> : null}
  </PageFrame>;
}
function AccountAction({ icon, label, danger, onPress }: { icon: string; label: string; danger?: boolean; onPress: () => void }) {
  const { colors } = usePreferences(); return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.row, { minHeight: 60, paddingHorizontal: 16, borderBottomWidth: danger ? 0 : 1, borderBottomColor: colors.line }]}><Icon name={icon} color={danger ? colors.dangerText : colors.primary} /><Title style={[styles.grow, { fontSize: 16, color: danger ? colors.dangerText : colors.text }]}>{label}</Title>{!danger ? <Icon name="fwd" size={16} color={colors.muted} /> : null}</Pressable>;
}
function DriverPreferences() {
  const p = usePreferences(); const data = useDriver(); const t = p.copy.driver;
  const failed = () => data.showToast(t.errBody);
  return <Card style={{ borderRadius: 20, padding: 16, gap: 16 }}><View style={{ gap: 8 }}><View style={[styles.row, { gap: 8 }]}><Icon name="translate" size={20} /><Title style={{ fontSize: 15 }}>{t.language}</Title></View><Segmented label={t.language} value={p.language} height={48} onChange={v => void p.setLanguage(v).catch(failed)} options={[{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }]} /></View>
    <View style={{ gap: 8 }}><View style={[styles.row, { gap: 8 }]}><Icon name="palette" size={20} /><Title style={{ fontSize: 15 }}>{t.theme}</Title></View><Segmented label={t.theme} value={p.themeChoice} height={48} fontSize={14} onChange={v => void p.setTheme(v).catch(failed)} options={[{ value: 'light', label: t.light, icon: 'sun' }, { value: 'dark', label: t.dark, icon: 'moon' }, { value: 'system', label: t.system, icon: 'circle-half' }]} /></View></Card>;
}

export function SuccessScreen() {
  const data = useDriver(); const f = useDriverFormat(); const last = data.last;
  if (!last) return <PageFrame title={f.t.todayProgress} onBack={data.back} />;
  const kinds = data.rows.map(r => stopState(r, data.today)); const done = kinds.filter(k => k !== 'todo').length;
  const color = last.kind === 'full' ? successGreen : last.kind === 'partial' ? gold : successRed;
  return <Screen topInset={false} safeColor={navy} contentStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 0, paddingBottom: 30, gap: 6, backgroundColor: navy }}>
    <View accessible={false} style={{ position: 'absolute', width: 340, height: 340, borderRadius: 170, borderWidth: 1, borderColor: successLine, top: -120, left: -130 }} />
    <View accessible={false} style={{ position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: successGoldLine, bottom: 120, right: -90 }} />
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <Motion kind="pop" style={{ width: 136, height: 136, borderRadius: 68, backgroundColor: successRings[last.kind], alignItems: 'center', justifyContent: 'center' }}>
        <Tile icon="check" size={98} radius={49} iconSize={52} color={navy} background={color} /></Motion>
      <Title style={{ fontSize: 28, lineHeight: 36.4, textAlign: 'center', color: white }}>{last.kind === 'full' ? f.t.sFullTitle : last.kind === 'partial' ? f.t.sPartialTitle : f.t.sFailedTitle}</Title>
      <Label style={{ fontFamily: 'Tajawal_500Medium', fontSize: 17, lineHeight: 23.8, color: successWhite, textAlign: 'center' }}>{f.title(last.row)} · {f.material(last.row)}</Label>
      {last.kind !== 'full' ? <View style={[styles.row, { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, gap: 8, backgroundColor: successNote }]}>
        <Icon name="info" color={gold} size={20} /><Label style={[styles.grow, styles.bold, { fontSize: 15, color: gold }]}>{last.kind === 'partial' ? f.t.sPartialSub : f.t.sFailedSub}</Label></View> : null}
      {data.day.isError ? <Card style={styles.card}><ErrorState onRetry={() => void data.day.refetch()} /></Card> : <View style={{ width: '100%', gap: 8, marginTop: 18 }}>
        <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}><Label style={[styles.bold, { fontSize: 15, color: successWhite }]}>{f.t.todayProgress}</Label>
          <Label style={[styles.heavy, { fontSize: 15, color: white }]}>{interpolate(f.t.visitsOf, { x: done, n: data.rows.length })}</Label></View>
        <View style={{ height: 10, borderRadius: 9, backgroundColor: successTrack }}><View style={{ height: 10, borderRadius: 9, backgroundColor: gold, width: `${data.rows.length ? done / data.rows.length * 100 : 100}%` }} /></View>
        {!data.suggestion ? <Label style={[styles.heavy, { fontSize: 15, color: successGreen }]}>{f.t.lastDone}</Label> : null}
      </View>}
    </View>
    {/* The canvas's nextLabel (1415): the next stop while one is left, home after the last. A day
        that failed to reload has no next stop to name, so it goes back to the plan instead. */}
    <Button cwPress fontSize={18} endIcon="fwd" tone="gold" label={data.day.isError ? f.t.toPlan : data.suggestion ? f.t.next : f.t.backHome}
      style={{ height: 60, borderRadius: 18, gap: 10, backgroundColor: gold }}
      onPress={() => data.day.isError ? data.setPage('plan') : data.suggestion ? data.openStop(data.suggestion.row.id!, 'plan') : data.setPage('home')} />
    <Pressable accessibilityRole="button" onPress={() => data.setPage('home')} style={{ minHeight: 50, alignItems: 'center', justifyContent: 'center' }}>
      <Label style={[styles.bold, { color: white, fontSize: 16 }]}>{f.t.backHome}</Label></Pressable>
  </Screen>;
}
