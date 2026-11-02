import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useAuth } from '@/providers/auth';
import { usePreferences } from '@/providers/preferences';
import { Button, Card, EmptyState, ErrorLine, ErrorState, Icon, Label, PreferencesControls, Screen, Sheet, Title } from '@/ui/components';
import { errorMessage } from '@/data/errors';
import { interpolate } from '@/i18n/copy';
import { branchArtwork, palette, softFill } from '@/ui/tokens';
import { useDriver } from './state';
import { groupStops, stopState } from './model';
import { BottomNav, LoadingCards, Muted, OpsButton, PageFrame, Pill, StopCard, Tile, styles, useDriverFormat } from './shared';

export function NextPlanScreen() {
  const data = useDriver(); const f = useDriverFormat(); const plan = data.next.data;
  return <PageFrame title={f.t.upTitle} trailing={<Pill icon="lock">{f.t.viewOnly}</Pill>} footer={<BottomNav />}>
    {data.next.isPending ? <LoadingCards /> : data.next.isError ? <ErrorState onRetry={() => void data.next.refetch()} /> : !plan ?
      <EmptyState icon="calendar-x" title={f.t.upEmpty} body={f.t.upEmptySub} /> : <>
        <Card style={[styles.card, styles.row, { borderRadius: 20, padding: 16 }]}><Tile icon="calendar-check" size={56} radius={18} color={f.colors.success} background={f.colors.successSoft} />
          <View style={styles.grow}><Title style={styles.h2}>{f.date(plan.day, true)}</Title>
            <Label>{interpolate(f.t.daySummary, { n: plan.rows.length })} · {interpolate(f.t.inDistricts, { n: groupStops(plan.rows, f.language).length })}</Label>
            {/* No approval row means ops assigned these some other way: no time to state, and
                "approved" with nothing after it would be a sentence the data does not support. */}
            {plan.approvedAt ? <Muted>{interpolate(f.t.approvedAt, { when: f.stamp(plan.approvedAt) })}</Muted> : null}</View>
          {plan.approvedAt ? <Pill color={f.colors.success} background={f.colors.successSoft}>{f.t.approved}</Pill> : null}
        </Card>
        {groupStops(plan.rows, f.language).map(group => <View key={group.id} style={{ gap: 10 }}>
          <View style={styles.row}><Icon name="pin" /><Title style={styles.h2}>{group.name}</Title><Pill>{group.rows.length}</Pill></View>
          {group.rows.map(row => <StopCard key={row.id} row={row} readOnly />)}</View>)}
      </>}
  </PageFrame>;
}

