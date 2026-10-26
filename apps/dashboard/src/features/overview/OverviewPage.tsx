import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useApp, usePageTitle, useStrings } from '../../lib/app-context';
import { useBranches, useLateBranches, useRequests } from '../../data/queries';
import { lateBranches, overviewSummary, staleWaiting, type LateBranch, type OverviewSummary } from '../../data/selectors';
import { CITIES, CITY_ORDER, MATERIALS, MATERIAL_ORDER } from '../../data/catalog';
import type { CityCode, Filter, MaterialCode } from '../../data/types';
import type { RequestRow } from '../../data/api';
import { ageInDays, daysBetween, formatDay, formatNumber, nextWorkingDay, opsHour, opsToday } from '../../lib/dates';
import { branchLabel, branchLogin, cityName, typeLabel } from '../../lib/format';
import { PageBody, PageHero } from '../../components/layout/PageHero';
import { ChevronForward, Icon, type IconName } from '../../components/ui/Icon';
import { ButtonLink, Button } from '../../components/ui/Button';
import { MaterialTile } from '../../components/ui/Badges';
import { ToggleGroup } from '../../components/ui/Toggles';
import { EmptyState, ErrorState, LoadingBlock, Skeleton, cardClass } from '../../components/ui/States';
import { Sheet } from '../../components/ui/Dialog';
import { AddRequestDialog, type AddRequestDefaults } from '../requests/AddRequestDialog';
import { OVERVIEW_STRINGS } from './strings';

export function OverviewPage() {
  const { t, l, lang, user } = useApp();
  const s = useStrings(OVERVIEW_STRINGS);
  usePageTitle(t.nav.overview);

  const [city, setCity] = useState<Filter<CityCode>>('all');
  const [material, setMaterial] = useState<Filter<MaterialCode>>(user.material ?? 'all');
  const [lateOpen, setLateOpen] = useState(false);
  const [addFor, setAddFor] = useState<AddRequestDefaults | null>(null);

  const requests = useRequests();
  const branches = useBranches();
  const lateRefs = useLateBranches();
  const queries = [requests, branches, lateRefs];
  const failed = queries.some((q) => q.isError);
  const ready = requests.data && branches.data && lateRefs.data;

  const today = opsToday();
  const planDay = nextWorkingDay(today);

  const summary = useMemo(
    () => (requests.data ? overviewSummary(requests.data, city, material) : null),
    [requests.data, city, material],
  );
  const stale = useMemo(() => (requests.data ? staleWaiting(requests.data, city, material) : []), [requests.data, city, material]);
  const late = useMemo(() => (lateRefs.data && branches.data ? lateBranches(branches.data, lateRefs.data, city) : []), [lateRefs.data, branches.data, city]);

  const materialName = material === 'all' ? null : l(MATERIALS[material].name);

  return (
    <>
      <PageHero crumb={t.nav.overview}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-2.5 text-sm text-side-muted">{formatDay(today, lang, 'full')}</div>
            <h1 className="m-0 text-[32px] font-extrabold leading-tight sm:text-[40px]">
              {s.greeting(opsHour(), l(user.firstName))}
              <br />
              <span className="text-gold">{summary ? s.heroLine(summary.waiting) + (materialName ? ` · ${materialName}` : '') : ' '}</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select aria-label={t.material} className="fld-on-dark" value={material} onChange={(e) => setMaterial(e.target.value as Filter<MaterialCode>)}>
              <option value="all">{t.allMaterials}</option>
              {MATERIAL_ORDER.map((m) => (
                <option key={m} value={m}>
                  {l(MATERIALS[m].name)}
                </option>
              ))}
            </select>
            <ToggleGroup
              tone="dark"
              label={t.city}
              value={city}
              onChange={setCity}
              options={[{ value: 'all', label: t.allCities }, ...CITY_ORDER.map((c) => ({ value: c, label: l(CITIES[c]) }))]}
            />
          </div>
        </div>
      </PageHero>

      <PageBody>
        {failed ? (
          <ErrorState body={s.errorBody} onRetry={() => queries.forEach((q) => q.isError && q.refetch())} />
        ) : !ready || !summary ? (
          <OverviewSkeleton />
        ) : requests.data.length === 0 ? (
          <EmptyState title={s.empty.title} body={s.empty.body} action={<ButtonLink to="/branches" variant="gold" size="lg">{s.empty.cta}</ButtonLink>} />
        ) : (
          <div aria-busy={requests.isFetching} className="flex flex-col gap-5">
            <KpiCards summary={summary} />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] items-start gap-4">
              {stale.length > 0 && <StaleList rows={stale} planDayName={formatDay(planDay, lang, 'weekday')} />}
              <LateCard late={late} onOpen={() => setLateOpen(true)} />
            </div>
            <ActionCards summary={summary} planDay={planDay} today={today} />
          </div>
        )}
      </PageBody>

      <Sheet
        open={lateOpen}
        onOpenChange={setLateOpen}
        width={460}
        title={s.late.sheetKicker(city === 'all' ? t.allCities : l(CITIES[city]))}
        header={
          <>
            <div className="text-[22px] font-extrabold">{s.late.sheetTitle(late.length)}</div>
            <div className="text-[13px] text-side-text">{s.late.sheetBody}</div>
          </>
        }
      >
        <ul className="m-0 flex list-none flex-col gap-2 px-4 py-3">
          {late.map((lb) => (
            <li key={lb.branch.id} className="flex items-center gap-2.5 rounded-[14px] border border-line bg-surface p-3">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-extrabold">{branchLabel(lb.branch, lang)}</span>
                <span className="text-xs text-muted">
                  {cityName(lb.branch, lang)} · {s.late.login(branchLogin(lb.branch, lang))}
                </span>
                <span className="text-xs font-extrabold text-danger-ink">
                  {s.late.lastLabel}
                  {s.late.last(lb.lastDays)}
                </span>
              </span>
              <Button variant="gold" size="sm" onClick={() => setAddFor({ chain: lb.branch.chain, number: lb.branch.number })}>
                {s.late.add}
              </Button>
            </li>
          ))}
        </ul>
      </Sheet>

      <AddRequestDialog open={!!addFor} onOpenChange={(o) => !o && setAddFor(null)} defaults={addFor ?? undefined} />
    </>
  );
}

