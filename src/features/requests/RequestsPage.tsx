import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useApp, usePageTitle, useStrings } from '../../lib/app-context';
import { useDrivers, useRequests } from '../../data/queries';
import { CHAINS, CHAIN_ORDER, CITIES, CITY_ORDER, MATERIALS, MATERIAL_ORDER, districtsOf } from '../../data/catalog';
import type { ChainCode, CityCode, Filter, MaterialCode, RequestStatus } from '../../data/types';
import { addDays, ageInDays, dayOf, daysBetween, formatDay, opsToday } from '../../lib/dates';
import { branchLabel, cityName, districtName } from '../../lib/format';
import { HeroTitle, PageBody, PageHero } from '../../components/layout/PageHero';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { MaterialChip, StatusPill } from '../../components/ui/Badges';
import { ToggleGroup } from '../../components/ui/Toggles';
import { LoadingBlock, Skeleton, cardClass } from '../../components/ui/States';
import { AddRequestDialog } from './AddRequestDialog';
import { RequestDrawer } from './RequestDrawer';
import { REQUESTS_STRINGS } from './strings';

const STATUS_TABS: Filter<RequestStatus>[] = ['all', 'waiting', 'scheduled', 'needs_decision', 'completed', 'closed', 'cancelled'];
const COLS = 'grid grid-cols-[96px_minmax(180px,1.5fr)_86px_160px_76px_72px_128px_76px_minmax(110px,1fr)] items-center gap-2.5';

