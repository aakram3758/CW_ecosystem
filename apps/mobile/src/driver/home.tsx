import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from './visual';
import { Button, Card, Label, Screen, Segmented, Title, press, useShadows } from './visual';
import { Icon } from './icons';
import { interpolate } from '@/i18n/copy';
import { useDriver } from './state';
import { groupStops, stopState } from './model';
import { BottomNav, ChangeBanner, EmptyState, ErrorState, IconButton, Legend, LoadingCards, MaterialPill, Muted, OpsButton, PageFrame, Pill, ProgressRing, StopCard, Tile, Weight, styles, useDriverFormat } from './shared';

const navy = '#0B2340', white = '#FFFFFF', gold = '#E8CE84', headerFill = 'rgba(255,255,255,.1)', heroLine = 'rgba(255,255,255,.08)', heroGoldLine = 'rgba(232,206,132,.22)', dateWhite = 'rgba(255,255,255,.75)', unreadRed = '#EF6B5E';
export function HomeScreen() {
  const data = useDriver(); const f = useDriverFormat(); const { t, colors } = f; const insets = useSafeAreaInsets(); const { shadow, shadowLg } = useShadows();
  const driver = data.context.driver; const name = f.local(driver.full_name, driver.full_name_en).trim().split(/\s+/)[0];
  const off = data.context.offToday; const noPlan = !data.rows.length;
  const kinds = [...data.rows.filter(r => stopState(r, data.today) !== 'todo').sort((a, b) => (a.last_attempt_at ?? '').localeCompare(b.last_attempt_at ?? '')), ...data.rows.filter(r => stopState(r, data.today) === 'todo')].map(r => stopState(r, data.today));
  const done = kinds.filter(k => k !== 'todo').length; const groups = groupStops(data.rows, f.language);
  const loading = data.day.isPending; const error = data.day.isError || data.contextError;
  const head = error ? t.planTitle : off ? t.offHead : noPlan ? t.noPlanHead : interpolate(t.head, { n: data.rows.length });
  const nextRow = data.next.data ? <Pressable accessibilityRole="button" onPress={() => data.setPage('upcoming')} style={[styles.row, { borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface2, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64 }]}>
    <Icon name="calendar-check" size={28} color={colors.success} /><View style={styles.grow}><Muted style={[styles.bold, { fontSize: 13 }]}>{t.nextPlan}</Muted><Title style={{ fontSize: 16 }}>{interpolate(t.nextPlanValue, { date: f.date(data.next.data.day, true), n: data.next.data.rows.length })}</Title></View><Icon name="fwd" size={16} color={colors.muted} /></Pressable> : null;
  return <Screen topInset={false} safeColor={colors.bg} contentStyle={{ padding: 0, gap: 0, paddingBottom: 30 }} footer={<BottomNav />}>
    <View style={{ backgroundColor: navy, paddingTop: insets.top, paddingBottom: 84, borderBottomStartRadius: 32, borderBottomEndRadius: 32, overflow: 'hidden' }}>
      <View accessible={false} style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: heroLine, left: -90, top: -60 }} />
      <View accessible={false} style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 1, borderColor: heroGoldLine, right: -60, bottom: -40 }} />
      <View style={[styles.row, { justifyContent: 'space-between', paddingTop: 8, paddingHorizontal: 20 }]}><Image source={require('../../assets/cw-logo.png')} accessible={false} resizeMode="contain" style={{ height: 32, aspectRatio: 452 / 362 }} />
        <View style={[styles.row, { gap: 8 }]}>{data.context.opsPhone ? <IconButton icon="headset" label={t.support} onPress={data.openOps} color={white} size={24} style={{ backgroundColor: headerFill }} /> : null}
          <View><IconButton icon="bell" label={t.notifAria} onPress={() => data.setPage('notifications')} color={white} size={24} style={{ backgroundColor: headerFill }} />
            {data.notifications.data?.some(n => !n.read_at) ? <View style={{ position: 'absolute', top: 9, right: 10, width: 11, height: 11, borderRadius: 5.5, backgroundColor: unreadRed, borderWidth: 2, borderColor: navy }} /> : null}</View></View>
      </View>
      <View style={{ paddingTop: 22, paddingHorizontal: 20, gap: 8 }}><View style={[styles.row, { gap: 8 }]}><Icon name="truck" size={20} color={gold} /><Label style={[styles.bold, { fontSize: 16, color: gold, flexShrink: 1 }]}>{interpolate(t.hi, { name })}{driver.materials ? ` · ${interpolate(t.truckLine, { material: f.local(driver.materials.name_ar, driver.materials.name_en) })}` : ''}</Label></View>
        <Label style={{ fontFamily: 'Tajawal_500Medium', fontSize: 15, color: dateWhite }}>{f.date(data.today, true)}</Label>
        {loading ? <View style={{ gap: 12, marginTop: 8 }}><Skeleton width="72%" height={30} style={{ backgroundColor: heroLine }} /><Skeleton width="44%" height={30} style={{ backgroundColor: heroLine }} /></View>
          : <Title style={{ fontSize: 30, lineHeight: 39, color: white, marginTop: 4 }}>{head}{!error ? <Label style={[styles.heavy, { fontSize: 30, lineHeight: 39, color: gold }]}>{'\n'}{off ? t.offSub : noPlan ? t.noPlanSub : interpolate(t.inDistricts, { n: groups.length })}</Label> : null}</Title>}
      </View>
    </View>
    <Card style={[shadowLg, { marginHorizontal: 16, marginTop: -56, borderRadius: 22, padding: 18, gap: 16 }]}>
      {loading ? <LoadingCards home /> : error ? <ErrorState home onRetry={() => void data.retry()} /> : off || noPlan ? <>
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 6, paddingHorizontal: 4 }}><Tile icon={off ? 'coffee' : 'clipboard-text'} size={68} radius={22} iconSize={36} color={off ? colors.accent : colors.primary} background={off ? colors.accentSoft : colors.primarySoft} />
          <Label style={{ fontSize: 16, textAlign: 'center' }}>{off ? t.offBody : t.noPlanBody}</Label>
          {!off ? <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}><Button tone="outline" label={t.refresh} icon="arrows-clockwise" iconSize={15} fontSize={15} onPress={() => void data.retry()} style={{ flex: 1, height: 54, paddingHorizontal: 0 }} />
            {data.context.opsPhone ? <Button label={t.contactOps} icon="headset" iconSize={15} fontSize={15} onPress={data.openOps} style={{ flex: 1, height: 54, paddingHorizontal: 0 }} /> : null}</View> : null}</View>
        {off ? <>{nextRow}<OpsButton /></> : null}
      </> : <>
        <View style={[styles.row, { gap: 18 }]}><ProgressRing kinds={kinds} /><View style={[styles.grow, { gap: 9 }]}><Title style={{ fontSize: 19, lineHeight: 24.7 }}>{interpolate(t.doneOf, { x: done, n: data.rows.length })}</Title><Legend kinds={kinds} /></View></View>
        <View style={{ height: 1, backgroundColor: colors.line }} />
        {data.suggestion ? <><View style={[styles.row, { justifyContent: 'space-between', gap: 8 }]}><Title style={{ fontSize: 16 }}>{t.suggested}</Title>{data.suggestion.same ? <Pill color={colors.accentText} background={colors.accentSoft} icon="map-pin-area" iconSize={16}>{t.sameDistrict}</Pill> : null}</View>
          <View style={styles.row}><Tile icon="storefront" size={58} radius={18} iconSize={30} {...f.materialStyle(data.suggestion.row)} /><View style={[styles.grow, { gap: 6 }]}><Title style={{ fontSize: 18, lineHeight: 23.4 }}>{f.title(data.suggestion.row)}</Title><View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}><MaterialPill row={data.suggestion.row} /><Weight row={data.suggestion.row} /></View></View></View>
          <Button cwPress style={{ height: 56, borderRadius: 16, gap: 10 }} fontSize={17} endIcon="fwd" label={t.openDetails} onPress={() => data.openStop(data.suggestion!.row.id!)} />
        </> : <View style={[styles.row, { gap: 14 }]}><Tile icon="seal-check" size={58} radius={18} iconSize={32} background={colors.successSoft} color={colors.success} /><View style={[styles.grow, { gap: 2 }]}><Title style={{ fontSize: 18 }}>{t.allDoneTitle}</Title><Muted>{interpolate(t.allDoneSub, { name })}</Muted></View></View>}
      </>}
    </Card>
    {/* The next-plan row is the off day's alone (206-217): the canvas draws it nowhere else on home. */}
    {!loading && !error && data.change ? <View style={{ marginHorizontal: 16, marginTop: 14 }}><ChangeBanner /></View> : null}
    {!loading && !error && !off && !noPlan ? <View style={{ paddingTop: 24, paddingHorizontal: 16, gap: 10 }}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}><Title style={{ fontSize: 19 }}>{t.byDistrict}</Title><Button tone="text" label={t.allStops} endIcon="fwd" endIconSize={14} fontSize={15} onPress={() => data.setPage('plan')} style={{ minHeight: 44, paddingHorizontal: 4, gap: 4 }} /></View>
      {groups.map(group => { const recorded = group.rows.filter(r => stopState(r, data.today) !== 'todo').length; const complete = recorded === group.rows.length;
        return <Pressable key={group.id} accessibilityRole="button" onPress={() => data.setPage('plan')} style={state => [shadow, styles.row, { minHeight: 68, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.surface }, press(state)]}>
          <Tile icon={complete ? 'check-circle' : 'map-pin-area'} weight={complete ? 'fill' : 'duotone'} color={complete ? colors.success : colors.primary} background={complete ? colors.successSoft : colors.primarySoft} />
          <View style={[styles.grow, { gap: 6 }]}><View style={[styles.row, { justifyContent: 'space-between' }]}><Title style={{ fontSize: 16 }}>{group.name}</Title><Muted style={[styles.bold, { fontSize: 16 }]}>{recorded}/{group.rows.length}</Muted></View><View style={{ height: 6, borderRadius: 9, backgroundColor: colors.surface2, overflow: 'hidden' }}><View style={{ height: 6, borderRadius: 9, backgroundColor: colors.success, width: `${recorded / group.rows.length * 100}%` }} /></View></View></Pressable>; })}
    </View> : null}
  </Screen>;
}

