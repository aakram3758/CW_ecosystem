import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useApp, usePageTitle, useStrings } from '../../lib/app-context';
import { useCatalog, useDriverActivity, useDrivers } from '../../data/queries';
import { createDriver, createDriverLogin, resetPassword, setDriverActive, setDriverDay, updateDriver, type DriverActivity } from '../../data/admin';
import { CITIES, CITY_ORDER, MATERIAL_ORDER, materialInfo } from '../../data/catalog';
import type { CityCode, Driver, Filter, MaterialCode } from '../../data/types';
import { initials } from '../../lib/format';
import { formatDay, isWorkingDay, nextWorkingDay, opsToday } from '../../lib/dates';
import { ar as arN, en as enN } from '../../i18n/plural';
import { HeroTitle, PageBody, PageHero } from '../../components/layout/PageHero';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field, Input, Select } from '../../components/ui/Field';
import { ToggleGroup } from '../../components/ui/Toggles';
import { EmptyState, ErrorState, LoadingBlock, Skeleton, cardClass } from '../../components/ui/States';
import { ADMIN_STRINGS, ConfirmDialog, IconButton, PHONE_RE, PasswordDialog, Pill, Switch, useRun, type PasswordTarget } from '../admin/shared';
import { DRIVERS_STRINGS } from './strings';

const COLS = 'grid-cols-[minmax(170px,1.3fr)_120px_100px_80px_110px_120px_90px_70px_130px]';

function MaterialPill({ material }: { material: MaterialCode }) {
  const { l, theme } = useApp();
  const m = materialInfo(material);
  const c = theme === 'dark' ? m.colorDark : m.colorLight;
  return (
    <span className="inline-flex items-center justify-self-start whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold" style={{ color: c, background: `${c}1F` }}>
      {l(m.name)}
    </span>
  );
}

