import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { branchArtwork } from '@/ui/tokens';
import { Button, Card, EmptyState, ErrorState, Icon, Label, Screen, Segmented, Title } from '@/ui/components';
import { interpolate } from '@/i18n/copy';
import { useDriver } from './state';
import { groupStops, stopState } from './model';
import { BottomNav, ChangeBanner, IconButton, Legend, LoadingCards, Muted, OpsButton, PageFrame, Pill,
  ProgressRing, StopCard, Tile, styles, useDriverFormat } from './shared';

export function HomeScreen() {
  const data = useDriver(); const f = useDriverFormat(); const { t, colors } = f;
  const driver = data.context.driver;
  const name = f.local(driver.full_name, driver.full_name_en).trim().split(/\s+/)[0];
  const off = data.context.offToday; const noPlan = !data.rows.length;
  const kinds = [...data.rows.filter(r => stopState(r, data.today) !== 'todo')
    .sort((a, b) => (a.last_attempt_at ?? '').localeCompare(b.last_attempt_at ?? '')),
    ...data.rows.filter(r => stopState(r, data.today) === 'todo')].map(r => stopState(r, data.today));
  const done = kinds.filter(k => k !== 'todo').length;
  const groups = groupStops(data.rows, f.language);
  const loading = data.day.isPending; const error = data.day.isError || data.contextError;
  const head = error ? t.planTitle : off ? t.offHead : noPlan ? t.noPlanHead : interpolate(t.head, { n: data.rows.length });
  return <Screen safeColor={colors.navy} contentStyle={{ padding: 0, gap: 0, paddingBottom: 24 }} footer={<BottomNav />}>
    <View style={{ backgroundColor: colors.navy, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 84, borderBottomStartRadius: 32, borderBottomEndRadius: 32, gap: 22, overflow: 'hidden' }}>
      <View accessible={false} style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: branchArtwork.heroLine, left: -90, top: -60 }} />
      <View accessible={false} style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 1, borderColor: branchArtwork.heroGoldLine, right: -60, bottom: -40 }} />
      <View style={[styles.row, { justifyContent: 'space-between' }]}><Image source={require('../../assets/cw-logo.png')} accessible={false} resizeMode="contain" style={{ height: 32, width: 120 }} />
        <View style={styles.row}>{data.context.opsPhone ? <IconButton icon="headset" label={t.support} onPress={data.openOps} /> : null}
          <View><IconButton icon="bell" label={t.notifAria} onPress={() => data.setPage('notifications')} />
            {data.notifications.data?.some(n => !n.read_at) ? <View style={{ position: 'absolute', top: 9, end: 10, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.danger }} /> : null}</View>
        </View>
      </View>
      <View style={{ gap: 8 }}><Label style={[styles.bold, { fontSize: 16, color: colors.gold }]}>{interpolate(t.hi, { name })}{driver.materials ? ` · ${interpolate(t.truckLine, { material: f.local(driver.materials.name_ar, driver.materials.name_en) })}` : ''}</Label>
        <Label style={{ color: colors.onPrimary, opacity: .75 }}>{f.date(data.today, true)}</Label>
        {loading ? <LoadingCards /> : <><Title style={{ fontSize: 30, lineHeight: 39, color: colors.onPrimary }}>{head}</Title>
          {!error ? <Title style={{ fontSize: 30, lineHeight: 39, color: colors.gold }}>{off ? t.offSub : noPlan ? t.noPlanSub : interpolate(t.inDistricts, { n: new Set(data.rows.map(r => r.district_id)).size })}</Title> : null}</>}
      </View>
    </View>
    <View style={{ marginHorizontal: 16, marginTop: -56, gap: 14 }}>
      <Card style={[styles.card, { borderRadius: 22, padding: 18, gap: 16 }]}>
        {loading ? <LoadingCards /> : error ? <ErrorState onRetry={() => void data.retry()} /> : off ? <>
          <EmptyState icon="calendar-x" title={t.offHead} body={t.offBody} /><OpsButton />
        </> : noPlan ? <><EmptyState title={t.noPlanHead} body={t.noPlanBody} />
          <Button variant="branch" tone="outline" label={t.refresh} icon="retry" onPress={() => void data.retry()} /><OpsButton /></> : <>
          <View style={[styles.row, { gap: 18 }]}><ProgressRing kinds={kinds} /><View style={[styles.grow, { gap: 9 }]}>
            <Title style={{ fontSize: 19 }}>{interpolate(t.doneOf, { x: done, n: data.rows.length })}</Title><Legend kinds={kinds} /></View></View>
          <View style={{ height: 1, backgroundColor: colors.line }} />
          {data.suggestion ? <><View style={[styles.row, { justifyContent: 'space-between' }]}><Title style={{ fontSize: 16 }}>{t.suggested}</Title>
            {data.suggestion.same ? <Pill color={colors.accentText} background={colors.accentSoft}>{t.sameDistrict}</Pill> : null}</View>
            <StopCard row={data.suggestion.row} />
            <Button variant="branch" style={{ minHeight: 56, borderRadius: 16 }} label={t.openDetails} onPress={() => data.openStop(data.suggestion!.row.id!)} />
          </> : <View style={styles.row}><Tile icon="seal" size={58} background={colors.successSoft} color={colors.success} />
            <View style={styles.grow}><Title style={styles.h2}>{t.allDoneTitle}</Title><Muted>{interpolate(t.allDoneSub, { name })}</Muted></View></View>}
        </>}
      </Card>
      {data.next.data ? <Button variant="branch" tone="outline" icon="calendar-check"
        label={`${t.nextPlan}\n${interpolate(t.nextPlanValue, { date: f.date(data.next.data.day, true), n: data.next.data.rows.length })}`}
        onPress={() => data.setPage('upcoming')} /> : null}
      {!loading && !error ? <ChangeBanner /> : null}
      {!loading && !error && !off && !noPlan ? <View style={{ gap: 10, paddingTop: 10 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}><Title style={{ fontSize: 19 }}>{t.byDistrict}</Title>
          <Button variant="branch" tone="muted" label={t.allStops} onPress={() => data.setPage('plan')} /></View>
        {groups.map(group => { const recorded = group.rows.filter(r => stopState(r, data.today) !== 'todo').length;
          return <Pressable key={group.id} accessibilityRole="button" onPress={() => data.setPage('plan')}><Card style={[styles.card, styles.row, { minHeight: 68, borderRadius: 16, paddingVertical: 12 }]}>
            <Tile icon={recorded === group.rows.length ? 'check' : 'pin'} color={recorded === group.rows.length ? colors.success : colors.primary} />
            <View style={[styles.grow, { gap: 6 }]}><View style={[styles.row, { justifyContent: 'space-between' }]}><Label style={styles.heavy}>{group.name}</Label><Muted>{recorded}/{group.rows.length}</Muted></View>
              <View style={{ height: 6, borderRadius: 9, backgroundColor: colors.surface2 }}><View style={{ height: 6, borderRadius: 9, backgroundColor: colors.success, width: `${recorded / group.rows.length * 100}%` }} /></View>
            </View></Card></Pressable>;
        })}
      </View> : null}
    </View>
  </Screen>;
}

