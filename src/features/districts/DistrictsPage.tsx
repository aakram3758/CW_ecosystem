import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useApp, usePageTitle, useStrings } from '../../lib/app-context';
import { useBranches, useCatalog } from '../../data/queries';
import { addCity, addDistricts, renameDistrict, setDistrictActive } from '../../data/admin';
import { REF, type CatalogRows } from '../../data/catalog';
import type { LocalizedText } from '../../data/types';
import { HeroTitle, PageBody, PageHero } from '../../components/layout/PageHero';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field, Input, Select } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { EmptyState, ErrorState, LoadingBlock, Skeleton, cardClass } from '../../components/ui/States';
import { ADMIN_STRINGS, ConfirmDialog, IconButton, Pill, useRun } from '../admin/shared';
import { SAUDI_CITIES } from './saudiCities';
import { DISTRICTS_STRINGS } from './strings';

type CityRow = CatalogRows['cities'][number];
type DistrictRow = CatalogRows['districts'][number];

const norm = (s: string) => s.trim().replace(/\s+/g, ' ');
const refFor = (cityAr: string) => SAUDI_CITIES.find((c) => c.name.ar === cityAr);

/** Cities & districts: every branch belongs to a district; scheduling groups visits by district. */
export function DistrictsPage() {
  const { t, lang } = useApp();
  const s = useStrings(DISTRICTS_STRINGS);
  const a = useStrings(ADMIN_STRINGS);
  usePageTitle(t.nav.districts);

  const catalog = useCatalog();
  const branches = useBranches();
  const [q, setQ] = useState('');
  const [dialog, setDialog] = useState<{ mode: 'new' } | { mode: 'existing'; city: CityRow } | null>(null);
  const [deact, setDeact] = useState<DistrictRow | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const { run, busy } = useRun();

  const rows = catalog.data;
  const cities = useMemo(() => (rows ? [...rows.cities].filter((c) => c.active).sort((a, b) => a.sort_order - b.sort_order) : []), [rows]);
  const branchCount = useMemo(() => {
    const m: Record<string, number> = {};
    (branches.data ?? []).forEach((b) => b.active && (m[b.district] = (m[b.district] ?? 0) + 1));
    return m;
  }, [branches.data]);
  const totalActive = rows ? rows.districts.filter((d) => d.active && cities.some((c) => c.id === d.city_id)).length : 0;
  const name = (x: { name_ar: string; name_en: string }) => (lang === 'ar' ? x.name_ar : x.name_en || x.name_ar);

  return (
    <>
      <PageHero crumb={t.nav.districts} parent={t.nav.adminSection}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <HeroTitle title={t.nav.districts} line={rows ? s.heroLine(cities.length, totalActive) : ' '} />
          <Button variant="gold" size="lg" onClick={() => setDialog({ mode: 'new' })} disabled={!rows}>
            {s.addCity}
          </Button>
        </div>
      </PageHero>

      <PageBody>
        <div role="note" className={clsx(cardClass, 'flex flex-wrap items-center gap-3 px-[18px] py-3.5')}>
          <span className="inline-flex size-9 flex-none items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon name="pin" size={18} />
          </span>
          <span className="min-w-[240px] flex-1 text-sm text-muted">{s.note}</span>
          <Input type="search" aria-label={s.searchLabel} placeholder={s.searchPh} value={q} onChange={(e) => setQ(e.target.value)} className="!w-[240px]" />
        </div>

        {catalog.isError && !rows ? (
          <ErrorState title={s.loadError} body={a.loadBody} onRetry={() => catalog.refetch()} />
        ) : !rows ? (
          <LoadingBlock>
            <div className="grid gap-4 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className={clsx(cardClass, 'flex flex-col gap-3 p-5')}>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ))}
            </div>
          </LoadingBlock>
        ) : cities.length === 0 ? (
          <EmptyState icon="pin" title={s.emptyTitle} body={s.emptyBody} action={<Button variant="gold" size="lg" onClick={() => setDialog({ mode: 'new' })}>{s.addCity}</Button>} />
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {cities.map((c) => (
              <CityCard
                key={c.id}
                city={c}
                districts={rows.districts.filter((d) => d.city_id === c.id).sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'))}
                q={norm(q)}
                isNew={fresh.includes(c.id)}
                branchCount={branchCount}
                name={name}
                onPick={() => setDialog({ mode: 'existing', city: c })}
                onDeactivate={setDeact}
              />
            ))}
          </div>
        )}
      </PageBody>

      <ConfirmDialog
        open={!!deact}
        onOpenChange={(o) => !o && setDeact(null)}
        title={deact ? s.deactTitle(name(deact)) : ''}
        confirmLabel={s.deactConfirm}
        danger
        busy={busy}
        onConfirm={async () => {
          if (!deact) return;
          if (await run(() => setDistrictActive(deact.id, false), s.deactivated(name(deact)))) setDeact(null);
        }}
      >
        <ul className="m-0 flex list-disc flex-col gap-1 ps-5">
          {deact && s.deactBullets(branchCount[deact.id] ?? 0).map((b) => <li key={b}>{b}</li>)}
        </ul>
      </ConfirmDialog>

      {dialog && rows && (
        <CityDialog
          key={dialog.mode === 'existing' ? dialog.city.id : 'new'}
          mode={dialog}
          rows={rows}
          onClose={() => setDialog(null)}
          onCreated={(id) => setFresh((f) => [...f, id])}
        />
      )}
    </>
  );
}

function CityCard({
  city,
  districts,
  q,
  isNew,
  branchCount,
  name,
  onPick,
  onDeactivate,
}: {
  city: CityRow;
  districts: DistrictRow[];
  q: string;
  isNew: boolean;
  branchCount: Record<string, number>;
  name: (x: { name_ar: string; name_en: string }) => string;
  onPick: () => void;
  onDeactivate: (d: DistrictRow) => void;
}) {
  const { t } = useApp();
  const s = useStrings(DISTRICTS_STRINGS);
  const a = useStrings(ADMIN_STRINGS);
  const { run, busy } = useRun();
  const [add, setAdd] = useState('');
  const [addErr, setAddErr] = useState('');
  const [edit, setEdit] = useState<{ id: string; ar: string; en: string; err: string } | null>(null);

  const cityName = name(city);
  const shown = districts.filter((d) => !q || d.name_ar.includes(q) || d.name_en.toLowerCase().includes(q.toLowerCase()));
  const active = districts.filter((d) => d.active);
  const branches = active.reduce((n, d) => n + (branchCount[d.id] ?? 0), 0);
  const taken = (n: string, except?: string) => districts.some((d) => d.id !== except && (d.name_ar === n || d.name_en.toLowerCase() === n.toLowerCase()));

  const submitAdd = async () => {
    const n = norm(add);
    if (!n) return setAddErr(s.errName);
    if (taken(n)) return setAddErr(s.errExists(n, cityName));
    const ref = refFor(city.name_ar)?.districts.find((d) => d.ar === n || d.en.toLowerCase() === n.toLowerCase());
    if (await run(() => addDistricts(city.id, [ref ?? { ar: n, en: n }]), s.added(n, cityName))) setAdd('');
  };

  const saveEdit = async (d: DistrictRow) => {
    if (!edit) return;
    const ar = norm(edit.ar);
    const en = norm(edit.en);
    if (!ar) return setEdit({ ...edit, err: a.errors.NAME_REQUIRED });
    if (taken(ar, d.id) || (en && taken(en, d.id))) return setEdit({ ...edit, err: s.errRenameExists(cityName) });
    if (await run(() => renameDistrict(d.id, { ar, en: en || ar }), s.renamed(ar))) setEdit(null);
  };

  return (
    <section aria-label={cityName} className={clsx(cardClass, 'flex flex-col overflow-hidden')}>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <span className="inline-flex size-10 flex-none items-center justify-center rounded-xl bg-side text-gold">
          <Icon name="pin" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-lg font-extrabold">{cityName}</h2>
          <div className="text-[13px] text-muted">{s.cityMeta(active.length, branches)}</div>
        </div>
        {isNew && <Pill tone="accent">{s.isNew}</Pill>}
        <Button size="sm" onClick={onPick} aria-label={s.fromListLabel(cityName)}>
          {s.fromList}
        </Button>
      </div>

      <div className="flex flex-col">
        {shown.map((d) =>
          edit?.id === d.id ? (
            <div key={d.id} className="flex flex-col gap-2 border-b border-line bg-surface-2 px-5 py-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input aria-label={s.newName} value={edit.ar} aria-invalid={!!edit.err} onChange={(e) => setEdit({ ...edit, ar: e.target.value, err: '' })} autoFocus />
                <Input aria-label={s.newNameEn} dir="ltr" placeholder={s.newNameEn} value={edit.en} onChange={(e) => setEdit({ ...edit, en: e.target.value, err: '' })} />
              </div>
              {edit.err ? <span className="text-[13px] font-bold text-danger-ink">{edit.err}</span> : <span className="text-xs text-muted">{s.renameHint}</span>}
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={() => saveEdit(d)} disabled={busy}>
                  {a.save}
                </Button>
                <Button size="sm" onClick={() => setEdit(null)}>
                  {t.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <div key={d.id} data-testid="district-row" className={clsx('flex items-center gap-2.5 border-b border-line px-5 py-2.5', !d.active && 'opacity-70')}>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{name(d)}</span>
                <span className="block text-xs text-muted">
                  {s.branchesSub(branchCount[d.id] ?? 0)}
                  {!d.active && s.offSub}
                </span>
              </span>
              {!d.active && <Pill tone="muted">{a.inactive}</Pill>}
              <IconButton icon="edit" label={s.renameOf(name(d))} onClick={() => setEdit({ id: d.id, ar: d.name_ar, en: d.name_en === d.name_ar ? '' : d.name_en, err: '' })} />
              <IconButton
                icon="power"
                tone={d.active ? 'danger' : 'success'}
                label={s.toggleOf(d.active, name(d))}
                disabled={busy}
                onClick={() => (d.active ? onDeactivate(d) : run(() => setDistrictActive(d.id, true), s.reactivated(name(d))))}
              />
            </div>
          ),
        )}
        {shown.length === 0 && <div className="px-5 py-6 text-center text-sm text-muted">{q ? s.noneSearch(cityName) : s.none}</div>}
      </div>

      <form
        className="flex flex-col gap-1.5 px-5 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submitAdd();
        }}
      >
        <span className="flex gap-2">
          <Input aria-label={s.newDistrictLabel(cityName)} placeholder={s.newDistrictPh} value={add} aria-invalid={!!addErr} onChange={(e) => (setAdd(e.target.value), setAddErr(''))} />
          <Button type="submit" variant="primary" disabled={busy}>
            {a.add}
          </Button>
        </span>
        {addErr && <span className="text-[13px] font-bold text-danger-ink">{addErr}</span>}
      </form>
    </section>
  );
}