/** Drivers: who works which day (feeds Scheduling and the days-off count in Reports), plus their app login. */
export function DriversPage() {
  const { t, l, lang } = useApp();
  const s = useStrings(DRIVERS_STRINGS);
  const a = useStrings(ADMIN_STRINGS);
  usePageTitle(t.nav.drivers);

  useCatalog();
  const drivers = useDrivers();
  const activity = useDriverActivity();
  const { run, busy } = useRun();

  const [city, setCity] = useState<Filter<CityCode>>('all');
  const [material, setMaterial] = useState<Filter<MaterialCode>>('all');
  const [q, setQ] = useState('');
  const [form, setForm] = useState<{ driver: Driver | null } | null>(null);
  const [pw, setPw] = useState<PasswordTarget | null>(null);
  const [conf, setConf] = useState<{ kind: 'today' | 'next' | 'deact'; d: Driver; visits: number } | null>(null);

  const today = opsToday();
  const next = nextWorkingDay(today);
  const todayWorking = isWorkingDay(today);
  const dayShort = (d: string) => formatDay(d, lang, 'short');
  const nextName = formatDay(next, lang, 'long');

  const act = useMemo(() => new Map((activity.data ?? []).map((x) => [x.driver_id, x])), [activity.data]);
  const all = drivers.data ?? [];
  const needle = q.trim().toLowerCase();
  const shown = all
    .filter((d) => (city === 'all' || d.city === city) && (material === 'all' || d.material === material))
    .filter((d) => !needle || d.name.ar.includes(needle) || d.name.en.toLowerCase().includes(needle) || d.phone.includes(needle))
    .sort((x, y) => Number(y.active) - Number(x.active) || Number(!act.get(y.id)?.off_today) - Number(!act.get(x.id)?.off_today) || x.name.ar.localeCompare(y.name.ar, 'ar'));

  const workingToday = todayWorking ? all.filter((d) => d.active && !act.get(d.id)?.off_today).length : null;
  const availableNext = all.filter((d) => d.active && !act.get(d.id)?.off_next).length;

  const pwTarget = (d: Driver, userId: string | null): PasswordTarget => ({
    name: l(d.name),
    login: d.phone,
    phone: d.phone,
    app: s.app,
    userId,
    create: () => createDriverLogin(d.id),
    reset: (id) => resetPassword(id),
  });

  const toggleDay = (d: Driver, which: 'today' | 'next', x?: DriverActivity) => {
    const off = which === 'today' ? !!x?.off_today : !!x?.off_next;
    const visits = which === 'today' ? (x?.visits_today ?? 0) : (x?.visits_next ?? 0);
    const day = which === 'today' ? today : next;
    const dayLabel = which === 'today' ? (lang === 'ar' ? 'اليوم' : 'today') : nextName;
    if (!off && visits > 0) return setConf({ kind: which, d, visits });
    void run(() => setDriverDay(d.id, day, off), off ? s.dayOn(l(d.name), dayLabel) : s.dayOff(l(d.name), dayLabel));
  };

  return (
    <>
      <PageHero crumb={t.nav.drivers} parent={t.nav.adminSection}>
        <HeroTitle title={t.nav.drivers} line={drivers.data && activity.data ? s.heroLine(workingToday, availableNext, nextName) : ' '} />
      </PageHero>

      <PageBody>
        <section className={clsx(cardClass, 'flex flex-col gap-3 px-[18px] py-4')}>
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              tone="chips"
              label={s.cityLabel}
              value={city}
              onChange={setCity}
              options={[{ value: 'all' as Filter<CityCode>, label: s.allCities }, ...CITY_ORDER.map((c) => ({ value: c, label: l(CITIES[c]) }))]}
            />
            <Select aria-label={t.material} value={material} onChange={(e) => setMaterial(e.target.value)} className="!w-auto min-w-[150px]">
              <option value="all">{t.allMaterials}</option>
              {MATERIAL_ORDER.map((m) => (
                <option key={m} value={m}>
                  {l(materialInfo(m).name)}
                </option>
              ))}
            </Select>
            <Input type="search" aria-label={s.searchLabel} placeholder={s.searchPh} value={q} onChange={(e) => setQ(e.target.value)} className="!w-[200px]" />
            <span className="flex-1" />
            <Button variant="primary" onClick={() => setForm({ driver: null })}>
              {s.addDriver}
            </Button>
          </div>
          <div className="text-[13px] text-muted">{s.note(nextName)}</div>
        </section>

        {drivers.isError ? (
          <ErrorState title={s.loadError} body={a.loadBody} onRetry={() => drivers.refetch()} />
        ) : !drivers.data ? (
          <LoadingBlock>
            <div className={clsx(cardClass, 'flex flex-col gap-3 p-5')}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          </LoadingBlock>
        ) : all.length === 0 ? (
          <EmptyState icon="truck" title={s.emptyTitle} body={s.emptyBody} action={<Button variant="gold" size="lg" onClick={() => setForm({ driver: null })}>{s.addDriver}</Button>} />
        ) : (
          <>
            <section className={clsx(cardClass, 'overflow-x-auto')}>
              <div className="min-w-[1100px]">
                <div className={clsx('grid gap-2.5 bg-surface-2 px-4 py-2.5 text-[13px] font-bold text-muted', COLS)}>
                  {s.cols(dayShort(today), dayShort(next)).map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
                {shown.map((d) => {
                  const x = act.get(d.id);
                  const name = l(d.name);
                  const on1 = d.active && todayWorking && !x?.off_today;
                  const on2 = d.active && !x?.off_next;
                  const hasLogin = x ? x.has_login : !!d.userId;
                  return (
                    <div key={d.id} data-testid="driver-row" className={clsx('grid items-center gap-2.5 border-t border-line px-4 py-2.5', COLS, !d.active && 'opacity-60')}>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className={clsx('inline-flex size-9 flex-none items-center justify-center rounded-xl text-xs font-extrabold', on1 ? 'bg-side text-gold' : 'bg-surface-2 text-muted')}>
                          {initials(name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-bold">{name}</span>
                          {!hasLogin && <span className="text-xs text-muted">{s.noLogin}</span>}
                        </span>
                      </span>
                      <span dir="ltr" className="text-start text-sm">
                        {d.phone}
                      </span>
                      <MaterialPill material={d.material} />
                      <span className="text-sm">{CITIES[d.city] ? l(CITIES[d.city]) : '—'}</span>
                      <span className="flex items-center gap-2">
                        {todayWorking ? (
                          <>
                            <Switch on={on1} label={s.aDay(name, lang === 'ar' ? 'اليوم' : 'today')} disabled={!d.active || busy} onClick={() => toggleDay(d, 'today', x)} />
                            <span className={clsx('text-[13px] font-bold', on1 ? 'text-success' : 'text-muted')}>{!d.active ? '—' : on1 ? s.working : s.off}</span>
                          </>
                        ) : (
                          <span className="text-[13px] font-bold text-muted">{s.weekend}</span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <Switch on={on2} label={s.aDay(name, nextName)} disabled={!d.active || busy} onClick={() => toggleDay(d, 'next', x)} />
                        <span className={clsx('text-[13px] font-bold', on2 ? 'text-success' : 'text-muted')}>{!d.active ? '—' : on2 ? s.working : s.off}</span>
                      </span>
                      <span className={clsx('text-sm', x?.visits_today ? 'font-extrabold' : 'text-muted')}>{d.active ? (lang === 'ar' ? arN : enN).visits(x?.visits_today ?? 0) : '—'}</span>
                      <Pill tone={d.active ? 'primary' : 'muted'}>{d.active ? a.active : a.inactive}</Pill>
                      <span className="flex gap-1.5">
                        <IconButton icon="edit" label={s.aEdit(name)} onClick={() => setForm({ driver: d })} />
                        <IconButton icon="key" label={s.aPw(name, hasLogin)} disabled={!d.active} onClick={() => setPw(pwTarget(d, hasLogin ? (x?.user_id ?? d.userId ?? null) : null))} />
                        <IconButton
                          icon="power"
                          tone={d.active ? 'danger' : 'success'}
                          label={s.aAct(d.active, name)}
                          disabled={busy}
                          onClick={() => (d.active ? setConf({ kind: 'deact', d, visits: (x?.visits_today ?? 0) + (x?.visits_next ?? 0) }) : run(() => setDriverActive(d.id, true), s.reactivated(name)))}
                        />
                      </span>
                    </div>
                  );
                })}
                {shown.length === 0 && (
                  <div className="flex flex-col items-center gap-2 border-t border-line px-4 py-10 text-center">
                    <div className="font-extrabold">{s.noMatch}</div>
                    <Button size="sm" onClick={() => (setQ(''), setCity('all'), setMaterial('all'))}>
                      {s.clear}
                    </Button>
                  </div>
                )}
              </div>
            </section>
            <div className="px-1 text-[13px] text-muted">{s.footer}</div>
          </>
        )}
      </PageBody>

      {form && (
        <DriverDialog
          key={form.driver?.id ?? 'new'}
          driver={form.driver}
          activity={form.driver ? act.get(form.driver.id) : undefined}
          taken={all.filter((d) => d.id !== form.driver?.id).map((d) => d.phone)}
          onClose={() => setForm(null)}
          onCreated={(d, issued) => {
            setForm(null);
            setCity('all');
            setMaterial('all');
            setQ('');
            if (issued) setPw({ ...pwTarget(d, issued.user_id ?? null), issued: { temp_password: issued.temp_password, title: s.created } });
          }}
        />
      )}

      <PasswordDialog target={pw} onClose={() => setPw(null)} />

      <ConfirmDialog
        open={!!conf}
        onOpenChange={(o) => !o && setConf(null)}
        title={conf ? (conf.kind === 'deact' ? s.confDeactTitle(l(conf.d.name)) : s.confDayTitle(l(conf.d.name), conf.kind === 'today' ? (lang === 'ar' ? 'اليوم' : 'today') : nextName)) : ''}
        confirmLabel={conf?.kind === 'deact' ? s.deactConfirm : s.yesOff}
        danger
        busy={busy}
        onConfirm={async () => {
          if (!conf) return;
          const name = l(conf.d.name);
          const ok =
            conf.kind === 'deact'
              ? await run(() => setDriverActive(conf.d.id, false), s.deactivated(name))
              : await run(() => setDriverDay(conf.d.id, conf.kind === 'today' ? today : next, false), s.dayOffVisits(name));
          if (ok) setConf(null);
        }}
      >
        {conf && conf.visits > 0 && (
          <p role="alert" className="m-0 mb-2 rounded-xl bg-danger-soft px-3 py-2 text-sm font-bold text-danger-ink">
            {s.visitsWarn(conf.visits, conf.kind === 'today' ? (lang === 'ar' ? 'اليوم' : 'today') : nextName)}{' '}
            <Link to="/scheduling" className="text-primary underline">
              {s.changeDriver}
            </Link>
          </p>
        )}
        {conf && <p className="m-0">{conf.kind === 'deact' ? s.confDeactBody : s.confDayBody}</p>}
      </ConfirmDialog>
    </>
  );
}

function DriverDialog({
  driver,
  activity,
  taken,
  onClose,
  onCreated,
}: {
  driver: Driver | null;
  activity?: DriverActivity;
  taken: string[];
  onClose: () => void;
  onCreated: (d: Driver, issued: { user_id?: string; temp_password: string } | null) => void;
}) {
  const { t, l } = useApp();
  const s = useStrings(DRIVERS_STRINGS);
  const a = useStrings(ADMIN_STRINGS);
  const { run, busy } = useRun();
  const [v, setV] = useState({
    name: driver?.name.ar ?? '',
    nameEn: driver && driver.name.en !== driver.name.ar ? driver.name.en : '',
    phone: driver?.phone ?? '',
    material: driver?.material ?? '',
    city: driver?.city ?? '',
  });
  const [tried, setTried] = useState(false);
  const hasLogin = driver ? (activity ? activity.has_login : !!driver.userId) : false;
  const phone = v.phone.trim();
  const errs = {
    name: !v.name.trim() ? s.errName : '',
    phone: !PHONE_RE.test(phone) ? a.phoneRule : taken.includes(phone) ? s.errMobileTaken : '',
    material: !v.material ? s.errMaterial : '',
    city: !v.city ? s.errCity : '',
  };
  const valid = !Object.values(errs).some(Boolean);
  const err = (k: keyof typeof errs) => (tried || (k === 'phone' && errs.phone === s.errMobileTaken) ? errs[k] || undefined : undefined);
  const materials = v.material && !MATERIAL_ORDER.includes(v.material) ? [v.material, ...MATERIAL_ORDER] : MATERIAL_ORDER;
  const cities = v.city && !CITY_ORDER.includes(v.city) ? [v.city, ...CITY_ORDER] : CITY_ORDER;
  const busyDays = (activity?.visits_today ?? 0) + (activity?.visits_next ?? 0) > 0;

  const save = async () => {
    if (!valid) return setTried(true);
    const input = { name: v.name, nameEn: v.nameEn, phone, city: v.city, material: v.material };
    if (driver) {
      if (await run(() => updateDriver(driver.id, input), s.saved(v.name.trim()))) onClose();
      return;
    }
    let id = '';
    if (!(await run(async () => (id = await createDriver(input))))) return;
    const created: Driver = { id, name: { ar: v.name.trim(), en: v.nameEn.trim() || v.name.trim() }, phone, city: v.city, material: v.material, active: true, availableNextDay: true };
    let issued: { user_id?: string; temp_password: string } | null = null;
    if (!(await run(async () => (issued = await createDriverLogin(id))))) toast.error(s.createdNoLogin, { duration: 8000 });
    onCreated(created, issued);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={driver ? s.editTitle(l(driver.name)) : s.addTitle} width={520}>
      <form
        className="flex flex-col gap-3.5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field label={s.name} error={err('name')}>
          {({ id, invalid }) => <Input id={id} value={v.name} aria-invalid={invalid} placeholder={s.namePh} onChange={(e) => setV({ ...v, name: e.target.value })} autoFocus />}
        </Field>
        <Field label={s.nameEn} hint={a.nameEnHint}>
          {({ id }) => <Input id={id} dir="ltr" value={v.nameEn} onChange={(e) => setV({ ...v, nameEn: e.target.value })} />}
        </Field>
        <Field label={s.mobile} error={err('phone')} hint={hasLogin ? s.mobileLocked : undefined}>
          {({ id, invalid, describedBy }) => (
            <Input id={id} dir="ltr" type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={v.phone} disabled={hasLogin} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={s.material} error={err('material')}>
            {({ id, invalid }) => (
              <Select id={id} value={v.material} aria-invalid={invalid} onChange={(e) => setV({ ...v, material: e.target.value })}>
                <option value="">{s.choose}</option>
                {materials.map((m) => (
                  <option key={m} value={m}>
                    {l(materialInfo(m).name)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={s.city} error={err('city')}>
            {({ id, invalid }) => (
              <Select id={id} value={v.city} aria-invalid={invalid} onChange={(e) => setV({ ...v, city: e.target.value })}>
                <option value="">{s.choose}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {CITIES[c] ? l(CITIES[c]) : c}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {driver && busyDays && (v.material !== driver.material || v.city !== driver.city) && <div className="text-[13px] font-bold text-accent-ink">{s.editVisitsHint}</div>}
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" variant="gold" size="lg" disabled={busy}>
            {driver ? a.saveChanges : s.saveAdd}
          </Button>
          <Button size="lg" onClick={onClose}>
            {t.cancel}
          </Button>
        </div>
        {!driver && <div className="text-[13px] text-muted">{s.addHint}</div>}
      </form>
    </Dialog>
  );
}