export function NotificationsScreen() {
  const data = useDriver(); const f = useDriverFormat(); const mark = data.markAllRead;
  useEffect(() => { mark(); }, [mark]);
  return <PageFrame title={f.t.notifTitle} onBack={data.back}>
    {data.notifications.isPending ? <LoadingCards /> : data.notifications.isError ? <ErrorState onRetry={() => void data.notifications.refetch()} />
      : !data.notifications.data?.length ? <EmptyState icon="bell" title={f.t.notifEmpty} body={f.t.notifEmptySub} />
        : data.notifications.data.map(n => {
          const plan = n.kind.startsWith('plan_'); const stop = data.rows.find(r => r.id === n.request_id);
          const contents = <Card style={[styles.card, styles.row, { borderWidth: 1.5, borderColor: n.read_at ? 'transparent' : f.colors.primary, alignItems: 'flex-start' }]}>
            <Tile icon={plan ? 'calendar-check' : 'bell'} size={48} /><View style={styles.grow}>
              <Title style={{ fontSize: 16 }}>{f.local(n.title_ar, n.title_en)}</Title><Muted>{f.local(n.body_ar, n.body_en)}</Muted><Muted style={{ fontSize: 13 }}>{f.stamp(n.created_at)}</Muted>
            </View>{!n.read_at ? <View accessible accessibilityLabel={f.t.unread} style={{ width: 10, height: 10, marginTop: 6, borderRadius: 5, backgroundColor: f.colors.danger }} /> : null}</Card>;
          return plan || stop ? <Pressable key={n.id} accessibilityRole="button" onPress={() => plan ? data.setPage('plan') : data.openStop(stop!.id!, 'notifications')}>{contents}</Pressable>
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
  return <PageFrame title={f.t.accTitle} footer={<BottomNav />}>
    <Card style={[styles.card, { padding: 16, borderRadius: 20 }]}><View style={[styles.row, { gap: 14 }]}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: f.colors.navy, alignItems: 'center', justifyContent: 'center' }}>
        <Label style={[styles.heavy, { fontSize: 26, color: f.colors.gold }]}>{name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</Label></View>
      <View style={styles.grow}><Title style={{ fontSize: 20 }}>{name}</Title>
        {driver.materials ? <Muted>{interpolate(f.t.truckLine, { material: f.local(driver.materials.name_ar, driver.materials.name_en) })}</Muted> : null}</View></View>
      <View style={styles.row}><View style={[styles.grow, { padding: 12, borderRadius: 14, backgroundColor: f.colors.surface2 }]}>
        <Icon name="device-mobile" size={20} /><Muted>{f.t.mobileLabel}</Muted><Label style={styles.heavy}>{f.phone(driver.phone)}</Label></View>
        {driver.cities ? <View style={[styles.grow, { padding: 12, borderRadius: 14, backgroundColor: f.colors.surface2 }]}><Muted>{f.t.cityLabel}</Muted>
          <Label style={styles.heavy}>{f.local(driver.cities.name_ar, driver.cities.name_en)}</Label></View> : null}</View>
    </Card>
    <Card style={[styles.card, { padding: 16, borderRadius: 20 }]}><PreferencesControls variant="branch" /></Card>
    <Card style={[styles.card, { borderRadius: 20 }]}><Button variant="branch" tone="muted" icon="key" label={f.t.changePw} onPress={() => data.setPage('pwd')} />
      <OpsButton /><Button variant="branch" tone="text" icon="out" label={f.t.logout} onPress={() => setLogout(true)} /></Card>
    <Muted style={{ textAlign: 'center', fontSize: 13 }}>{f.t.version}</Muted>
    {logout ? <Sheet onClose={() => { if (!busy) setLogout(false); }}><View style={styles.row}><Tile icon="out" size={56} color={f.colors.dangerText} background={f.colors.dangerSoft} />
      <View style={styles.grow}><Title style={{ fontSize: 20 }}>{f.t.logoutQ}</Title><Muted>{f.t.logoutBody}</Muted></View></View>
      {error ? <ErrorLine>{errorMessage(error, copy, 'driver')}</ErrorLine> : null}
      <Button variant="branch" tone="danger" busy={busy} disabled={busy} label={f.t.logout} onPress={() => void leave()} />
      <Button variant="branch" tone="outline" disabled={busy} label={f.t.cancel} onPress={() => setLogout(false)} /></Sheet> : null}
  </PageFrame>;
}

export function SuccessScreen() {
  const data = useDriver(); const f = useDriverFormat(); const last = data.last;
  if (!last) return <PageFrame title={f.t.todayProgress} onBack={data.back} />;
  const kinds = data.rows.map(r => stopState(r, data.today)); const done = kinds.filter(k => k !== 'todo').length;
  const color = last.kind === 'full' ? palette.dark.success : last.kind === 'partial' ? palette.dark.accent : palette.dark.dangerText;
  return <Screen safeColor={f.colors.navy} contentStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 0, paddingBottom: 30, gap: 6, backgroundColor: f.colors.navy }}>
    <View accessible={false} style={{ position: 'absolute', width: 340, height: 340, borderRadius: 170, borderWidth: 1, borderColor: branchArtwork.heroLine, top: -120, left: -130 }} />
    <View accessible={false} style={{ position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: branchArtwork.heroGoldLine, bottom: 120, right: -90 }} />
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: 24 }}>
      <View style={{ width: 136, height: 136, borderRadius: 68, backgroundColor: softFill(color), alignItems: 'center', justifyContent: 'center' }}>
        <Tile icon="check" size={98} radius={49} iconSize={52} color={f.colors.navy} background={color} /></View>
      <Title style={{ fontSize: 28, lineHeight: 36.4, textAlign: 'center', color: f.colors.onPrimary }}>{last.kind === 'full' ? f.t.sFullTitle : last.kind === 'partial' ? f.t.sPartialTitle : f.t.sFailedTitle}</Title>
      <Label style={{ fontSize: 17, lineHeight: 23.8, color: f.colors.onPrimary, opacity: .82, textAlign: 'center' }}>{f.title(last.row)} · {f.material(last.row)}</Label>
      {last.kind !== 'full' ? <View style={[styles.row, { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: branchArtwork.heroTile }]}>
        <Icon name="info" color={f.colors.gold} size={20} /><Label style={[styles.grow, styles.bold, { color: f.colors.gold }]}>{last.kind === 'partial' ? f.t.sPartialSub : f.t.sFailedSub}</Label></View> : null}
      {data.day.isError ? <Card style={styles.card}><ErrorState onRetry={() => void data.day.refetch()} /></Card> : <View style={{ width: '100%', gap: 8, marginTop: 18 }}>
        <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}><Label style={{ color: f.colors.onPrimary, opacity: .82 }}>{f.t.todayProgress}</Label>
          <Label style={[styles.heavy, { color: f.colors.onPrimary }]}>{interpolate(f.t.visitsOf, { x: done, n: data.rows.length })}</Label></View>
        <View style={{ height: 10, borderRadius: 9, backgroundColor: branchArtwork.heroTile }}><View style={{ height: 10, borderRadius: 9, backgroundColor: f.colors.gold, width: `${data.rows.length ? done / data.rows.length * 100 : 100}%` }} /></View>
        {!data.suggestion ? <Label style={[styles.heavy, { color: palette.dark.success }]}>{f.t.lastDone}</Label> : null}
      </View>}
    </View>
    {/* The canvas's nextLabel: the next stop while one is left, home after the last (1415). A day
        that failed to reload has no next stop to name, so it goes back to the plan instead. */}
    <Button variant="branch" tone="gold" label={data.day.isError ? f.t.toPlan : data.suggestion ? f.t.next : f.t.backHome}
      style={{ minHeight: 60, borderRadius: 18 }}
      onPress={() => data.day.isError ? data.setPage('plan') : data.suggestion ? data.openStop(data.suggestion.row.id!, 'plan') : data.setPage('home')} />
    <Pressable accessibilityRole="button" onPress={() => data.setPage('home')} style={{ minHeight: 50, alignItems: 'center', justifyContent: 'center' }}>
      <Label style={[styles.bold, { color: f.colors.onPrimary, fontSize: 16 }]}>{f.t.backHome}</Label></Pressable>
  </Screen>;
}
