import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Label, Segmented, Sheet, Title, press } from './visual';
import { Icon } from './icons';
import { interpolate } from '@/i18n/copy';
import type { HistoryVisit } from '@/data/driver-api';
import { useDriver } from './state';
import { shiftDay, type Outcome } from './model';
import { EmptyState, ErrorState, BottomNav, IconButton, Legend, LoadingCards, MaterialPill, Muted, OpsButton, PageFrame, Pill, ProgressRing, StoredPhoto, Tile, styles, useDriverFormat } from './shared';

export function HistoryScreen() {
  const data = useDriver(); const f = useDriverFormat(); const { t } = f;
  const [filter, setFilter] = useState<'all' | Outcome>('all');
  const [rangeOpen, setRangeOpen] = useState(false); const [visit, setVisit] = useState<HistoryVisit | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [data.today]: true });
  const rows = data.history.data ?? [];
  const kinds = (['full', 'partial', 'failed'] as const).flatMap(kind => rows.filter(row => row.attempt.outcome === kind).map(() => kind));
  const filtered = rows.filter(row => filter === 'all' || row.attempt.outcome === filter);
  const days = [...new Set(filtered.map(row => row.attempt.visit_day))].sort().reverse();
  if (data.history.isPending || data.historyExists.isPending || data.history.isError || data.historyExists.isError || !data.historyExists.data) {
    return <PageFrame title={t.histTitle} footer={<BottomNav />} contentStyle={{ paddingBottom: 16 }}>
      {data.history.isPending || data.historyExists.isPending ? <LoadingCards /> : data.history.isError || data.historyExists.isError ? <ErrorState onRetry={() => { void data.history.refetch(); void data.historyExists.refetch(); }} /> : <EmptyState icon="clock-counter-clockwise" title={t.histEmpty} body={t.histEmptySub} />}
    </PageFrame>;
  }
  return <PageFrame title={t.histTitle} footer={<BottomNav />} contentStyle={{ paddingTop: 14, paddingBottom: 32 }}>
    <Pressable accessibilityRole="button" onPress={() => setRangeOpen(true)} style={state => [styles.row, { minHeight: 60, borderRadius: 16, borderWidth: 1.5, borderColor: f.colors.line, backgroundColor: f.colors.surface, paddingHorizontal: 14 }, press(state)]}>
      <Tile icon="calendar-blank" size={40} radius={12} iconSize={22} /><View style={styles.grow}><Muted style={[styles.bold, { fontSize: 13 }]}>{t.period}</Muted><Title style={{ fontSize: 17 }}>{f.date(data.range.from)} – {f.date(data.range.to)}</Title></View><Title style={{ fontSize: 14, color: f.colors.link }}>{t.change}</Title>
    </Pressable>
    <Segmented height={44} fontSize={14} label={t.filter} value={filter} onChange={setFilter} options={[
      { value: 'all', label: t.f_all }, { value: 'full', label: t.st_full }, { value: 'partial', label: t.st_partial }, { value: 'failed', label: t.st_failed },
    ]} />
        {rows.length ? <Card style={[styles.card, styles.row, { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, gap: 16 }]}><ProgressRing kinds={kinds} size={96} history /><Legend kinds={kinds} history /></Card> : null}
        {days.map(day => {
          const all = rows.filter(row => row.attempt.visit_day === day);
          const visits = filtered.filter(row => row.attempt.visit_day === day);
          const label = day === data.today ? interpolate(t.today, { date: f.date(day, true) })
            : day === shiftDay(data.today, -1) ? interpolate(t.yesterday, { date: f.date(day, true) }) : f.date(day, true);
          const summary = [interpolate(t.daySummary, { n: all.length }), ...(['full', 'partial', 'failed'] as const)
            .flatMap(kind => { const n = all.filter(row => row.attempt.outcome === kind).length; return n ? [`${n} ${f.status(kind).label}`] : []; })].join(' · ');
          return <View key={day} style={{ gap: 8 }}><Pressable accessibilityRole="button" accessibilityState={{ expanded: !!expanded[day] }}
            onPress={() => setExpanded(value => ({ ...value, [day]: !value[day] }))} style={[styles.row, { minHeight: 52, paddingHorizontal: 2, gap: 10 }]}>
            <View style={styles.grow}><Title style={{ fontSize: 17 }}>{label}</Title><Muted style={[styles.bold, { fontSize: 13 }]}>{summary}</Muted></View>
            <Tile icon={expanded[day] ? 'caret-up' : 'caret-down'} size={36} radius={11} iconSize={16} color={f.colors.muted} background={f.colors.surface2} />
          </Pressable>
            {expanded[day] ? visits.map(item => { const a = item.attempt; const st = f.status(a.outcome as Outcome);
              const reason = item.reason ? f.local(item.reason.label_ar, item.reason.label_en) : a.reason_text;
              return <Pressable key={a.id} accessibilityRole="button" style={press} onPress={() => setVisit(item)}><Card style={[styles.card, styles.row, { minHeight: 72, borderRadius: 16, paddingVertical: 12 }]}>
                <Tile {...st} weight="fill" /><View style={styles.grow}><Label style={[styles.heavy, { fontSize: 15 }]}>{item.request ? f.title(item.request) : t.request}</Label>
                  <Muted style={{ fontSize: 13 }}>{[item.request ? f.material(item.request) : '', reason].filter(Boolean).join(' · ')}</Muted></View>
                <View style={{ gap: 2, alignItems: 'flex-end' }}><Pill {...st} height={26} radius={8} fontSize={12} padding={9} weight={800}>{st.label}</Pill><Muted style={[styles.bold, { fontSize: 13 }]}>{f.time(a.recorded_at)}</Muted></View>
              </Card></Pressable>;
            }) : null}
          </View>;
        })}
        {!filtered.length ? <EmptyState icon="clock-counter-clockwise" title={data.historyExists.data ? t.rangeEmpty : t.histEmpty}
          body={data.historyExists.data ? t.rangeEmptySub : t.histEmptySub}
          action={data.historyExists.data ? { label: t.changePeriod, icon: 'calendar-blank', onPress: () => setRangeOpen(true) } : undefined} /> : null}
    <OpsButton wrong centered />
    {rangeOpen ? <RangeSheet onClose={() => setRangeOpen(false)} /> : null}
    {visit ? <VisitSheet visit={visit} onClose={() => setVisit(null)} /> : null}
  </PageFrame>;
}

