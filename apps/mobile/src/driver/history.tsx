import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, EmptyState, ErrorState, Icon, Label, Segmented, Sheet, Title } from '@/ui/components';
import { interpolate } from '@/i18n/copy';
import type { HistoryVisit } from '@/data/driver-api';
import { useDriver } from './state';
import { shiftDay, type Outcome } from './model';
import { BottomNav, IconButton, Legend, LoadingCards, MaterialPill, Muted, OpsButton, PageFrame, Pill, ProgressRing, StoredPhoto, Tile, styles, useDriverFormat } from './shared';

export function HistoryScreen() {
  const data = useDriver(); const f = useDriverFormat(); const { t } = f;
  const [filter, setFilter] = useState<'all' | Outcome>('all');
  const [rangeOpen, setRangeOpen] = useState(false); const [visit, setVisit] = useState<HistoryVisit | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [data.today]: true });
  const rows = data.history.data ?? [];
  const kinds = rows.map(row => row.attempt.outcome as Outcome);
  const filtered = rows.filter(row => filter === 'all' || row.attempt.outcome === filter);
  const days = [...new Set(filtered.map(row => row.attempt.visit_day))].sort().reverse();
  return <PageFrame title={t.histTitle} footer={<BottomNav />}>
    <Button variant="branch" tone="outline" icon="cal" label={`${t.period}: ${f.date(data.range.from)} – ${f.date(data.range.to)} · ${t.change}`} onPress={() => setRangeOpen(true)} />
    <Segmented label={t.filter} value={filter} onChange={setFilter} options={[
      { value: 'all', label: t.f_all }, { value: 'full', label: t.st_full }, { value: 'partial', label: t.st_partial }, { value: 'failed', label: t.st_failed },
    ]} />
    {data.history.isPending || data.historyExists.isPending ? <LoadingCards />
      : data.history.isError || data.historyExists.isError ? <ErrorState onRetry={() => { void data.history.refetch(); void data.historyExists.refetch(); }} /> : <>
        {rows.length ? <Card style={[styles.card, styles.row, { padding: 16, borderRadius: 20 }]}><ProgressRing kinds={kinds} size={96} history /><Legend kinds={kinds} /></Card> : null}
        {days.map(day => {
          const all = rows.filter(row => row.attempt.visit_day === day);
          const visits = filtered.filter(row => row.attempt.visit_day === day);
          const label = day === data.today ? interpolate(t.today, { date: f.date(day, true) })
            : day === shiftDay(data.today, -1) ? interpolate(t.yesterday, { date: f.date(day, true) }) : f.date(day, true);
          const summary = [interpolate(t.daySummary, { n: all.length }), ...(['full', 'partial', 'failed'] as const)
            .flatMap(kind => { const n = all.filter(row => row.attempt.outcome === kind).length; return n ? [`${n} ${f.status(kind).label}`] : []; })].join(' · ');
          return <View key={day} style={{ gap: 8 }}><Pressable accessibilityRole="button" accessibilityState={{ expanded: !!expanded[day] }}
            onPress={() => setExpanded(value => ({ ...value, [day]: !value[day] }))} style={[styles.row, { minHeight: 52 }]}>
            <View style={styles.grow}><Title style={{ fontSize: 17 }}>{label}</Title><Muted style={{ fontSize: 13 }}>{summary}</Muted></View>
            <View style={{ transform: [{ rotate: expanded[day] ? '180deg' : '0deg' }] }}><Icon name="caretD" /></View>
          </Pressable>
            {expanded[day] ? visits.map(item => { const a = item.attempt; const st = f.status(a.outcome as Outcome);
              const reason = item.reason ? f.local(item.reason.label_ar, item.reason.label_en) : a.reason_text;
              return <Pressable key={a.id} accessibilityRole="button" onPress={() => setVisit(item)}><Card style={[styles.card, styles.row, { minHeight: 72, borderRadius: 16, paddingVertical: 12 }]}>
                <Tile {...st} /><View style={styles.grow}><Label style={[styles.heavy, { fontSize: 15 }]}>{item.request ? f.title(item.request) : t.request}</Label>
                  <Muted style={{ fontSize: 13 }}>{[item.request ? f.material(item.request) : '', reason].filter(Boolean).join(' · ')}</Muted></View>
                <View style={{ gap: 2, alignItems: 'flex-end' }}><Pill {...st}>{st.label}</Pill><Muted style={{ fontSize: 13 }}>{f.time(a.recorded_at)}</Muted></View>
              </Card></Pressable>;
            }) : null}
          </View>;
        })}
        {!filtered.length ? <EmptyState icon="clock" title={data.historyExists.data ? t.rangeEmpty : t.histEmpty}
          body={data.historyExists.data ? t.rangeEmptySub : t.histEmptySub}
          action={data.historyExists.data ? { label: t.changePeriod, icon: 'cal', onPress: () => setRangeOpen(true) } : undefined} /> : null}
      </>}
    <OpsButton wrong />
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
    <View style={styles.row}><Title style={[styles.grow, { fontSize: 20 }]}>{t.rangeTitle}</Title><IconButton icon="x" label={t.close} onPress={onClose} /></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{quick.map(q => <Button key={q.label} variant="branch" tone="outline" label={q.label}
      selected={q.from === range.from && q.to === range.to} style={{ minHeight: 42, borderRadius: 12,
        backgroundColor: q.from === range.from && q.to === range.to ? colors.primarySoft : colors.surface }}
      onPress={() => { setRange({ from: q.from, to: q.to }); setMonth(q.to.slice(0, 7)); setStep('from'); }} />)}</View>
    <View style={styles.row}>{(['from', 'to'] as const).map(key => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: step === key }} onPress={() => setStep(key)}
      style={[styles.grow, { padding: 12, borderRadius: 14, borderWidth: 2, borderColor: step === key ? colors.primary : 'transparent', backgroundColor: colors.surface2 }]}>
      <Muted>{t[key]}</Muted><Label style={styles.heavy}>{f.date(range[key])}</Label></Pressable>)}</View>
    <View style={[styles.row, { justifyContent: 'space-between' }]}>
      <IconButton icon={f.language === 'ar' ? 'caretR' : 'caretL'} label={t.back} onPress={() => moveMonth(-1)} />
      <Label style={styles.heavy}>{new Intl.DateTimeFormat(f.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first)}</Label>
      {month < data.today.slice(0, 7) ? <IconButton icon={f.language === 'ar' ? 'caretL' : 'caretR'} label={t.continue} onPress={() => moveMonth(1)} /> : <View style={{ width: 48 }} />}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {Array.from({ length: 7 }, (_, i) => <Label key={`w${i}`} style={{ width: '14.2857%', textAlign: 'center', fontSize: 12, color: colors.muted }}>
        {new Intl.DateTimeFormat(f.locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2023, 0, 1 + i)))}</Label>)}
      {Array.from({ length: blanks }, (_, i) => <View key={`blank${i}`} style={{ width: '14.2857%', height: 44 }} />)}
      {Array.from({ length: days }, (_, i) => { const day = `${month}-${String(i + 1).padStart(2, '0')}`;
        const edge = day === range.from || day === range.to; const within = day >= range.from && day <= range.to; const future = day > data.today;
        return <Pressable key={day} disabled={future} accessibilityRole="button" accessibilityLabel={f.date(day, true)}
          accessibilityState={{ selected: edge, disabled: future }} onPress={() => pick(day)} style={{ width: '14.2857%', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
            backgroundColor: edge ? colors.primary : within ? colors.primarySoft : 'transparent' }}>
          <Label style={{ fontSize: 15, color: edge ? colors.onPrimary : future ? colors.ringTodo : colors.text,
            fontFamily: edge || day === data.today ? 'Tajawal_800ExtraBold' : 'Tajawal_400Regular' }}>{i + 1}</Label>
        </Pressable>;
      })}
    </View>
    <Button variant="branch" label={t.apply} onPress={() => { data.setRange(range); onClose(); }} />
  </Sheet>;
}