export function RequestsPage() {
  const { t, l, lang, user } = useApp();
  const s = useStrings(REQUESTS_STRINGS);
  usePageTitle(t.nav.requests);
  const [params, setParams] = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);

  // Filters live in the URL, so a filtered view survives refresh and can be shared as a link.
  const today = opsToday();
  const defaultFrom = addDays(today, -30);
  const f = {
    q: params.get('q') ?? '',
    material: (params.get('mat') ?? user.material ?? 'all') as Filter<MaterialCode>,
    city: (params.get('city') ?? 'all') as Filter<CityCode>,
    district: params.get('dist') ?? 'all',
    chain: (params.get('chain') ?? 'all') as Filter<ChainCode>,
    from: params.get('from') ?? defaultFrom,
    to: params.get('to') ?? today,
    status: (params.get('st') ?? 'all') as Filter<RequestStatus>,
  };
  const openId = params.get('open');

  const update = (patch: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
        return next;
      },
      { replace: true },
    );

  const requests = useRequests();
  const { data: drivers = [] } = useDrivers();
  const rows = requests.data ?? [];

  const base = useMemo(() => {
    const q = f.q.trim().replace(/^#/, '').toLowerCase();
    return rows.filter((r) => {
      if (f.material !== 'all' && r.material !== f.material) return false;
      if (f.city !== 'all' && r.branch.city !== f.city) return false;
      if (f.district !== 'all' && r.branch.district !== f.district) return false;
      if (f.chain !== 'all' && r.branch.chain !== f.chain) return false;
      const day = dayOf(r.createdAt);
      if (day < f.from || day > f.to) return false;
      if (q && !(r.id.toLowerCase().includes(q) || r.branch.number.includes(q))) return false;
      return true;
    });
  }, [rows, f.q, f.material, f.city, f.district, f.chain, f.from, f.to]);

  const visible = base.filter((r) => f.status === 'all' || r.status === f.status);
  const hasFilters = !!(f.q || f.city !== 'all' || f.chain !== 'all' || f.material !== (user.material ?? 'all') || f.status !== 'all' || f.from !== defaultFrom || f.to !== today);
  const clear = () => setParams(openId ? { open: openId } : {}, { replace: true });
  const driverName = (id?: string) => (id ? l(drivers.find((d) => d.id === id)?.name ?? { ar: '—', en: '—' }) : '—');

  return (
    <>
      <PageHero crumb={t.nav.requests}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <HeroTitle
            title={t.nav.requests}
            line={requests.data ? s.heroLine(base.length, daysBetween(f.from, f.to), f.material === 'all' ? null : l(MATERIALS[f.material].name)) : ' '}
          />
          <Button variant="gold" size="lg" onClick={() => setAddOpen(true)}>
            {s.add}
          </Button>
        </div>
      </PageHero>

      <PageBody>
        {/* Filters */}
        <section aria-label={s.filters.status} className={clsx(cardClass, 'flex flex-col gap-3.5 p-[18px]')}>
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="flex flex-[2_1_200px] flex-col gap-1.5 text-[13px] font-bold text-muted">
              {s.filters.search}
              <span className="relative block">
                <Icon name="search" size={18} className="pointer-events-none absolute start-3 top-[13px] text-muted" />
                <Input type="search" value={f.q} onChange={(e) => update({ q: e.target.value || null })} placeholder={s.filters.searchPh} className="ps-[38px]" />
              </span>
            </label>
            <FilterSelect label={t.material} value={f.material} onChange={(v) => update({ mat: v })}>
              <option value="all">{t.allMaterials}</option>
              {MATERIAL_ORDER.map((m) => (
                <option key={m} value={m}>
                  {l(MATERIALS[m].name)}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label={t.city} value={f.city} onChange={(v) => update({ city: v === 'all' ? null : v, dist: null })}>
              <option value="all">{t.allCities}</option>
              {CITY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {l(CITIES[c])}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label={s.filters.district} value={f.district} disabled={f.city === 'all'} onChange={(v) => update({ dist: v === 'all' ? null : v })}>
              <option value="all">{f.city === 'all' ? s.filters.pickCityFirst : s.filters.allDistricts}</option>
              {f.city !== 'all' &&
                districtsOf(f.city).map((d) => (
                  <option key={d} value={d}>
                    {districtName(d, lang)}
                  </option>
                ))}
            </FilterSelect>
            <FilterSelect label={s.filters.chain} value={f.chain} onChange={(v) => update({ chain: v === 'all' ? null : v })}>
              <option value="all">{s.filters.allChains}</option>
              {CHAIN_ORDER.map((c) => (
                <option key={c} value={c}>
                  {l(CHAINS[c])}
                </option>
              ))}
            </FilterSelect>
            <label className="flex flex-[1_1_130px] flex-col gap-1.5 text-[13px] font-bold text-muted">
              {s.filters.from}
              <Input type="date" value={f.from} max={f.to} onChange={(e) => update({ from: e.target.value || null })} />
            </label>
            <label className="flex flex-[1_1_130px] flex-col gap-1.5 text-[13px] font-bold text-muted">
              {s.filters.to}
              <Input type="date" value={f.to} min={f.from} onChange={(e) => update({ to: e.target.value || null })} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              tone="chips"
              label={s.filters.status}
              value={f.status}
              onChange={(v) => update({ st: v === 'all' ? null : v })}
              options={STATUS_TABS.map((st) => ({
                value: st,
                label: st === 'all' ? s.filters.all : t.status[st],
                count: base.filter((r) => st === 'all' || r.status === st).length,
              }))}
            />
            {hasFilters && (
              <Button variant="ghost" size="sm" className="ms-auto" onClick={clear}>
                {s.filters.clear}
              </Button>
            )}
          </div>
        </section>

        {/* Table */}
        <section className={clsx(cardClass, 'overflow-hidden')}>
          <div className="overflow-x-auto">
            <div className="min-w-[1096px]">
              <div aria-hidden="true" className={clsx(COLS, 'bg-surface-2 px-4 py-3 text-[13px] font-bold text-muted')}>
                {[s.cols.id, s.cols.branch, s.cols.district, s.cols.material, s.cols.kg, s.cols.age, s.cols.status, s.cols.visit, s.cols.driver].map((c) => (
                  <span key={c}>
                    {c}
                  </span>
                ))}
              </div>

              {requests.isError ? (
                <div role="alert" className="flex flex-col items-center gap-2.5 border-t border-line px-5 py-14 text-center">
                  <div className="text-lg font-extrabold text-danger-ink">{s.errorTitle}</div>
                  <div className="text-sm text-muted">{s.errorBody}</div>
                  <Button variant="gold" onClick={() => requests.refetch()} className="mt-1">
                    {t.retry}
                  </Button>
                </div>
              ) : !requests.data ? (
                <LoadingBlock>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 border-t border-line px-5 py-[18px]">
                      <Skeleton className="h-4 w-[90px]" />
                      <Skeleton className="h-4 w-[220px]" />
                      <Skeleton className="h-4 w-[120px]" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </LoadingBlock>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 border-t border-line px-5 py-14 text-center">
                  <div className="text-lg font-extrabold">{s.emptyTitle}</div>
                  <div className="max-w-[440px] text-sm text-muted">{s.emptyBody}</div>
                </div>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 border-t border-line px-5 py-12 text-center">
                  <div className="text-lg font-extrabold">{s.noMatch}</div>
                  <div className="text-sm text-muted">{s.noMatchBody}</div>
                  <Button onClick={clear} className="mt-1">
                    {s.filters.clear}
                  </Button>
                </div>
              ) : (
                visible.map((r) => {
                  const age = ageInDays(r.createdAt);
                  const label = branchLabel(r.branch, lang);
                  const fromDashboard = r.createdBy.kind === 'user';
                  return (
                    <button
                      key={r.id}
                      type="button"
                      aria-label={s.rowAria(r.id, label)}
                      onClick={() => update({ open: r.id })}
                      className={clsx(COLS, 'w-full cursor-pointer border-0 border-t border-solid border-line bg-transparent px-4 py-3.5 text-start text-sm text-ink transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary')}
                    >
                      <span className="font-bold text-primary">
                        {r.id}
                        {fromDashboard && <span className="block text-[11px] font-bold text-accent-ink">{s.fromDashboard}</span>}
                      </span>
                      <span className="font-bold">
                        {label}
                        <span className="block text-xs font-normal text-muted">{cityName(r.branch, lang)}</span>
                      </span>
                      <span>{districtName(r.branch.district, lang)}</span>
                      <span>
                        <MaterialChip material={r.material} subtype={r.subtype} />
                      </span>
                      <span>{r.kg ? `${r.kg} ${t.kg}` : '—'}</span>
                      <span className={r.status === 'waiting' && age >= 1 ? 'font-extrabold text-danger-ink' : ''}>
                        {s.age(age)}
                      </span>
                      <span>
                        <StatusPill status={r.status} />
                      </span>
                      <span>{r.visitDay ? formatDay(r.visitDay, lang, 'numeric') : '—'}</span>
                      <span className="text-muted">
                        {driverName(r.driverId)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          {requests.data && rows.length > 0 && <div className="border-t border-line px-5 py-3 text-[13px] text-muted">{s.footer(visible.length, base.length)}</div>}
        </section>
      </PageBody>

      <RequestDrawer requestId={openId} onClose={() => update({ open: null })} />
      <AddRequestDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-[1_1_120px] flex-col gap-1.5 text-[13px] font-bold text-muted">
      {label}
      <Select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {children}
      </Select>
    </label>
  );
}
