import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useApp, usePageTitle, useStrings } from '../../lib/app-context';
import { useBranchActivity, useBranches, useCatalog } from '../../data/queries';
import {
  createBranch,
  createBranchLogin,
  createChain,
  resetPassword,
  setBranchActive,
  setBranchLocation,
  slug,
  updateBranch,
  type BranchActivity,
  type BranchInput,
} from '../../data/admin';
import { CHAINS, CHAIN_ORDER, CITIES, CITY_ORDER, DISTRICTS, districtsOf } from '../../data/catalog';
import type { Branch, ChainCode, CityCode } from '../../data/types';
import { branchLabel, branchLogin, districtName } from '../../lib/format';
import { dayOf, daysBetween, formatDate, opsToday } from '../../lib/dates';
import { HeroTitle, PageBody, PageHero } from '../../components/layout/PageHero';
import { Button } from '../../components/ui/Button';
import { Dialog, Sheet } from '../../components/ui/Dialog';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingBlock, Skeleton, cardClass } from '../../components/ui/States';
import { ADMIN_STRINGS, ConfirmDialog, FilterChip, IconButton, PHONE_RE, PasswordDialog, Pill, useRun, type PasswordTarget } from '../admin/shared';
import { cityCenter } from '../districts/saudiCities';
import { BranchMapDialog } from './BranchMapDialog';
import { BRANCHES_STRINGS } from './strings';

type FilterKey = 'all' | 'late' | 'noloc' | 'nolog' | 'off';

interface Row {
  b: Branch;
  act?: BranchActivity;
  lastDays: number | null;
  late: boolean;
  hasLoc: boolean;
  signedIn: boolean;
  hasLogin: boolean;
}

const FILTERS: Record<FilterKey, (r: Row) => boolean> = {
  all: () => true,
  late: (r) => r.b.active && r.late,
  noloc: (r) => r.b.active && !r.hasLoc,
  nolog: (r) => r.b.active && !r.signedIn,
  off: (r) => !r.b.active,
};

