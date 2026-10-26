import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useApp, usePageTitle, useStrings } from '../../lib/app-context';
import { useDrivers, useRequests } from '../../data/queries';
import { CITIES, CITY_ORDER, MATERIALS, MATERIAL_ORDER } from '../../data/catalog';
import type { CityCode, MaterialCode } from '../../data/types';
import { daysBetween, formatDay, nextWorkingDay, opsToday } from '../../lib/dates';
import { materialColor } from '../../lib/format';
import { HeroTitle, PageBody, PageHero } from '../../components/layout/PageHero';
import { ToggleGroup } from '../../components/ui/Toggles';
import { EmptyState, ErrorState, LoadingBlock, Skeleton, cardClass } from '../../components/ui/States';
import { BuildPlan } from './BuildPlan';
import { ApprovedPlans } from './ApprovedPlans';
import { SCHEDULING_STRINGS } from './strings';
import { useDraft } from './draftStore';
import { buildModel, type PlanModel } from './planModel';

export type Tab = 'build' | 'approved';

export function SchedulingPage() {
  const { t, l, lang, theme, user } = useApp();
  const s = useStrings(SCHEDULING_STRINGS);
  usePageTitle(t.nav.scheduling);
  const [params] = useSearchParams();

  const today = opsToday();
  const planDay = nextWorkingDay(today);
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'approved' ? 'approved' : 'build');
  const [material, setMaterial] = useState<MaterialCode>(user.material ?? 'card');
  const [city, setCity] = useState<CityCode>('jed');
  const [day, setDay] = useState<string>(params.get('day') === 'today' ? today : planDay);

  const requests = useRequests();
  const drivers = useDrivers();
  const [draft] = useDraft(`${city}|${material}`);
  const model = requests.data && drivers.data ? buildModel(requests.data, drivers.data, city, material, planDay, draft) : null;
  const matName = l(MATERIALS[material].name);
  const cityLabel = l(CITIES[city]);
  const planDayName = formatDay(planDay, lang, 'weekday');

  return (
    <>
      <PageHero crumb={t.nav.scheduling}>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <HeroTitle
            title={t.nav.scheduling}
            line={tab === 'build' ? s.heroBuild(formatDay(planDay, lang, 'long'), matName, cityLabel) : s.heroApproved(matName, cityLabel)}
          />
          <div role="tablist" aria-label={s.tabsLabel} className="flex gap-1 rounded-2xl border border-white/[.12] bg-white/[.07] p-1">
            {(['build', 'approved'] as Tab[]).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={clsx(
                  'min-h-[42px] cursor-pointer rounded-xl border-0 px-[18px] text-sm font-bold focus-visible:outline-2 focus-visible:outline-gold',
                  tab === k ? 'bg-gold text-navy-ink' : 'bg-transparent text-side-text hover:bg-white/[.08]',
                )}
              >
                {k === 'build' ? s.tabBuild : s.tabApproved}
              </button>
            ))}
          </div>
        </div>
      </PageHero>

      <PageBody>
        <section className={clsx(cardClass, 'flex flex-col gap-4 p-[18px]')}>
          {tab === 'build' && <Steps model={model} />}
          <div className="flex flex-wrap items-end gap-3.5">
            <div className="flex flex-col gap-1.5 text-[13px] font-bold text-muted">
              {t.material}
              <ToggleGroup
                label={t.material}
                value={material}
                onChange={setMaterial}
                options={MATERIAL_ORDER.map((m) => ({
                  value: m,
                  label: (
                    <>
                      <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: materialColor(m, theme === 'dark') }} />
                      {l(MATERIALS[m].name)}
                    </>
                  ),
                }))}
              />
            </div>
            <div className="flex flex-col gap-1.5 text-[13px] font-bold text-muted">
              {t.city}
              <ToggleGroup label={t.city} value={city} onChange={setCity} options={CITY_ORDER.map((c) => ({ value: c, label: l(CITIES[c]) }))} />
            </div>
            {tab === 'build' ? (
              <div className="flex flex-col gap-1.5 text-[13px] font-bold text-muted">
                {s.visitDay}
                <span className="inline-flex min-h-12 items-center gap-2 rounded-[14px] bg-accent-soft px-3.5 text-sm font-extrabold text-accent-ink">
                  {formatDay(planDay, lang, 'short')}
                  <span className="text-xs font-medium">{s.nextWorkingDay(daysBetween(today, planDay) > 1)}</span>
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 text-[13px] font-bold text-muted">
                {s.dayLabel}
                <ToggleGroup
                  tone="chips"
                  label={s.dayLabel}
                  value={day}
                  onChange={setDay}
                  options={[
                    { value: today, label: s.today(formatDay(today, lang, 'short')) },
                    { value: planDay, label: s.next(formatDay(planDay, lang, 'short')) },
                  ]}
                />
              </div>
            )}
          </div>
        </section>

        {requests.isError || drivers.isError ? (
          <ErrorState
            title={s.errorTitle}
            body={s.errorBody}
            onRetry={() => {
              if (requests.isError) requests.refetch();
              if (drivers.isError) drivers.refetch();
            }}
          />
        ) : !requests.data || !drivers.data ? (
          <LoadingBlock>
            <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-[18px]">
              <Skeleton className="h-5 w-[30%]" />
              <Skeleton className="h-[52px]" />
              <Skeleton className="h-11" />
              <Skeleton className="h-11" />
              <Skeleton className="h-[52px]" />
            </div>
          </LoadingBlock>
        ) : requests.data.length === 0 ? (
          <EmptyState title={s.emptyTitle} body={s.emptyBody} />
        ) : tab === 'build' ? (
          <BuildPlan
            key={`${city}|${material}`}
            rows={requests.data}
            drivers={drivers.data}
            city={city}
            material={material}
            planDay={planDay}
            onApproved={() => {
              setTab('approved');
              setDay(planDay);
            }}
            onShowApproved={() => {
              setTab('approved');
              setDay(planDay);
            }}
          />
        ) : (
          <ApprovedPlans
            rows={requests.data}
            drivers={drivers.data}
            city={city}
            material={material}
            day={day}
            planDay={planDay}
            planDayName={planDayName}
            onBuild={() => setTab('build')}
          />
        )}
      </PageBody>
    </>
  );
}

