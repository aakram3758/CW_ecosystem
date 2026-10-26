import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useApp, usePageTitle, useStrings } from '../../lib/app-context';
import { useBranches, useCatalog, useDrivers, useReport } from '../../data/queries';
import type { ReportCounts, ReportData, ReportFilters } from '../../data/admin';
import { CHAINS, CHAIN_ORDER, CITIES, CITY_ORDER, DISTRICTS, MATERIAL_ORDER, districtsOf, materialInfo } from '../../data/catalog';
import type { Lang } from '../../data/types';
import { branchLabel, districtName } from '../../lib/format';
import { LOCALE, addDays, daysBetween, formatNumber, opsToday } from '../../lib/dates';
import { HeroTitle, PageBody, PageHero } from '../../components/layout/PageHero';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { ToggleGroup } from '../../components/ui/Toggles';
import { EmptyState, ErrorState, Skeleton, cardClass } from '../../components/ui/States';
import { REPORTS_STRINGS } from './strings';

type Period = '7' | 'month' | '30' | 'custom';
type GroupKey = keyof ReportData['groups'];
const GROUPS: GroupKey[] = ['material', 'driver', 'district', 'chain', 'branch', 'city'];
const GROUP_COLS = 'grid-cols-[minmax(200px,1.6fr)_repeat(5,minmax(90px,1fr))_minmax(150px,1.2fr)]';
const DRIVER_COLS = 'grid-cols-[minmax(170px,1.4fr)_110px_100px_80px_130px_100px_110px_120px]';

const pct = (x: { requests: number; completed: number }) => (x.requests ? Math.round((x.completed / x.requests) * 100) : 0);

function rangeOf(period: Period, custom: { from: string; to: string }, today: string) {
  if (period === '7') return { from: addDays(today, -6), to: today };
  if (period === '30') return { from: addDays(today, -29), to: today };
  if (period === 'month') return { from: `${today.slice(0, 8)}01`, to: today };
  return custom;
}

const monthName = (day: string, lang: Lang) => new Intl.DateTimeFormat(LOCALE[lang], { month: 'long', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));