function RangeSheet({ onClose }: { onClose: () => void }) {
  const data = useDriver(); const f = useDriverFormat(); const { t, colors } = f;
  const [range, setRange] = useState(data.range); const [step, setStep] = useState<'from' | 'to'>('from');
  const [month, setMonth] = useState(data.range.to.slice(0, 7));
  const first = new Date(`${month}-01T12:00:00Z`);
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const blanks = first.getUTCDay();
  function moveMonth(offset: number) { const d = new Date(first); d.setUTCMonth(d.getUTCMonth() + offset); setMonth(d.toISOString().slice(0, 7)); }
  const quick = [
    { label: t.qToday, from: data.today, to: data.today },
    { label: t.qYesterday, from: shiftDay(data.today, -1), to: shiftDay(data.today, -1) },
    { label: t.q7, from: shiftDay(data.today, -6), to: data.today },
    { label: t.qMonth, from: `${data.today.slice(0, 7)}-01`, to: data.today },
  ];
  function pick(day: string) {
    if (step === 'from') { setRange({ from: day, to: day }); setStep('to'); }
    else { setRange({ from: day < range.from ? day : range.from, to: day < range.from ? range.from : day }); setStep('from'); }
  }
  return <Sheet onClose={onClose}>
    <View style={styles.row}><Title style={[styles.grow, { fontSize: 20 }]}>{t.rangeTitle}</Title><IconButton icon="x" label={t.close} onPress={onClose} size={18} style={{ width: 44, height: 44, borderRadius: 12 }} /></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{quick.map(q => <Button key={q.label} tone="outline" label={q.label}
      fontSize={14} selected={q.from === range.from && q.to === range.to} style={{ minHeight: 42, paddingHorizontal: 14, borderRadius: 12, borderColor: q.from === range.from && q.to === range.to ? colors.primary : colors.line,
        backgroundColor: q.from === range.from && q.to === range.to ? colors.primarySoft : colors.surface }}
      onPress={() => { setRange({ from: q.from, to: q.to }); setMonth(q.to.slice(0, 7)); setStep('from'); }} />)}</View>
    <View style={[styles.row, { gap: 10 }]}>{(['from', 'to'] as const).map(key => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: step === key }} onPress={() => setStep(key)}
      style={[styles.grow, { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, borderWidth: 2, borderColor: step === key ? colors.primary : 'transparent', backgroundColor: colors.surface2 }]}>
      <Muted style={[styles.bold, { fontSize: 13 }]}>{t[key]}</Muted><Label style={styles.heavy}>{f.date(range[key])}</Label></Pressable>)}</View>
    <View style={[styles.row, { justifyContent: 'space-between' }]}>
      <IconButton icon={f.language === 'ar' ? 'caret-right' : 'caret-left'} label={t.back} onPress={() => moveMonth(-1)} />
      <Label style={[styles.heavy, { fontSize: 15 }]}>{new Intl.DateTimeFormat(f.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first)}</Label>
      {month < data.today.slice(0, 7) ? <IconButton icon={f.language === 'ar' ? 'caret-left' : 'caret-right'} label={t.continue} onPress={() => moveMonth(1)} /> : <View style={{ width: 48 }} />}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 }}>
      {Array.from({ length: 7 }, (_, i) => <Label key={`w${i}`} style={{ width: '14.2857%', height: 24, fontFamily: 'Tajawal_700Bold', textAlign: 'center', fontSize: 12, color: colors.muted }}>
        {new Intl.DateTimeFormat(f.locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2023, 0, 1 + i)))}</Label>)}
      {Array.from({ length: blanks }, (_, i) => <View key={`blank${i}`} style={{ width: '14.2857%', height: 44 }} />)}
      {Array.from({ length: days }, (_, i) => { const day = `${month}-${String(i + 1).padStart(2, '0')}`;
        const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
        const edge = day === range.from || day === range.to; const within = day >= range.from && day <= range.to; const future = day > data.today;
        return <Pressable key={day} disabled={future} accessibilityRole="button" accessibilityLabel={f.date(day, true)}
          accessibilityState={{ selected: edge, disabled: future }} onPress={() => pick(day)} style={{ width: '14.2857%', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
            backgroundColor: edge ? colors.primary : within ? colors.primarySoft : 'transparent' }}>
          <Label style={{ fontSize: 15, color: edge ? colors.onPrimary : future ? colors.ringTodo : weekday === 5 || weekday === 6 ? colors.muted : colors.text,
            fontFamily: edge || day === data.today ? 'Tajawal_800ExtraBold' : 'Tajawal_500Medium' }}>{i + 1}</Label>
        </Pressable>;
      })}
    </View>
    <Button cwPress fontSize={17} style={{ height: 56, borderRadius: 16 }} label={t.apply} onPress={() => { data.setRange(range); onClose(); }} />
  </Sheet>;
}