function CityDialog({
  mode,
  rows,
  onClose,
  onCreated,
}: {
  mode: { mode: 'new' } | { mode: 'existing'; city: CityRow };
  rows: CatalogRows;
  onClose: () => void;
  onCreated: (cityId: string) => void;
}) {
  const { t, lang, l } = useApp();
  const s = useStrings(DISTRICTS_STRINGS);
  const { run, busy } = useRun();
  const isNew = mode.mode === 'new';
  const existing = mode.mode === 'existing' ? mode.city : null;

  const addedCities = rows.cities.map((c) => c.name_ar);
  const cityOptions = SAUDI_CITIES.filter((c) => !addedCities.includes(c.name.ar));
  const [pick, setPick] = useState(''); // Arabic name from the list, or "__other"
  const [other, setOther] = useState({ ar: '', en: '' });
  const [sel, setSel] = useState<string[]>([]);
  const [extra, setExtra] = useState<LocalizedText[]>([]);
  const [lq, setLq] = useState('');
  const [custom, setCustom] = useState('');
  const [customErr, setCustomErr] = useState('');
  const [err, setErr] = useState('');

  const cityAr = existing ? existing.name_ar : pick === '__other' ? norm(other.ar) : pick;
  const cityLabel = existing ? l({ ar: existing.name_ar, en: existing.name_en }) : pick === '__other' ? (lang === 'ar' ? norm(other.ar) : norm(other.en)) || '…' : l(refFor(pick)?.name ?? { ar: pick, en: pick });
  const hasCity = !!existing || (!!pick && (pick !== '__other' || !!cityAr));
  const addedNames = existing ? rows.districts.filter((d) => d.city_id === existing.id).map((d) => d.name_ar) : [];
  const base = (refFor(cityAr)?.districts ?? []).filter((d) => !addedNames.includes(d.ar));
  const all = [...base, ...extra.filter((x) => !base.some((b) => b.ar === x.ar))];
  const fq = norm(lq).toLowerCase();
  const shown = all.filter((d) => !fq || d.ar.includes(fq) || d.en.toLowerCase().includes(fq));
  const allOn = shown.length > 0 && shown.every((d) => sel.includes(d.ar));
  const k = sel.length;

  const addCustom = () => {
    const n = norm(custom);
    if (!n) return setCustomErr(s.errName);
    if (all.some((d) => d.ar === n || d.en.toLowerCase() === n.toLowerCase())) return setCustomErr(s.customInList(n));
    if (addedNames.includes(n)) return setCustomErr(s.customExists(n, cityLabel));
    setExtra([...extra, { ar: n, en: n }]);
    setSel([...sel, n]);
    setCustom('');
    setLq('');
    setErr('');
  };

  const save = async () => {
    const chosen = all.filter((d) => sel.includes(d.ar));
    if (isNew) {
      if (!pick) return setErr(s.errPickCity);
      const names = pick === '__other' ? { ar: norm(other.ar), en: norm(other.en) } : refFor(pick)!.name;
      if (!names.ar || !names.en) return setErr(s.errCityNames);
      if (rows.cities.some((c) => c.name_ar === names.ar || c.name_en.toLowerCase() === names.en.toLowerCase())) return setErr(s.errCityExists);
      if (!k) return setErr(s.errPick);
      const ok = await run(async () => {
        await addCity({ nameAr: names.ar, nameEn: names.en, districts: chosen });
      }, s.cityAdded(l(names), k));
      if (ok) {
        // The catalog is refreshed before run() resolves, so the new city is already there.
        const created = REF.rows?.cities.find((c) => c.name_ar === names.ar)?.id;
        if (created) onCreated(created);
        onClose();
      }
    } else if (existing) {
      if (!k) return setErr(s.errPick);
      if (await run(() => addDistricts(existing.id, chosen), s.districtsAdded(k, cityLabel))) onClose();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={isNew ? s.addCityTitle : s.addToTitle(cityLabel)} width={620}>
      {isNew && (
        <>
          <Field label={s.cityLabel} hint={s.cityHint} error={err === s.errPickCity ? err : undefined}>
            {({ id, invalid }) => (
              <Select
                id={id}
                aria-invalid={invalid}
                value={pick}
                onChange={(e) => {
                  setPick(e.target.value);
                  setSel([]);
                  setExtra([]);
                  setLq('');
                  setErr('');
                }}
              >
                <option value="">{s.pickCity}</option>
                {cityOptions.map((c) => (
                  <option key={c.name.ar} value={c.name.ar}>
                    {l(c.name)}
                  </option>
                ))}
                <option value="__other">{s.otherCity}</option>
              </Select>
            )}
          </Field>
          {pick === '__other' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={s.otherCityAr}>{({ id }) => <Input id={id} value={other.ar} onChange={(e) => setOther({ ...other, ar: e.target.value })} />}</Field>
              <Field label={s.otherCityEn}>{({ id }) => <Input id={id} dir="ltr" value={other.en} onChange={(e) => setOther({ ...other, en: e.target.value })} />}</Field>
            </div>
          )}
        </>
      )}

      {hasCity && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="font-extrabold">{s.listTitle(cityLabel, all.length)}</div>
            <Button
              size="sm"
              variant="ghost"
              disabled={shown.length === 0}
              onClick={() => {
                const names = shown.map((d) => d.ar);
                setSel(allOn ? sel.filter((n) => !names.includes(n)) : [...sel, ...names.filter((n) => !sel.includes(n))]);
                setErr('');
              }}
            >
              {allOn ? s.unselectAll : fq ? s.selectResults : s.selectAll}
            </Button>
          </div>
          {all.length > 0 && <Input type="search" aria-label={s.listSearch} placeholder={s.listSearch} value={lq} onChange={(e) => setLq(e.target.value)} />}
          {shown.length > 0 && (
            <div role="group" aria-label={s.listTitle(cityLabel, all.length)} className="grid max-h-[260px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {shown.map((d) => {
                const on = sel.includes(d.ar);
                return (
                  <label
                    key={d.ar}
                    className={clsx('flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold', on ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        setSel(on ? sel.filter((n) => n !== d.ar) : [...sel, d.ar]);
                        setErr('');
                      }}
                    />
                    <span className="flex-1">{l(d)}</span>
                    {!base.some((b) => b.ar === d.ar) && <span className="text-[11px] text-muted">{s.manual}</span>}
                  </label>
                );
              })}
            </div>
          )}
          {fq && shown.length === 0 && <div className="text-sm text-muted">{s.noMatch}</div>}
          {!fq && all.length === 0 && <div className="text-sm text-muted">{refFor(cityAr) ? s.allAdded : s.noRef}</div>}

          <div className="flex flex-col gap-1.5 rounded-2xl bg-surface-2 p-3">
            <span className="text-[13px] font-bold text-muted">{s.customTitle}</span>
            <span className="flex gap-2">
              <Input
                aria-label={s.customTitle}
                placeholder={s.customPh}
                value={custom}
                aria-invalid={!!customErr}
                onChange={(e) => (setCustom(e.target.value), setCustomErr(''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustom();
                  }
                }}
              />
              <Button onClick={addCustom}>{s.customAdd}</Button>
            </span>
            {customErr && <span className="text-[13px] font-bold text-danger-ink">{customErr}</span>}
          </div>
        </>
      )}

      {err && err !== s.errPickCity && (
        <div role="alert" className="text-sm font-bold text-danger-ink">
          {err}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button variant="gold" size="lg" onClick={save} disabled={busy}>
          {isNew ? s.saveNew(k) : s.saveExisting(k)}
        </Button>
        <Button size="lg" onClick={onClose}>
          {t.cancel}
        </Button>
        <span className="text-sm text-muted">{s.selected(k)}</span>
      </div>
      <div className="text-xs text-muted">{isNew ? s.footNew : s.footExisting}</div>
    </Dialog>
  );
}
