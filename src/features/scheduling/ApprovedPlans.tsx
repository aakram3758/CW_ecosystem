import { useState } from 'react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useApp, useStrings } from '../../lib/app-context';
import { errorText } from '../../lib/supabase';
import { useApprovals, useChangePlanDriver, useUsers } from '../../data/queries';
import type { RequestRow } from '../../data/api';
import { CITIES, MATERIALS } from '../../data/catalog';
import type { CityCode, DayKey, Driver, MaterialCode } from '../../data/types';
import { outcomeOn, plansFor, visitCount } from '../../data/selectors';
import { formatRelative } from '../../lib/dates';
import { branchLabel, districtName, typeLabel } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { OutcomePill } from '../../components/ui/Badges';
import { EmptyState, cardClass } from '../../components/ui/States';
import { DriverChip } from './BuildPlan';
import { driverColor } from './planModel';
import { SCHEDULING_STRINGS } from './strings';

export function ApprovedPlans({
  rows,
  drivers,
  city,
  material,
  day,
  planDay,
  planDayName,
  onBuild,
}: {
  rows: RequestRow[];
  drivers: Driver[];
  city: CityCode;
  material: MaterialCode;
  day: DayKey;
  planDay: DayKey;
  planDayName: string;
  onBuild: () => void;
}) {
  const { t, l, lang, theme, user } = useApp();
  const s = useStrings(SCHEDULING_STRINGS);
  const { data: approvals = [] } = useApprovals();
  const { data: users = [] } = useUsers();
  const change = useChangePlanDriver(user.id);
  const [changing, setChanging] = useState<string | null>(null);
  const [changeTo, setChangeTo] = useState('');

  const plans = plansFor(rows, day, city, material);
  const keyDrivers = drivers.filter((d) => d.city === city && d.material === material);
  const colorOf = (id: string) => driverColor(keyDrivers.findIndex((d) => d.id === id), theme === 'dark');
  const sep = lang === 'ar' ? '، ' : ', ';

  if (plans.length === 0) {
    return (
      <EmptyState
        title={s.noApproved(l(MATERIALS[material].name), l(CITIES[city]))}
        body={s.noApprovedBody}
        action={
          <Button variant="gold" size="lg" onClick={onBuild}>
            {s.buildPlan(planDayName)}
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(380px,100%),1fr))] items-start gap-4">
      {plans.map((plan) => {
        const driver = drivers.find((d) => d.id === plan.driverId);
        const name = driver ? l(driver.name) : '—';
        const pending = plan.items.filter((r) => r.status === 'scheduled');
        const isChanging = changing === plan.driverId;
        // A driver can be swapped for visits not made yet. For the next day only drivers available that day.
        const alternatives = keyDrivers.filter((d) => d.id !== plan.driverId && d.active && (day !== planDay || d.availableNextDay));
        const who = approvals
          .filter((a) => a.day === day && a.driverId === plan.driverId)
          .sort((a, b) => a.at.localeCompare(b.at))
          .map((a) => `${l(users.find((u) => u.id === a.userId)?.name ?? { ar: '—', en: '—' })} · ${formatRelative(a.at, lang)}`)
          .join(sep);

        return (
          <article key={plan.driverId} aria-label={name} className={clsx(cardClass, 'flex flex-col gap-3.5 p-[18px]')}>
            <div className="flex items-center gap-3">
              <DriverChip name={name} color={colorOf(plan.driverId)} size={44} />
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-extrabold">{name}</div>
                <div className="text-[13px] text-muted">
                  {s.planMeta([...new Set(plan.items.map((r) => districtName(r.branch.district, lang)))].join(sep), visitCount(plan.items), plan.items.length)}
                </div>
              </div>
              <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-extrabold text-success">{s.approvedBadge}</span>
            </div>
            {who && <div className="text-xs text-muted">{s.approvedBy(who)}</div>}

            {isChanging && (
              <div className="flex flex-col gap-2.5 rounded-[14px] bg-accent-soft p-3">
                <label className="flex flex-col gap-1.5 text-[13px] font-bold text-accent-ink">
                  {s.newDriverFor(name)}
                  <select className="fld" value={changeTo} onChange={(e) => setChangeTo(e.target.value)}>
                    <option value="">{s.chooseDriver}</option>
                    {alternatives.map((d) => (
                      <option key={d.id} value={d.id}>
                        {l(d.name)}
                      </option>
                    ))}
                  </select>
                </label>
                {alternatives.length === 0 && <div className="text-[13px] text-accent-ink">{s.noAltDriver}</div>}
                <div className="flex gap-2">
                  <Button
                    variant="gold"
                    disabled={!changeTo || change.isPending}
                    onClick={async () => {
                      try {
                        await change.mutateAsync({ day, from: plan.driverId, to: changeTo });
                        toast.success(s.toastChanged(l(drivers.find((d) => d.id === changeTo)!.name)));
                        setChanging(null);
                      } catch (e) {
                        toast.error(errorText(e, t));
                      }
                    }}
                  >
                    {s.confirmChange}
                  </Button>
                  <Button onClick={() => setChanging(null)}>{t.cancel}</Button>
                </div>
              </div>
            )}

            <ul className="m-0 flex list-none flex-col p-0">
              {plan.items.map((r) => (
                <li key={r.id} className="flex items-center gap-2.5 border-t border-line py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{branchLabel(r.branch, lang)}</span>
                    <span className="text-xs text-muted">
                      {typeLabel(r.material, r.subtype, lang)}
                      {r.kg ? ` · ${r.kg} ${t.kg}` : ''}
                    </span>
                  </span>
                  <OutcomePill outcome={outcomeOn(r, day)} />
                </li>
              ))}
            </ul>

            {!isChanging && pending.length > 0 && (
              <Button
                className="self-start"
                onClick={() => {
                  setChanging(plan.driverId);
                  setChangeTo('');
                }}
              >
                {s.changeDriver}
              </Button>
            )}
          </article>
        );
      })}
    </div>
  );
}