/** Reports: KPIs, driver performance and a breakdown, with the same view exported to Excel. */
export function ReportsPage() {
  const { t, l, lang, user, theme } = useApp();
  const s = useStrings(REPORTS_STRINGS);
  usePageTitle(t.nav.reports);
  useCatalog();
  const branches = useBranches();
  const drivers = useDrivers();

  const today = opsToday();
  const initialMaterial = user.material && MATERIAL_ORDER.includes(user.material) ? user.material : 'all';
  const [period, setPeriod] = useState<Period>('month');
  const [custom, setCustom] = useState({ from: addDays(today, -29), to: today });
  const [f, setF] = useState<Omit<ReportFilters, 'from' | 'to'>>({ material: initialMaterial, city: 'all', district: 'all', driver: 'all', chain: 'all' });
  const [by, setBy] = useState<GroupKey>('material');
  const [exporting, setExporting] = useState(false);

  const range = rangeOf(period, custom, today);
  const badRange = period === 'custom' && (!range.from || !range.to || range.from > range.to || daysBetween(range.from, range.to) > 366);
  const filters: ReportFilters = { ...f, ...(badRange ? rangeOf('month', custom, today) : range) };
  const report = useReport(filters);
  const data = report.data;

  const periodLabel = period === 'month' ? s.monthName(monthName(today, lang)) : period === 'custom' ? `${range.from} → ${range.to}` : s.periods[period];
  const fmt = (n: number) => formatNumber(Math.round(n), lang);
  const kg = (n: number) => s.kg(fmt(n));
  const color = (m: string) => (theme === 'dark' ? materialInfo(m).colorDark : materialInfo(m).colorLight);

  const driverName = useMemo(() => {
    const m: Record<string, string> = {};
    (drivers.data ?? []).forEach((d) => (m[d.id] = l(d.name)));
    data?.drivers.forEach((d) => (m[d.id] ??= l(d.name)));
    return m;
  }, [drivers.data, data, l]);
  const branchName = useMemo(() => {
    const m: Record<string, string> = {};
    (branches.data ?? []).forEach((b) => (m[b.id] = `${branchLabel(b, lang)} · ${CITIES[b.city] ? l(CITIES[b.city]) : ''}`));
    return m;
  }, [branches.data, lang, l]);

  const nameOf = (g: GroupKey, key: string) => {
    switch (g) {
      case 'material':
        return l(materialInfo(key).name);
      case 'city':
        return CITIES[key] ? l(CITIES[key]) : key;
      case 'district':
        return `${districtName(key, lang)}${f.city === 'all' && DISTRICTS[key] ? ` · ${l(CITIES[DISTRICTS[key].city])}` : ''}`;
      case 'chain':
        return CHAINS[key] ? l(CHAINS[key]) : key;
      case 'branch':
        return branchName[key] ?? '—';
      case 'driver':
        return key === '__none' ? s.unassigned : (driverName[key] ?? '—');
    }
  };

  const rows = useMemo(() => {
    const list = (data?.groups[by] ?? []).filter((r) => r.requests > 0 || r.failed > 0 || r.kg > 0);
    if (by === 'driver' && data) {
      // Requests never assigned to a driver have no driver row; show them so the rows add up to the total.
      const sum = (k: 'requests' | 'completed' | 'closed') => data.totals[k] - list.reduce((n, r) => n + r[k], 0);
      if (sum('requests') > 0) list.push({ key: '__none', requests: sum('requests'), completed: sum('completed'), closed: sum('closed'), failed: 0, kg: 0 });
    }
    return by === 'branch' ? [...list].sort((a, b) => b.failed - a.failed || pct(a) - pct(b)) : [...list].sort((a, b) => b.requests - a.requests || b.kg - a.kg);
  }, [data, by]);
  const total: ReportCounts = data ? { requests: data.totals.requests, completed: data.totals.completed, closed: data.totals.closed, failed: data.totals.failedVisits, kg: data.totals.kg } : { requests: 0, completed: 0, closed: 0, failed: 0, kg: 0 };
  const totalVisits = data ? data.drivers.reduce((n, d) => n + d.visits, 0) : 0;
  const avgTrip = data && data.totals.trips ? (totalVisits / data.totals.trips).toFixed(1) : null;

  const hasFilters = f.material !== initialMaterial || f.city !== 'all' || f.district !== 'all' || f.driver !== 'all' || f.chain !== 'all';
  const reset = () => {
    setF({ material: initialMaterial, city: 'all', district: 'all', driver: 'all', chain: 'all' });
    setPeriod('month');
  };
  const parts = [f.material === 'all' ? '' : l(materialInfo(f.material).name), f.city === 'all' ? '' : l(CITIES[f.city]), f.district === 'all' ? '' : districtName(f.district, lang), f.driver === 'all' ? '' : driverName[f.driver], f.chain === 'all' ? '' : l(CHAINS[f.chain])].filter(Boolean);
  const driverOptions = (drivers.data ?? []).filter((d) => (f.city === 'all' || d.city === f.city) && (f.material === 'all' || d.material === f.material));
  const empty = data && data.totals.requests === 0 && data.totals.visits === 0 && data.totals.trips === 0;

  const doExport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { default: writeXlsxFile } = await import('write-excel-file/browser');
      const bold = (value: string | number) => ({ value, fontWeight: 'bold' as const });
      const groupLabel = s.groups[by];
      const summary = [
        [bold(t.nav.reports), ''],
        [s.periodRow, `${filters.from} → ${filters.to} (${periodLabel})`],
        [s.filtersRow, parts.join(' · ') || '—'],
        [s.generated, new Date().toLocaleString(LOCALE[lang])],
        ['', ''],
        [s.kpi.requests, data.totals.requests],
        [s.kpi.completed, data.totals.completed],
        [s.groupCols[2], data.totals.closed],
        [s.kpi.failed, data.totals.failedVisits],
        [s.kpi.trips, data.totals.trips],
        [s.kpi.kg, Math.round(data.totals.kg)],
      ];
      const group = [
        [groupLabel, ...s.groupCols].map(bold),
        ...rows.map((r) => [nameOf(by, r.key), r.requests, r.completed, r.closed, r.failed, Math.round(r.kg), `${pct(r)}%`]),
        [s.total, total.requests, total.completed, total.closed, total.failed, Math.round(total.kg), `${pct(total)}%`].map(bold),
      ];
      const drv = [
        s.driverCols.map(bold),
        ...data.drivers.map((d) => [
          `${l(d.name)}${d.active ? '' : ` (${s.stopped})`}`,
          l(materialInfo(d.material).name),
          CITIES[d.city] ? l(CITIES[d.city]) : '',
          d.trips,
          d.trips ? Number((d.visits / d.trips).toFixed(1)) : '',
          d.daysOff,
          d.failed,
          Math.round(d.kg),
        ]),
      ];
      const rtl = lang === 'ar';
      const file = `clouds-water-report-${filters.from}_${filters.to}.xlsx`;
      await writeXlsxFile([
        { data: summary, sheet: s.sheetSummary, rightToLeft: rtl, columns: [{ width: 24 }, { width: 48 }] },
        { data: group, sheet: s.sheetGroup(groupLabel).slice(0, 31), rightToLeft: rtl, stickyRowsCount: 1, columns: [{ width: 44 }, ...Array(6).fill({ width: 14 })] },
        { data: drv, sheet: s.sheetDrivers, rightToLeft: rtl, stickyRowsCount: 1, columns: [{ width: 26 }, { width: 14 }, { width: 14 }, ...Array(5).fill({ width: 14 })] },
      ]).toFile(file);
      toast.success(s.exported(file));
    } catch {
      toast.error(s.exportFailed);
    } finally {
      setExporting(false);
    }
  };

  const kpis = [
    { t: s.kpi.requests, n: fmt(total.requests), sub: s.kpi.requestsSub, c: 'var(--primary)' },
    { t: s.kpi.completed, n: fmt(total.completed), sub: s.kpi.completedSub(pct(total)), c: 'var(--success)' },
    { t: s.kpi.failed, n: fmt(total.failed), sub: s.kpi.failedSub, c: 'var(--danger)' },
    { t: s.kpi.trips, n: fmt(data?.totals.trips ?? 0), sub: s.kpi.tripsSub(avgTrip), c: 'var(--side)' },
    { t: s.kpi.kg, n: fmt(total.kg), sub: s.kpi.kgSub, c: 'var(--accent)' },
  ];

  return (
    <>
      <PageHero crumb={t.nav.reports} parent={t.nav.adminSection}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <HeroTitle title={t.nav.reports} line={data ? [periodLabel, kg(total.kg), ...parts].join(' · ') : ' '} />
          <Button variant="gold" size="lg" onClick={doExport} disabled={!data || exporting}>
            <Icon name="download" size={18} />
            {exporting ? s.exporting : s.export}
          </Button>
        </div>
      </PageHero>

      <PageBody>
        <section className={clsx(cardClass, 'flex flex-col gap-4 px-[18px] py-4')}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label={s.material}>
              {({ id }) => (
                <Select id={id} value={f.material} onChange={(e) => setF({ ...f, material: e.target.value, driver: 'all' })}>
                  <option value="all">{s.allMaterials}</option>
                  {MATERIAL_ORDER.map((m) => (
                    <option key={m} value={m}>
                      {l(materialInfo(m).name)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={s.city}>
              {({ id }) => (
                <Select
                  id={id}
                  value={f.city}
                  onChange={(e) => {
                    setF({ ...f, city: e.target.value, district: 'all', driver: 'all' });
                    if (e.target.value === 'all' && by === 'district') setBy('material');
                  }}
                >
                  <option value="all">{s.allCities}</option>
                  {CITY_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {l(CITIES[c])}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={s.district}>
              {({ id }) => (
                <Select id={id} value={f.district} disabled={f.city === 'all'} onChange={(e) => setF({ ...f, district: e.target.value })}>
                  <option value="all">{f.city === 'all' ? s.cityFirst : s.allDistricts}</option>
                  {f.city !== 'all' &&
                    districtsOf(f.city).map((d) => (
                      <option key={d} value={d}>
                        {districtName(d, lang)}
                      </option>
                    ))}
                </Select>
              )}
            </Field>
            <Field label={s.driver}>
              {({ id }) => (
                <Select id={id} value={f.driver} onChange={(e) => setF({ ...f, driver: e.target.value })}>
                  <option value="all">{s.allDrivers}</option>
                  {driverOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {l(d.name)} · {l(materialInfo(d.material).name)}
                      {f.city === 'all' && CITIES[d.city] ? ` · ${l(CITIES[d.city])}` : ''}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={s.chain}>
              {({ id }) => (
                <Select id={id} value={f.chain} onChange={(e) => setF({ ...f, chain: e.target.value })}>
                  <option value="all">{s.allChains}</option>
                  {CHAIN_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {l(CHAINS[c])}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-muted">{s.period}</span>
              <ToggleGroup label={s.period} value={period} onChange={setPeriod} options={(['7', 'month', '30', 'custom'] as Period[]).map((p) => ({ value: p, label: p === 'month' ? s.monthName(monthName(today, lang)) : s.periods[p] }))} />
            </div>
            {period === 'custom' && (
              <>
                <Field label={s.from}>{({ id }) => <Input id={id} type="date" max={today} value={custom.from} aria-invalid={badRange} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="!w-[170px]" />}</Field>
                <Field label={s.to}>{({ id }) => <Input id={id} type="date" max={today} value={custom.to} aria-invalid={badRange} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="!w-[170px]" />}</Field>
              </>
            )}
            <span className="flex-1" />
            {hasFilters && (
              <Button variant="ghost" onClick={reset}>
                {s.reset}
              </Button>
            )}
          </div>
          {badRange && (
            <div role="alert" className="text-sm font-bold text-danger-ink">
              {s.badRange}
            </div>
          )}
        </section>

        {report.isError && !data ? (
          <ErrorState title={s.loadError} body={s.loadErrorBody} onRetry={() => report.refetch()} />
        ) : !data ? (
          <div aria-busy="true" aria-label={t.loading} className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[110px] rounded-[20px]" />
              ))}
            </div>
            <Skeleton className="h-[260px] rounded-[20px]" />
          </div>
        ) : empty ? (
          <EmptyState icon="chart" title={s.emptyTitle} body={s.emptyBody} action={<Button variant="gold" size="lg" onClick={reset}>{s.resetAll}</Button>} />
        ) : (
          <div className={clsx('flex flex-col gap-4 transition-opacity', report.isFetching && 'opacity-60')}>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {kpis.map((k) => (
                <div key={k.t} data-testid="kpi" className={clsx(cardClass, 'flex flex-col gap-1 p-4')}>
                  <span className="flex items-center gap-2 text-sm font-bold text-muted">
                    <span className="size-2.5 flex-none rounded-[3px]" style={{ background: k.c }} />
                    {k.t}
                  </span>
                  <span className="text-[30px] font-extrabold leading-tight">{k.n}</span>
                  <span className="text-xs text-muted">{k.sub}</span>
                </div>
              ))}
            </div>

            <section className={clsx(cardClass, 'flex flex-col overflow-hidden')}>
              <div className="px-[18px] py-4">
                <h2 className="m-0 text-lg font-extrabold">{s.driversTitle}</h2>
                <div className="text-[13px] text-muted">{s.driversSub(periodLabel, data.workingDays)}</div>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[960px]">
                  <div className={clsx('grid gap-3 border-t border-line bg-surface-2 px-4 py-2.5 text-[13px] font-bold text-muted', DRIVER_COLS)}>
                    {s.driverCols.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                  {data.drivers.map((d) => (
                    <div key={d.id} data-testid="report-driver" className={clsx('grid items-center gap-3 border-t border-line px-4 py-2.5 text-sm', DRIVER_COLS)}>
                      <span className="flex items-center gap-2 font-bold">
                        {l(d.name)}
                        {!d.active && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{s.stopped}</span>}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 flex-none rounded-[3px]" style={{ background: color(d.material) }} />
                        {l(materialInfo(d.material).name)}
                      </span>
                      <span>{CITIES[d.city] ? l(CITIES[d.city]) : '—'}</span>
                      <span className="font-bold">{fmt(d.trips)}</span>
                      <span>{d.trips ? (d.visits / d.trips).toFixed(1) : '—'}</span>
                      <span className={clsx(d.daysOff >= 3 && 'font-extrabold text-accent-ink')}>{s.days(d.daysOff)}</span>
                      <span className={clsx(d.failed > 0 && d.failed / Math.max(1, d.visits) >= 0.15 && 'font-extrabold text-danger-ink')}>{fmt(d.failed)}</span>
                      <span>{kg(d.kg)}</span>
                    </div>
                  ))}
                  {data.drivers.length === 0 && <div className="border-t border-line px-4 py-8 text-center text-sm text-muted">{s.noDrivers}</div>}
                </div>
              </div>
              <div className="border-t border-line px-[18px] py-3 text-xs text-muted">{s.driversNote}</div>
            </section>

            <section className={clsx(cardClass, 'flex flex-col overflow-hidden')}>
              <div className="flex flex-wrap items-center gap-3 px-[18px] py-4">
                <h2 className="m-0 text-lg font-extrabold">{s.groupBy}</h2>
                <ToggleGroup label={s.groupBy} value={by} onChange={setBy} options={GROUPS.map((g) => ({ value: g, label: s.groups[g] }))} />
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                  <div className={clsx('grid gap-3 border-t border-line bg-surface-2 px-4 py-2.5 text-[13px] font-bold text-muted', GROUP_COLS)}>
                    <span>{s.groups[by]}</span>
                    {s.groupCols.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                  {rows.map((r) => (
                    <div key={r.key} data-testid="report-group" className={clsx('grid items-center gap-3 border-t border-line px-4 py-2.5 text-sm', GROUP_COLS)}>
                      <span className="flex min-w-0 items-center gap-2 font-bold">
                        {by === 'material' && <span className="size-2.5 flex-none rounded-[3px]" style={{ background: color(r.key) }} />}
                        <span className="truncate">{nameOf(by, r.key)}</span>
                      </span>
                      <span>{fmt(r.requests)}</span>
                      <span>{fmt(r.completed)}</span>
                      <span>{fmt(r.closed)}</span>
                      <span className={clsx(r.failed > 0 && 'font-bold text-danger-ink')}>{fmt(r.failed)}</span>
                      <span>{kg(r.kg)}</span>
                      <span className="flex items-center gap-2">
                        <span className="h-2 flex-1 overflow-hidden rounded bg-surface-2">
                          <span className="block h-full rounded bg-success" style={{ width: `${pct(r)}%` }} />
                        </span>
                        <span className="w-10 text-end font-bold">{pct(r)}%</span>
                      </span>
                    </div>
                  ))}
                  <div className={clsx('grid items-center gap-3 border-t-2 border-line bg-surface-2 px-4 py-3 text-sm font-extrabold', GROUP_COLS)}>
                    <span>{s.total}</span>
                    <span>{fmt(total.requests)}</span>
                    <span>{fmt(total.completed)}</span>
                    <span>{fmt(total.closed)}</span>
                    <span>{fmt(total.failed)}</span>
                    <span>{kg(total.kg)}</span>
                    <span>{pct(total)}%</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-line px-[18px] py-3 text-xs text-muted">
                {s.groupNote}
                {by === 'branch' && s.branchNote}
              </div>
            </section>
          </div>
        )}
      </PageBody>
    </>
  );
}