/** "1 المادة والمدينة ✓ ‹ 2 عيّن السائقين ‹ 3 اعتمد" */
function Steps({ model }: { model: PlanModel | null }) {
  const s = useStrings(SCHEDULING_STRINGS);
  const allAssigned = !!model && model.assigned.length > 0 && model.unassigned.length === 0;
  const states: StepState[] = ['done', allAssigned ? 'done' : 'active', allAssigned ? 'active' : 'next'];
  return <StepsView states={states} labels={[s.steps.pick, s.steps.assign, s.steps.approve]} aria={s.steps.label} />;
}

type StepState = 'done' | 'active' | 'next';

function StepsView({ states, labels, aria }: { states: StepState[]; labels: string[]; aria: string }) {
  return (
    <ol aria-label={aria} className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
      {labels.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            aria-current={states[i] === 'active' ? 'step' : undefined}
            className={clsx(
              'inline-flex items-center gap-2 rounded-full border py-1.5 pe-3.5 ps-1.5 text-sm font-bold',
              states[i] === 'active' && 'border-accent bg-accent-soft text-accent-ink',
              states[i] === 'done' && 'border-transparent bg-success-soft text-success',
              states[i] === 'next' && 'border-transparent bg-surface-2 text-muted',
            )}
          >
            <span
              className={clsx(
                'inline-flex size-[26px] items-center justify-center rounded-full text-[13px] font-extrabold',
                states[i] === 'active' && 'bg-gold text-navy-ink',
                states[i] === 'done' && 'bg-success text-white',
                states[i] === 'next' && 'bg-line text-muted',
              )}
            >
              {states[i] === 'done' ? '✓' : i + 1}
            </span>
            {label}
          </span>
          {i < labels.length - 1 && (
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted ltr:-scale-x-100">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          )}
        </li>
      ))}
    </ol>
  );
}