function VisitSheet({ visit, onClose }: { visit: HistoryVisit; onClose: () => void }) {
  const f = useDriverFormat(); const a = visit.attempt; const st = f.status(a.outcome as Outcome);
  const reason = visit.reason ? f.local(visit.reason.label_ar, visit.reason.label_en) : a.reason_text;
  return <Sheet onClose={onClose}><View style={styles.row}><Tile {...st} size={52} />
    <View style={styles.grow}><Title style={styles.h2}>{visit.request ? f.title(visit.request) : f.t.request}</Title><Muted>{f.stamp(a.recorded_at)}</Muted></View>
    <IconButton icon="x" label={f.t.close} onPress={onClose} /></View>
    <Pill {...st} icon={st.icon}>{a.outcome === 'full' ? f.t.rFull : a.outcome === 'partial' ? f.t.rPartial : f.t.rFailed}</Pill>
    {visit.request ? <MaterialPill row={visit.request} /> : null}
    {a.photo_path ? <StoredPhoto path={a.photo_path} label={f.t.driverPhoto} height={150} /> : null}
    {reason ? <Card style={styles.card}><Muted>{f.t.reasonLbl}</Muted><Label>{reason}</Label></Card> : null}
    {a.note ? <Card style={styles.card}><Muted>{f.t.noteLbl}</Muted><Label>{a.note}</Label></Card> : null}
    <OpsButton wrong />
  </Sheet>;
}