function VisitSheet({ visit, onClose }: { visit: HistoryVisit; onClose: () => void }) {
  const f = useDriverFormat(); const a = visit.attempt; const st = f.status(a.outcome as Outcome);
  const reason = visit.reason ? f.local(visit.reason.label_ar, visit.reason.label_en) : a.reason_text;
  return <Sheet onClose={onClose}><View style={styles.row}><Tile {...st} size={52} radius={16} iconSize={28} weight="fill" />
    <View style={styles.grow}><Title style={styles.h2}>{visit.request ? f.title(visit.request) : f.t.request}</Title><Muted style={{ fontSize: 14 }}>{f.stamp(a.recorded_at)}</Muted></View>
    <IconButton icon="x" label={f.t.close} onPress={onClose} size={18} style={{ width: 44, height: 44, borderRadius: 12 }} /></View>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}><Pill {...st} icon={st.icon} iconWeight="fill" height={32} radius={10} padding={12} fontSize={14} weight={800}>{a.outcome === 'full' ? f.t.rFull : a.outcome === 'partial' ? f.t.rPartial : f.t.rFailed}</Pill>
    {visit.request ? <MaterialPill row={visit.request} height={32} radius={10} padding={12} fontSize={14} /> : null}</View>
    {a.photo_path ? <StoredPhoto path={a.photo_path} label={f.t.driverPhoto} height={150} labelFirst /> : null}
    {reason ? <View style={{ gap: 2, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: f.colors.surface2 }}><Muted style={[styles.bold, { fontSize: 13 }]}>{f.t.reasonLbl}</Muted><Label style={[styles.bold, { fontSize: 15, lineHeight: 21.75 }]}>{reason}</Label></View> : null}
    {a.note ? <View style={{ gap: 2, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: f.colors.surface2 }}><Muted style={[styles.bold, { fontSize: 13 }]}>{f.t.noteLbl}</Muted><Label style={[styles.bold, { fontSize: 15, lineHeight: 21.75 }]}>{a.note}</Label></View> : null}
    <OpsButton wrong centered />
  </Sheet>;
}