export function PlanScreen() {
  const data = useDriver(); const f = useDriverFormat(); const [filter, setFilter] = useState<'all' | 'remaining'>('all');
  const kinds = data.rows.map(r => stopState(r, data.today)); const remaining = kinds.filter(k => k === 'todo').length;
  return <PageFrame title={f.t.planTitle} onBack={data.back}
    subtitle={`${f.date(data.today)} · ${interpolate(f.t.doneOf, { x: data.rows.length - remaining, n: data.rows.length })}`}
    trailing={<ProgressRing kinds={kinds} size={54} />} footer={<BottomNav />}>
    {data.day.isPending ? <LoadingCards /> : data.day.isError ? <ErrorState onRetry={() => void data.day.refetch()} /> : <>
      <Segmented label={f.t.filter} value={filter} onChange={setFilter} options={[
        { value: 'remaining', label: interpolate(f.t.remainingN, { n: remaining }) }, { value: 'all', label: interpolate(f.t.allN, { n: data.rows.length }) }]} />
      <ChangeBanner /><Muted>{f.t.anyOrder}</Muted>
      {!data.rows.length ? <EmptyState title={f.t.noPlanHead} body={f.t.noPlanBody} /> : null}
      {filter === 'remaining' && !remaining && data.rows.length > 0 ? <EmptyState icon="seal" title={f.t.allDoneTitle} /> : null}
      {groupStops(data.rows, f.language).map(group => {
        const shown = group.rows.filter(r => filter === 'all' || stopState(r, data.today) === 'todo');
        const done = group.rows.filter(r => stopState(r, data.today) !== 'todo').length;
        if (!shown.length) return null;
        return <View key={group.id} style={{ gap: 10 }}><View style={[styles.row, { flexWrap: 'wrap' }]}><Icon name="pin" />
          <Title style={styles.h2}>{group.name}</Title><Pill>{done}/{group.rows.length}</Pill>
          {done === group.rows.length ? <Pill color={f.colors.success} background={f.colors.successSoft}>{f.t.districtDone}</Pill> : null}</View>
          {shown.map(row => <StopCard key={row.id} row={row} />)}</View>;
      })}
    </>}
  </PageFrame>;
}