export function PlanScreen() {
  const data = useDriver(); const f = useDriverFormat(); const [filter, setFilter] = useState<'all' | 'remaining'>('all');
  const kinds = [...data.rows].sort((a, b) => (a.last_attempt_day === data.today ? a.last_attempt_at ?? '' : 'z').localeCompare(b.last_attempt_day === data.today ? b.last_attempt_at ?? '' : 'z')).map(r => stopState(r, data.today));
  const remaining = kinds.filter(k => k === 'todo').length;
  return <PageFrame title={f.t.planTitle} onBack={data.back} subtitle={`${f.date(data.today)} · ${interpolate(f.t.doneOf, { x: data.rows.length - remaining, n: data.rows.length })}`} trailing={<ProgressRing kinds={kinds} size={54} />} footer={<BottomNav />} contentStyle={data.day.isPending || data.day.isError || !data.rows.length ? { padding: 16, gap: 12 } : { paddingTop: 14, paddingBottom: 32, gap: 16 }}>
    {data.day.isPending ? <LoadingCards /> : data.day.isError ? <ErrorState onRetry={() => void data.day.refetch()} /> : !data.rows.length ? <EmptyState title={f.t.noPlanHead} body={f.t.noPlanBody} /> : <>
      <Segmented label={f.t.filter} value={filter} onChange={setFilter} options={[{ value: 'remaining', label: interpolate(f.t.remainingN, { n: remaining }) }, { value: 'all', label: interpolate(f.t.allN, { n: data.rows.length }) }]} />
      <ChangeBanner plan /><View style={[styles.row, { gap: 8 }]}><Icon name="info" size={20} color={f.colors.muted} /><Muted style={[styles.bold, { fontSize: 14 }]}>{f.t.anyOrder}</Muted></View>
      {filter === 'remaining' && !remaining ? <EmptyState icon="seal-check" title={f.t.allDoneTitle} /> : null}
      {groupStops(data.rows, f.language).map(group => { const todo = group.rows.filter(r => stopState(r, data.today) === 'todo'); const done = group.rows.filter(r => stopState(r, data.today) !== 'todo'); const shown = filter === 'all' ? [...todo, ...done] : todo; if (!shown.length) return null;
        return <View key={group.id} style={{ gap: 10 }}><DistrictHeader name={group.name} count={`${done.length}/${group.rows.length}`} complete={done.length === group.rows.length} />{shown.map(row => <StopCard key={row.id} row={row} />)}</View>; })}
    </>}
  </PageFrame>;
}
export function DistrictHeader({ name, count, complete }: { name: string; count: number | string; complete?: boolean }) {
  const f = useDriverFormat(); return <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}><Icon name="map-pin-area" size={22} color={f.colors.primary} /><Title style={{ fontSize: 18 }}>{name}</Title><Pill height={26} radius={8} padding={9} weight={800}>{count}</Pill>{complete ? <Pill height={26} radius={8} padding={9} weight={800} icon="check-circle" iconWeight="fill" color={f.colors.success} background={f.colors.successSoft}>{f.t.districtDone}</Pill> : null}</View>;
}