/** Chains & branches: branch records, their map location, and their app login. */
export function BranchesPage() {
  const { t, lang, l } = useApp();
  const s = useStrings(BRANCHES_STRINGS);
  const a = useStrings(ADMIN_STRINGS);
  usePageTitle(t.nav.branches);

  useCatalog(); // re-render after chain / district edits
  const branches = useBranches();
  const activity = useBranchActivity();
  const { run, busy } = useRun();

  const [chain, setChain] = useState<ChainCode | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [drawer, setDrawer] = useState<{ branch: Branch | null } | null>(null);
  const [mapFor, setMapFor] = useState<Branch | null>(null);
  const [pw, setPw] = useState<PasswordTarget | null>(null);
  const [deact, setDeact] = useState<Branch | null>(null);
  const [chainOpen, setChainOpen] = useState(false);

  const current = chain && CHAIN_ORDER.includes(chain) ? chain : CHAIN_ORDER[0];
  const today = opsToday();

  const rows = useMemo<Row[]>(() => {
    const byId = new Map((activity.data ?? []).map((x) => [x.branch_id, x]));
    return (branches.data ?? []).map((b) => {
      const act = byId.get(b.id);
      const lastDays = act?.last_request_at ? daysBetween(dayOf(act.last_request_at), today) : null;
      const hasLogin = act ? act.has_login : b.hasLogin;
      return { b, act, lastDays, late: lastDays === null || lastDays > 7, hasLoc: b.lat != null && b.lng != null, hasLogin, signedIn: hasLogin && !!act?.last_sign_in_at };
    });
  }, [branches.data, activity.data, today]);

  const byChain = (c: ChainCode) => rows.filter((r) => r.b.chain === c);
  const all = current ? byChain(current) : [];
  const needle = q.trim().replace('#', '').toLowerCase();
  const list = all
    .filter(FILTERS[filter])
    .filter((r) => !needle || r.b.number.toLowerCase().includes(needle) || (r.b.name ?? '').toLowerCase().includes(needle) || districtName(r.b.district, lang).toLowerCase().includes(needle))
    .sort((x, y) => Number(y.b.active) - Number(x.b.active) || x.b.number.localeCompare(y.b.number, 'en', { numeric: true }));
  const chainName = current ? l(CHAINS[current]) : '';

  const pwTarget = (b: Branch, userId: string | null): PasswordTarget => ({
    name: branchLabel(b, lang),
    login: branchLogin(b, lang),
    phone: b.phone,
    app: s.app,
    userId,
    create: () => createBranchLogin(b.id),
    reset: (id) => resetPassword(id),
  });

  const loading = !branches.data && !branches.isError;

  return (
    <>
      <PageHero crumb={t.nav.branches} parent={t.nav.adminSection}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <HeroTitle title={t.nav.branches} line={branches.data ? s.heroLine(CHAIN_ORDER.length, rows.filter((r) => CHAIN_ORDER.includes(r.b.chain)).length) : ' '} />
          <Button variant="gold" size="lg" onClick={() => setChainOpen(true)}>
            {s.newChain}
          </Button>
        </div>
      </PageHero>

      <PageBody>
        {branches.isError ? (
          <ErrorState title={s.loadError} body={a.loadBody} onRetry={() => branches.refetch()} />
        ) : loading ? (
          <LoadingBlock>
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[104px] rounded-[18px]" />
              ))}
            </div>
            <div className={clsx(cardClass, 'mt-4 flex flex-col gap-3 p-5')}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
          </LoadingBlock>
        ) : CHAIN_ORDER.length === 0 ? (
          <EmptyState icon="bld" title={s.emptyTitle} body={s.emptyBody} action={<Button variant="gold" size="lg" onClick={() => setChainOpen(true)}>{s.newChain}</Button>} />
        ) : (
          <>
            <div role="tablist" aria-label={s.chainsLabel} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {CHAIN_ORDER.map((c) => {
                const rs = byChain(c);
                const on = c === current;
                const nl = rs.filter(FILTERS.noloc).length;
                const ng = rs.filter(FILTERS.nolog).length;
                const name = l(CHAINS[c]);
                return (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => (setChain(c), setQ(''), setFilter('all'))}
                    className={clsx('flex cursor-pointer flex-col gap-3 rounded-[18px] border-2 bg-surface p-4 text-start text-ink shadow-card', on ? 'border-gold' : 'border-transparent')}
                  >
                    <span className="flex items-center gap-3">
                      <span className={clsx('inline-flex size-11 items-center justify-center rounded-[14px] text-lg font-extrabold', on ? 'bg-gold text-navy-ink' : 'bg-surface-2')}>
                        {CHAINS[c].ar.replace(/^ال/, '').charAt(0)}
                      </span>
                      <span className="flex flex-col">
                        <span className="text-[17px] font-extrabold">{name}</span>
                        <span className="text-[13px] text-muted">{s.chainCount(rs.length)}</span>
                      </span>
                    </span>
                    <span className="flex min-h-[26px] flex-wrap gap-1.5">
                      {nl > 0 && <Pill tone="danger">{s.noLocBadge(nl)}</Pill>}
                      {ng > 0 && <Pill tone="accent">{s.noLogBadge(ng)}</Pill>}
                    </span>
                  </button>
                );
              })}
            </div>

            <section className={clsx(cardClass, 'flex flex-col overflow-hidden')}>
              <div className="flex flex-wrap items-center gap-3 px-[18px] pb-3 pt-4">
                <h2 className="m-0 min-w-[160px] flex-1 text-lg font-extrabold">{s.branchesOf(chainName)}</h2>
                <Input type="search" aria-label={s.searchLabel} placeholder={s.searchPh} value={q} onChange={(e) => setQ(e.target.value)} className="!w-[220px]" />
                <Button variant="primary" onClick={() => setDrawer({ branch: null })}>
                  {s.addBranch}
                </Button>
              </div>
              <div role="group" aria-label={s.quickFilters} className="flex flex-wrap gap-2 px-[18px] pb-4">
                {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
                  <FilterChip key={k} on={filter === k} label={s.filters[k]} count={all.filter(FILTERS[k]).length} alert={k !== 'all'} onClick={() => setFilter(k)} />
                ))}
              </div>

              {all.length === 0 ? (
                <EmptyState
                  className="!rounded-none !border-0 !shadow-none"
                  icon="bld"
                  title={s.noBranchesTitle(chainName)}
                  body={s.noBranchesBody}
                  action={
                    <Button variant="gold" size="lg" onClick={() => setDrawer({ branch: null })}>
                      {s.addBranch}
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[1090px]">
                    <div className="grid grid-cols-[70px_minmax(180px,1.4fr)_140px_120px_110px_120px_70px_176px] gap-2.5 border-t border-line bg-surface-2 px-4 py-2.5 text-[13px] font-bold text-muted">
                      {Object.values(s.cols).map((c) => (
                        <span key={c}>{c}</span>
                      ))}
                    </div>
                    {list.map((r) => {
                      const b = r.b;
                      const label = branchLabel(b, lang);
                      return (
                        <div
                          key={b.id}
                          data-testid="branch-row"
                          className={clsx('grid grid-cols-[84px_minmax(190px,1.4fr)_150px_130px_120px_130px_90px_180px] items-center gap-3 border-t border-line px-4 py-2.5', !b.active && 'opacity-60')}
                        >
                          <span className="font-extrabold" dir="ltr">
                            #{b.number}
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-bold">{label}</span>
                            <span className="text-xs text-muted">
                              {s.loginName}
                              <strong>{branchLogin(b, lang)}</strong>
                            </span>
                          </span>
                          <span className="text-sm">
                            {CITIES[b.city] ? l(CITIES[b.city]) : '—'} · {districtName(b.district, lang)}
                          </span>
                          <span>
                            <button
                              type="button"
                              onClick={() => setMapFor(b)}
                              className={clsx(
                                'inline-flex cursor-pointer items-center whitespace-nowrap rounded-full border-0 px-2.5 py-1 text-xs font-extrabold',
                                r.hasLoc ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger-ink',
                              )}
                            >
                              {r.hasLoc ? s.locSet : s.locUnset}
                            </button>
                          </span>
                          <span>
                            {!r.hasLogin ? (
                              <Pill tone="muted">{s.noAccount}</Pill>
                            ) : r.signedIn ? (
                              <Pill tone="success">{s.logged}</Pill>
                            ) : (
                              <Pill tone="accent">{s.notLogged}</Pill>
                            )}
                          </span>
                          <span className="flex flex-col">
                            <span className={clsx('text-sm font-bold', b.active && r.late ? 'text-danger-ink' : 'text-ink')}>
                              {r.lastDays === null ? s.lastNever : s.lastAgo(r.lastDays)}
                            </span>
                            <span className="text-xs text-muted">
                              {r.act?.last_request_at ? formatDate(r.act.last_request_at, lang) : '—'}
                              {r.act?.open_requests ? ` · ${s.openNow(r.act.open_requests)}` : ''}
                            </span>
                          </span>
                          <span>
                            <Pill tone={b.active ? 'primary' : 'muted'}>{b.active ? a.active : a.inactive}</Pill>
                          </span>
                          <span className="flex gap-1.5">
                            <IconButton icon="edit" label={s.aEdit(label)} onClick={() => setDrawer({ branch: b })} />
                            <IconButton icon="pin" label={s.aMap(label)} onClick={() => setMapFor(b)} />
                            <IconButton icon="key" label={s.aPw(label, r.hasLogin)} disabled={!b.active} onClick={() => setPw(pwTarget(b, r.hasLogin ? (r.act?.user_id ?? b.userId ?? null) : null))} />
                            <IconButton
                              icon="power"
                              tone={b.active ? 'danger' : 'success'}
                              label={s.aAct(b.active, label)}
                              disabled={busy}
                              onClick={() => (b.active ? setDeact(b) : run(() => setBranchActive(b.id, true), s.reactivated(label)))}
                            />
                          </span>
                        </div>
                      );
                    })}
                    {list.length === 0 && (
                      <div className="flex flex-col items-center gap-2 border-t border-line px-4 py-10 text-center">
                        <div className="font-extrabold">{s.noMatch}</div>
                        <Button size="sm" onClick={() => (setQ(''), setFilter('all'))}>
                          {s.clear}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
            {all.length > 0 && <div className="px-1 text-[13px] text-muted">{s.footer(list.length, all.length)}</div>}
          </>
        )}
      </PageBody>

      {drawer && current && (
        <BranchDrawer
          key={drawer.branch?.id ?? 'new'}
          chain={current}
          branch={drawer.branch}
          hasLogin={drawer.branch ? !!rows.find((r) => r.b.id === drawer.branch!.id)?.hasLogin : false}
          taken={all.filter((r) => r.b.id !== drawer.branch?.id).map((r) => r.b.number.toLowerCase())}
          onClose={() => setDrawer(null)}
          onCreated={(b, issued) => {
            setDrawer(null);
            setFilter('all');
            setQ('');
            if (issued) setPw({ ...pwTarget(b, issued.user_id ?? null), issued: { temp_password: issued.temp_password, title: s.created }, onDone: () => nextStep(b) });
            else nextStep(b);
          }}
        />
      )}

      {mapFor && (
        <BranchMapDialog
          open
          title={s.mapTitle(branchLabel(mapFor, lang))}
          place={`${CITIES[mapFor.city] ? l(CITIES[mapFor.city]) : ''} · ${districtName(mapFor.district, lang)}`}
          initial={mapFor.lat != null && mapFor.lng != null ? [mapFor.lat, mapFor.lng] : null}
          center={cityCenterFor(mapFor, branches.data ?? [])}
          busy={busy}
          onClose={() => setMapFor(null)}
          onSave={async (lat, lng) => {
            if (await run(() => setBranchLocation(mapFor.id, lat, lng), s.locSaved(branchLabel(mapFor, lang)))) setMapFor(null);
          }}
        />
      )}

      <PasswordDialog target={pw} onClose={() => setPw(null)} />

      <ConfirmDialog
        open={!!deact}
        onOpenChange={(o) => !o && setDeact(null)}
        title={deact ? s.deactTitle(branchLabel(deact, lang)) : ''}
        confirmLabel={s.deactConfirm}
        danger
        busy={busy}
        onConfirm={async () => {
          if (deact && (await run(() => setBranchActive(deact.id, false), s.deactivated(branchLabel(deact, lang))))) setDeact(null);
        }}
      >
        <ul className="m-0 flex list-disc flex-col gap-1 ps-5">
          {s.deactBullets.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </ConfirmDialog>

      {chainOpen && <ChainDialog onClose={() => setChainOpen(false)} onCreated={(code) => (setChain(code), setChainOpen(false))} />}
    </>
  );

  function nextStep(b: Branch) {
    toast.success(s.nextStep, { action: { label: s.editMap, onClick: () => setMapFor(b) }, duration: 8000 });
  }
}

/** Map centre: the city's known centre, else the average of its located branches. */
function cityCenterFor(b: Branch, all: Branch[]) {
  const c = cityCenter(CITIES[b.city]?.ar ?? '');
  if (c.known) return c;
  const located = all.filter((x) => x.city === b.city && x.lat != null && x.lng != null);
  if (!located.length) return c;
  return { center: [located.reduce((n, x) => n + x.lat!, 0) / located.length, located.reduce((n, x) => n + x.lng!, 0) / located.length] as [number, number], known: true };
}

function BranchDrawer({
  chain,
  branch,
  hasLogin,
  taken,
  onClose,
  onCreated,
}: {
  chain: ChainCode;
  branch: Branch | null;
  hasLogin: boolean;
  taken: string[];
  onClose: () => void;
  onCreated: (b: Branch, issued: { user_id?: string; temp_password: string } | null) => void;
}) {
  const { t, l, lang } = useApp();
  const s = useStrings(BRANCHES_STRINGS);
  const a = useStrings(ADMIN_STRINGS);
  const { run, busy } = useRun();
  const [v, setV] = useState(() => ({
    number: branch?.number ?? '',
    name: branch?.name ?? '',
    city: (branch ? (DISTRICTS[branch.district]?.city ?? '') : '') as CityCode,
    district: branch?.district ?? '',
    address: branch?.address ?? '',
    phone: branch?.phone ?? '',
    accessNotes: branch?.accessNotes ?? '',
  }));
  const [tried, setTried] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  const chainName = l(CHAINS[chain]);
  const no = v.number.trim();
  const errNo = !no ? s.errNo : !/^[A-Za-z0-9]{1,10}$/.test(no) ? s.errNoFormat : taken.includes(no.toLowerCase()) ? s.errNoTaken(no, chainName) : '';
  const errName = !v.name.trim() ? s.errName : '';
  const errCity = !v.city ? s.errCity : '';
  const errDistrict = v.city && !v.district ? s.errDistrict : '';
  const errMobile = v.phone.trim() && !PHONE_RE.test(v.phone.trim()) ? s.errMobile : '';
  const valid = !errNo && !errName && !errCity && !errDistrict && !errMobile;
  const show = (e: string) => (tried || (e && e !== s.errNo && e !== s.errName && e !== s.errCity && e !== s.errDistrict) ? e || undefined : undefined);

  const cities = CITY_ORDER.includes(v.city) || !v.city ? CITY_ORDER : [v.city, ...CITY_ORDER];
  const districts = v.city ? districtsOf(v.city) : [];
  if (branch && v.district && DISTRICTS[v.district]?.city === v.city && !districts.includes(v.district)) districts.unshift(v.district);

  const save = async () => {
    if (!valid) return setTried(true);
    const input: BranchInput = { chain, number: no, name: v.name, districtId: v.district, address: v.address, phone: v.phone, accessNotes: v.accessNotes };
    if (branch) {
      if (await run(() => updateBranch(branch.id, input), s.saved(`${chainName} #${no}`))) onClose();
      return;
    }
    let id = '';
    const ok = await run(async () => {
      id = await createBranch(input);
    });
    if (!ok) return;
    const created: Branch = { id, chain, number: no, name: v.name.trim(), city: v.city, district: v.district, active: true, phone: v.phone.trim() || null, hasLogin: false, address: v.address, accessNotes: v.accessNotes, lat: null, lng: null };
    let issued: { user_id?: string; temp_password: string } | null = null;
    const loginOk = await run(async () => {
      issued = await createBranchLogin(id);
    });
    if (!loginOk) toast.error(s.createdNoLogin, { duration: 8000 });
    onCreated(created, issued);
  };

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={chainName}
      width={520}
      header={<div className="text-2xl font-extrabold">{branch ? s.editTitle(chainName, branch.number) : s.addTitle}</div>}
    >
      <form
        className="flex flex-col gap-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
      >
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <Field label={s.number} error={show(errNo)} hint={branch && hasLogin ? s.numberLocked : undefined}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} dir="ltr" inputMode="numeric" value={v.number} onChange={set('number')} disabled={!!branch && hasLogin} aria-describedby={describedBy} aria-invalid={invalid} />
            )}
          </Field>
          <Field label={s.name} error={show(errName)}>
            {({ id, describedBy, invalid }) => <Input id={id} value={v.name} onChange={set('name')} placeholder={s.namePh} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl bg-surface-2 px-4 py-3 text-[13px] text-muted">
          <span>
            {s.preview}
            <strong className="text-ink">{`${chainName} #${no || '___'} – ${v.name.trim() || '___'}`}</strong>
          </span>
          <span>
            {s.loginPreview}
            <strong className="text-ink">{`${CHAINS[chain][lang]} ${no || '___'}`}</strong>
            {s.loginAuto}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={s.city} error={show(errCity)}>
            {({ id, invalid }) => (
              <Select id={id} value={v.city} aria-invalid={invalid} onChange={(e) => setV({ ...v, city: e.target.value, district: '' })}>
                <option value="">{s.pickCity}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {l(CITIES[c])}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={s.district} error={show(errDistrict)}>
            {({ id, invalid }) => (
              <Select id={id} value={v.district} aria-invalid={invalid} disabled={!v.city} onChange={set('district')}>
                <option value="">{v.city ? s.pickDistrict : s.cityFirst}</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {districtName(d, lang)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="-mt-2 text-[13px] text-muted">
          {s.districtMissing}
          <Link to="/districts" className="font-bold text-primary">
            {t.nav.districts}
          </Link>
          .
        </div>
        <Field label={s.address}>{({ id }) => <Input id={id} value={v.address} onChange={set('address')} placeholder={s.addressPh} />}</Field>
        <Field label={s.mobile} hint={s.mobileHint} error={show(errMobile)}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} dir="ltr" type="tel" inputMode="numeric" value={v.phone} onChange={set('phone')} placeholder="05XXXXXXXX" aria-describedby={describedBy} aria-invalid={invalid} />
          )}
        </Field>
        <Field label={s.notes} hint={s.notesHint}>
          {({ id }) => <Textarea id={id} rows={3} value={v.accessNotes} onChange={set('accessNotes')} placeholder={s.notesPh} />}
        </Field>
        {tried && !valid && (
          <div role="alert" className="text-sm font-bold text-danger-ink">
            {s.errAny}
          </div>
        )}
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" variant="gold" size="lg" disabled={busy}>
            {branch ? a.saveChanges : s.saveAdd}
          </Button>
          <Button size="lg" onClick={onClose}>
            {t.cancel}
          </Button>
        </div>
        {!branch && <div className="text-[13px] text-muted">{s.addHint}</div>}
      </form>
    </Sheet>
  );
}

function ChainDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (code: ChainCode) => void }) {
  const { t } = useApp();
  const s = useStrings(BRANCHES_STRINGS);
  const { run, busy } = useRun();
  const [v, setV] = useState({ ar: '', en: '', code: '', codeTouched: false });
  const [err, setErr] = useState('');
  const code = v.codeTouched ? v.code : slug(v.en, '', 20);

  const save = async () => {
    const ar = v.ar.trim();
    const en = v.en.trim();
    if (!ar || !en) return setErr(s.errChainName);
    const rows = Object.values(CHAINS);
    if (rows.some((c) => c.ar === ar || c.en.toLowerCase() === en.toLowerCase())) return setErr(s.errChainExists(ar));
    let created = '';
    if (await run(async () => (created = await createChain({ nameAr: ar, nameEn: en, code })), s.chainAdded(ar))) onCreated(created);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={s.chainTitle} width={480}>
      <Field label={s.chainAr}>{({ id }) => <Input id={id} value={v.ar} placeholder={s.chainArPh} onChange={(e) => (setV({ ...v, ar: e.target.value }), setErr(''))} autoFocus />}</Field>
      <Field label={s.chainEn}>{({ id }) => <Input id={id} dir="ltr" value={v.en} placeholder={s.chainEnPh} onChange={(e) => (setV({ ...v, en: e.target.value }), setErr(''))} />}</Field>
      <Field label={s.chainCode} hint={s.chainCodeHint}>
        {({ id }) => <Input id={id} dir="ltr" value={code} onChange={(e) => (setV({ ...v, code: e.target.value.toLowerCase(), codeTouched: true }), setErr(''))} />}
      </Field>
      {err && (
        <div role="alert" className="text-sm font-bold text-danger-ink">
          {err}
        </div>
      )}
      <div className="flex gap-2.5">
        <Button variant="gold" size="lg" onClick={save} disabled={busy}>
          {s.add}
        </Button>
        <Button size="lg" onClick={onClose}>
          {t.cancel}
        </Button>
      </div>
    </Dialog>
  );
}