/* ---------------------------------------------------------------- pieces */

function KpiCards({ summary: k }: { summary: OverviewSummary }) {
  const { lang } = useApp();
  const s = useStrings(OVERVIEW_STRINGS);
  const cards: { value: number; title: string; sub: string; alert?: boolean; icon: IconName; chip: string; to: string }[] = [
    { value: k.waiting, title: s.kpi.waiting, sub: s.kpi.waitingSub, icon: 'clock', chip: 'bg-accent-soft text-accent-ink', to: '/requests?st=waiting' },
    { value: k.scheduledToday, title: s.kpi.today, sub: s.kpi.todaySub(k.driversToday), icon: 'cal', chip: 'bg-primary-soft text-primary', to: '/scheduling?tab=approved&day=today' },
    {
      value: k.needsDecision,
      title: s.kpi.decision,
      sub: k.staleDecisions ? s.kpi.stale(k.staleDecisions) : s.kpi.decisionSub(k.partial, k.failed, k.noResult),
      alert: k.staleDecisions > 0,
      icon: 'warn',
      chip: 'bg-danger-soft text-danger-ink',
      to: '/decisions',
    },
    { value: k.completedWeek, title: s.kpi.done, sub: s.kpi.doneSub(formatNumber(k.kgWeek, lang)), icon: 'check', chip: 'bg-success-soft text-success', to: '/reports' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {cards.map((c) => (
        <Link
          key={c.title}
          to={c.to}
          className={clsx(cardClass, 'flex flex-col gap-3.5 p-4 text-ink no-underline transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-primary sm:p-5')}
        >
          <span className="flex items-center justify-between">
            <span className={clsx('inline-flex size-11 items-center justify-center rounded-[14px]', c.chip)}>
              <Icon name={c.icon} size={22} />
            </span>
            <ChevronForward className="text-muted" />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[38px] font-extrabold leading-none">{formatNumber(c.value, lang)}</span>
            <span className="text-[15px] font-bold">{c.title}</span>
            <span className={clsx('text-[13px]', c.alert ? 'font-extrabold text-danger-ink' : 'text-muted')}>{c.sub}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function StaleList({ rows, planDayName }: { rows: RequestRow[]; planDayName: string }) {
  const { lang, l } = useApp();
  const s = useStrings(OVERVIEW_STRINGS);
  return (
    <section aria-labelledby="stale-title" className={clsx(cardClass, 'flex flex-col gap-3.5 px-[22px] py-5')}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
          <Icon name="clock" size={22} />
        </span>
        <div className="min-w-[200px] flex-1">
          <h2 id="stale-title" className="m-0 text-[17px] font-extrabold">
            {s.stale.title(rows.length)}
          </h2>
          <div className="text-[13px] text-muted">{s.stale.sub(planDayName)}</div>
        </div>
        <ButtonLink to="/requests?st=waiting">{s.stale.viewAll}</ButtonLink>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.slice(0, 5).map((r) => (
          <li key={r.id}>
            <Link to={`/requests?open=${r.id}`} className="flex items-center gap-2.5 rounded-[14px] bg-surface-2 px-3 py-2.5 text-ink no-underline hover:brightness-[.98]">
              <MaterialTile material={r.material} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-bold">{branchLabel(r.branch, lang)}</span>
                <span className="text-xs text-muted">
                  {l(MATERIALS[r.material].name)}
                  {r.subtype ? ` · ${typeLabel(r.material, r.subtype, lang)}` : ''} · {cityName(r.branch, lang)}
                </span>
              </span>
              <span className="whitespace-nowrap rounded-full bg-danger-soft px-2.5 py-1 text-xs font-extrabold text-danger-ink">{s.stale.age(ageInDays(r.createdAt))}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LateCard({ late, onOpen }: { late: LateBranch[]; onOpen: () => void }) {
  const { lang } = useApp();
  const s = useStrings(OVERVIEW_STRINGS);
  return (
    <section aria-labelledby="late-title" className={clsx(cardClass, 'flex flex-col gap-3.5 px-[22px] py-5')}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-danger-soft text-danger-ink">
          <Icon name="bld" size={22} />
        </span>
        <div className="min-w-[200px] flex-1">
          <h2 id="late-title" className="m-0 text-[17px] font-extrabold">
            {s.late.title}
          </h2>
          <div className="text-[13px] text-muted">{s.late.sub}</div>
        </div>
        <span className="text-[32px] font-extrabold text-danger-ink">{late.length}</span>
      </div>
      {late.length === 0 ? (
        <div className="text-sm font-bold text-success">{s.late.none}</div>
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {late.slice(0, 3).map((lb) => (
              <li key={lb.branch.id} className="flex items-center gap-2.5 rounded-[14px] bg-surface-2 px-3 py-2.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-bold">{branchLabel(lb.branch, lang)}</span>
                  <span className="text-xs text-muted">{cityName(lb.branch, lang)}</span>
                </span>
                <span className="whitespace-nowrap text-xs font-extrabold text-danger-ink">{s.late.last(lb.lastDays)}</span>
              </li>
            ))}
          </ul>
          <Button onClick={onOpen} className="self-start">
            {s.late.button(late.length)}
          </Button>
        </>
      )}
    </section>
  );
}

function ActionCards({ summary: k, planDay, today }: { summary: OverviewSummary; planDay: string; today: string }) {
  const { lang } = useApp();
  const s = useStrings(OVERVIEW_STRINGS);
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
      <section className={clsx(cardClass, 'flex flex-col gap-4 p-[22px]')}>
        <div className="flex items-start gap-3.5">
          <span className="inline-flex size-12 flex-none items-center justify-center rounded-[14px] bg-accent-soft text-accent-ink">
            <Icon name="cal" size={24} />
          </span>
          <div>
            <h2 className="m-0 mb-1 text-xl font-extrabold">{s.plan.title(formatDay(planDay, lang, 'weekday'))}</h2>
            <div className="text-sm text-muted">{s.plan.sub(formatDay(planDay, lang, 'long'), daysBetween(today, planDay) > 1, k.waiting)}</div>
          </div>
        </div>
        <ButtonLink to="/scheduling" variant="gold" size="lg" className="self-start">
          <Icon name="spark" size={18} />
          {s.plan.cta(formatDay(planDay, lang, 'long'))}
        </ButtonLink>
      </section>

      <section className={clsx(cardClass, 'flex flex-col gap-4 p-[22px]')}>
        <div className="flex items-start gap-3.5">
          <span className="inline-flex size-12 flex-none items-center justify-center rounded-[14px] bg-danger-soft text-danger-ink">
            <Icon name="warn" size={24} />
          </span>
          <div>
            <h2 className="m-0 mb-1 text-xl font-extrabold">{s.queue.title}</h2>
            <div className="text-sm text-muted">{s.queue.sub(k.needsDecision, k.partial, k.failed, k.noResult)}</div>
            {k.staleDecisions > 0 && <div className="mt-1.5 text-[13px] font-extrabold text-danger-ink">{s.queue.stale(k.staleDecisions)}</div>}
          </div>
        </div>
        <ButtonLink to="/decisions" variant="primary" size="lg" className="self-start">
          {s.queue.cta}
          <ChevronForward />
        </ButtonLink>
      </section>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <LoadingBlock>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-3.5 rounded-[20px] border border-line bg-surface p-5">
              <Skeleton className="size-11" />
              <Skeleton className="h-[34px] w-[70px]" />
              <Skeleton className="h-3.5 w-3/5" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[150px] !rounded-[20px]" />
      </div>
    </LoadingBlock>
  );
}
