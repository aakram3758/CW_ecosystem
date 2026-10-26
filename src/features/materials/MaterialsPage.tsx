import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useApp, usePageTitle, useStrings } from '../../lib/app-context';
import { useCatalog, useDrivers, useRequests, useUsers } from '../../data/queries';
import {
  MATERIAL_PALETTE,
  addSubtype,
  createMaterial,
  createStaffLogin,
  loginName,
  resetPassword,
  setAccountActive,
  setMaterialManager,
  setOpsPhone,
  setSubtypeActive,
  updateStaff,
} from '../../data/admin';
import { ICONS, MATERIALS, SETTINGS, materialInfo, type CatalogRows } from '../../data/catalog';
import type { DashboardUser, MaterialCode } from '../../data/types';
import { formatRelative } from '../../lib/dates';
import { HeroTitle, PageBody, PageHero } from '../../components/layout/PageHero';
import { Button } from '../../components/ui/Button';
import { Dialog, Sheet } from '../../components/ui/Dialog';
import { Field, Input, Select } from '../../components/ui/Field';
import { Icon, PathIcon } from '../../components/ui/Icon';
import { EmptyState, ErrorState, LoadingBlock, Skeleton, cardClass } from '../../components/ui/States';
import { ADMIN_STRINGS, ConfirmDialog, PHONE_RE, PasswordDialog, Pill, useRun, type PasswordTarget } from '../admin/shared';
import { MATERIALS_STRINGS } from './strings';

type MaterialRow = CatalogRows['materials'][number];
type Staff = DashboardUser & { lastSignInAt: string | null; mustChangePassword: boolean };

const CONTACT_RE = /^(05[0-9]{8}|9200[0-9]{5})$/;
const OPEN = new Set(['waiting', 'scheduled', 'needs_decision']);

function useColor() {
  const { theme } = useApp();
  return (m: MaterialCode) => (theme === 'dark' ? materialInfo(m).colorDark : materialInfo(m).colorLight);
}

function MatChip({ m, onRemove, removeLabel }: { m: MaterialCode; onRemove?: () => void; removeLabel?: string }) {
  const { l } = useApp();
  const c = useColor()(m);
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full py-1 text-xs font-extrabold', onRemove ? 'pe-1 ps-2.5 text-[13px]' : 'px-2.5')} style={{ color: c, background: `${c}1F` }}>
      {l(materialInfo(m).name)}
      {onRemove && (
        <button type="button" aria-label={removeLabel} onClick={onRemove} className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-current">
          ×
        </button>
      )}
    </span>
  );
}

/** Materials (subtypes, manager, contact number) and the dashboard users who manage them. */
export function MaterialsPage() {
  const { t, l, lang, user } = useApp();
  const s = useStrings(MATERIALS_STRINGS);
  const a = useStrings(ADMIN_STRINGS);
  usePageTitle(t.nav.materials);

  const catalog = useCatalog();
  const users = useUsers();
  const requests = useRequests();
  const drivers = useDrivers();
  const { run, busy } = useRun();

  const [addOpen, setAddOpen] = useState(false);
  const [drawer, setDrawer] = useState<{ user: Staff | null } | null>(null);
  const [pw, setPw] = useState<PasswordTarget | null>(null);
  const [deact, setDeact] = useState<Staff | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);

  const rows = catalog.data;
  const materials = useMemo(() => (rows ? [...rows.materials].filter((m) => m.active).sort((x, y) => x.sort_order - y.sort_order) : []), [rows]);
  const staff = (users.data ?? []) as Staff[];
  const active = staff.filter((u) => u.active);
  const byId = (id: string | null | undefined) => staff.find((u) => u.id === id);
  const managerOf = (m: MaterialRow) => (m.manager_id ? byId(m.manager_id) : undefined);

  const openBy = useMemo(() => {
    const o: Record<string, number> = {};
    (requests.data ?? []).forEach((r) => OPEN.has(r.status) && (o[r.material] = (o[r.material] ?? 0) + 1));
    return o;
  }, [requests.data]);
  const driversBy = useMemo(() => {
    const o: Record<string, number> = {};
    (drivers.data ?? []).forEach((d) => d.active && (o[d.material] = (o[d.material] ?? 0) + 1));
    return o;
  }, [drivers.data]);

  const pwTarget = (u: Staff): PasswordTarget => ({
    name: l(u.name),
    login: loginName(u.email ?? ''),
    phone: u.phone,
    app: s.app,
    userId: u.id,
    create: () => Promise.reject(new Error('unreachable')),
    reset: (id) => resetPassword(id),
  });

  return (
    <>
      <PageHero crumb={t.nav.materials} parent={t.nav.adminSection}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <HeroTitle title={t.nav.materials} line={rows ? s.heroLine(materials.length, materials.filter((m) => managerOf(m)?.active).length) : ' '} />
          <Button variant="gold" size="lg" onClick={() => setAddOpen(true)} disabled={!rows}>
            {s.addMaterial}
          </Button>
        </div>
      </PageHero>

      <PageBody>
        {catalog.isError && !rows ? (
          <ErrorState title={s.loadError} body={a.loadBody} onRetry={() => catalog.refetch()} />
        ) : !rows ? (
          <LoadingBlock>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[300px] rounded-[20px]" />
              ))}
            </div>
          </LoadingBlock>
        ) : materials.length === 0 ? (
          <EmptyState icon="cube" title={s.emptyTitle} body={s.emptyBody} action={<Button variant="gold" size="lg" onClick={() => setAddOpen(true)}>{s.addMaterial}</Button>} />
        ) : (
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {materials.map((m) => (
              <MaterialCard key={m.id} m={m} rows={rows} isNew={fresh.includes(m.code)} manager={managerOf(m)} staff={active} open={openBy[m.code] ?? 0} drivers={driversBy[m.code] ?? 0} />
            ))}
          </div>
        )}

        <OpsPhoneCard />

        <section className={clsx(cardClass, 'flex flex-col overflow-hidden')}>
          <div className="flex flex-wrap items-center gap-3 px-[18px] py-4">
            <div className="min-w-[240px] flex-1">
              <h2 className="m-0 text-lg font-extrabold">{s.managersTitle}</h2>
              <div className="text-[13px] text-muted">{s.managersHint}</div>
            </div>
            <Button variant="primary" onClick={() => setDrawer({ user: null })}>
              {s.addManager}
            </Button>
          </div>
          {users.isError ? (
            <ErrorState className="!rounded-none !border-0 !shadow-none" body={a.loadBody} onRetry={() => users.refetch()} />
          ) : !users.data ? (
            <div className="flex flex-col gap-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[minmax(170px,1.2fr)_150px_minmax(180px,1.3fr)_120px_90px_90px] gap-3 border-t border-line bg-surface-2 px-4 py-2.5 text-[13px] font-bold text-muted">
                  {s.cols.map((c, i) => (
                    <span key={i}>{c}</span>
                  ))}
                </div>
                {[...staff]
                  .sort((x, y) => Number(y.active) - Number(x.active) || l(x.name).localeCompare(l(y.name), lang))
                  .map((u) => {
                    const mats = Object.keys(MATERIALS).filter((code) => MATERIALS[code].managerId === u.id && MATERIALS[code].active !== false);
                    return (
                      <div key={u.id} data-testid="staff-row" className={clsx('grid grid-cols-[minmax(170px,1.2fr)_150px_minmax(180px,1.3fr)_120px_90px_90px] items-center gap-3 border-t border-line px-4 py-2.5', !u.active && 'opacity-60')}>
                        <span className="font-bold">
                          {l(u.name)} {u.id === user.id && <span className="text-xs font-normal text-muted">{s.you}</span>}
                        </span>
                        <span dir="ltr" className="truncate text-start text-sm">
                          {u.phone ?? loginName(u.email ?? '')}
                        </span>
                        <span className="flex flex-wrap gap-1.5">
                          {mats.length ? mats.map((m) => <MatChip key={m} m={m} />) : <span className="text-[13px] text-muted">{u.active ? s.noMats : '—'}</span>}
                        </span>
                        <span className="text-[13px] text-muted">{u.lastSignInAt ? formatRelative(u.lastSignInAt, lang) : u.mustChangePassword ? a.firstLogin : s.never}</span>
                        <Pill tone={u.active ? 'primary' : 'muted'}>{u.active ? s.active : s.stopped}</Pill>
                        <Button size="sm" aria-label={s.manageOf(l(u.name))} onClick={() => setDrawer({ user: u })}>
                          {s.manage}
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
      </PageBody>

      {addOpen && rows && (
        <AddMaterialDialog
          rows={rows}
          staff={active}
          onClose={() => setAddOpen(false)}
          onCreated={(code) => {
            setFresh((f) => [...f, code]);
            setAddOpen(false);
          }}
        />
      )}

      {drawer && (
        <StaffDrawer
          key={drawer.user?.id ?? 'new'}
          user={drawer.user}
          staff={staff}
          onClose={() => setDrawer(null)}
          onReset={(u) => setPw(pwTarget(u))}
          onDeactivate={(u) => setDeact(u)}
          onCreated={(u, pass) => {
            setDrawer(null);
            setPw({ ...pwTarget(u), issued: { temp_password: pass, title: s.created } });
          }}
        />
      )}

      <PasswordDialog target={pw} onClose={() => setPw(null)} />

      <ConfirmDialog
        open={!!deact}
        onOpenChange={(o) => !o && setDeact(null)}
        title={deact ? s.deactTitle(l(deact.name)) : ''}
        confirmLabel={s.deactivate}
        danger
        busy={busy}
        onConfirm={async () => {
          if (!deact) return;
          if (await run(() => setAccountActive(deact.id, false), s.deactivated(l(deact.name)))) {
            setDeact(null);
            setDrawer(null);
          }
        }}
      >
        {deact && (() => {
          const mats = Object.keys(MATERIALS).filter((code) => MATERIALS[code].managerId === deact.id);
          return (
            <>
              {mats.length > 0 && <p className="m-0 mb-2 font-bold text-accent-ink">{s.deactMats(s.list(mats.map((m) => l(materialInfo(m).name))), SETTINGS.opsPhone)}</p>}
              <p className="m-0">{s.deactBody}</p>
            </>
          );
        })()}
      </ConfirmDialog>
    </>
  );
}

function MaterialCard({ m, rows, isNew, manager, staff, open, drivers }: { m: MaterialRow; rows: CatalogRows; isNew: boolean; manager?: Staff; staff: Staff[]; open: number; drivers: number }) {
  const { t, l } = useApp();
  const s = useStrings(MATERIALS_STRINGS);
  const a = useStrings(ADMIN_STRINGS);
  const { run, busy } = useRun();
  const color = useColor()(m.code);
  const name = l({ ar: m.name_ar, en: m.name_en });
  const subs = rows.subtypes.filter((x) => x.material_id === m.id);
  const [sub, setSub] = useState('');
  const [subErr, setSubErr] = useState('');
  const [edit, setEdit] = useState<{ mgr: string; phone: string; err: string } | null>(null);
  const mgrActive = manager?.active ? manager : undefined;

  const addSub = async () => {
    const v = sub.trim().replace(/\s+/g, ' ');
    if (!v) return setSubErr(s.errSub);
    if (subs.some((x) => x.name_ar === v || x.name_en.toLowerCase() === v.toLowerCase())) return setSubErr(s.errSubExists);
    if (await run(() => addSubtype(m.code, { ar: v, en: v }), s.subAdded(v, name, subs.filter((x) => x.active).length === 0))) setSub('');
  };

  const save = async () => {
    if (!edit) return;
    const ph = edit.phone.trim();
    if (ph && !CONTACT_RE.test(ph)) return setEdit({ ...edit, err: s.errContact });
    if (await run(() => setMaterialManager(m.code, edit.mgr || null, ph), s.materialSaved(name))) setEdit(null);
  };
  const selected = staff.find((u) => u.id === edit?.mgr);

  return (
    <article aria-label={name} data-testid="material-card" className={clsx(cardClass, 'flex flex-col gap-4 p-5')}>
      <div className="flex items-center gap-3">
        <span className="inline-flex size-12 flex-none items-center justify-center rounded-[14px]" style={{ color, background: `${color}22` }}>
          <PathIcon d={ICONS[m.icon] ?? ICONS.cube} size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-extrabold">{name}</span>
          <span className="block text-[13px] text-muted">{s.meta(open, drivers)}</span>
        </span>
        {isNew && <Pill tone="accent">{s.isNew}</Pill>}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[13px] font-bold text-muted">{s.subtypes}</div>
        <div className="flex flex-wrap gap-1.5">
          {subs.map((x) => {
            const n = l({ ar: x.name_ar, en: x.name_en });
            return (
              <span
                key={x.id}
                className={clsx('inline-flex items-center gap-1 rounded-full py-[3px] pe-1 ps-2.5 text-[13px] font-extrabold', !x.active && 'bg-surface-2 text-muted line-through')}
                style={x.active ? { color, background: `${color}1F` } : undefined}
              >
                {n}
                <button
                  type="button"
                  aria-label={s.subToggle(x.active, n)}
                  title={x.active ? a.deactivate : a.reactivate}
                  disabled={busy}
                  onClick={() => run(() => setSubtypeActive(x.code, !x.active), x.active ? s.subOff(n) : s.subOn(n))}
                  className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-current no-underline"
                >
                  {x.active ? '×' : '↺'}
                </button>
              </span>
            );
          })}
          {subs.length === 0 && <span className="text-[13px] text-muted">{s.noSubs}</span>}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void addSub();
          }}
        >
          <Input aria-label={s.newSubLabel(name)} placeholder={s.newSubPh} value={sub} aria-invalid={!!subErr} onChange={(e) => (setSub(e.target.value), setSubErr(''))} />
          <Button type="submit" disabled={busy}>
            {s.addSub}
          </Button>
        </form>
        {subErr && <span className="text-[13px] font-bold text-danger-ink">{subErr}</span>}
      </div>

      <div className="border-t border-line pt-4">
        {!edit ? (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-bold text-muted">{s.manager}</div>
                <div className={clsx('text-[15px] font-bold', !mgrActive && 'text-danger-ink')}>{mgrActive ? l(mgrActive.name) : s.noManager}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-muted">{s.contactNumber}</div>
                <div dir="ltr" className="text-start text-[15px] font-bold">
                  {m.contact_phone ?? s.opsFallback(SETTINGS.opsPhone)}
                </div>
              </div>
            </div>
            <Button size="sm" onClick={() => setEdit({ mgr: mgrActive?.id ?? '', phone: m.contact_phone ?? '', err: '' })}>
              <Icon name="edit" size={16} />
              {s.editManager}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Field label={s.manager}>
              {({ id }) => (
                <Select id={id} value={edit.mgr} onChange={(e) => setEdit({ ...edit, mgr: e.target.value, phone: edit.phone || staff.find((u) => u.id === e.target.value)?.phone || '' })}>
                  <option value="">{s.none}</option>
                  {staff.map((u) => (
                    <option key={u.id} value={u.id}>
                      {l(u.name)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={s.contactLabel} error={edit.err || undefined}>
              {({ id, invalid }) => <Input id={id} dir="ltr" type="tel" placeholder="05XXXXXXXX" value={edit.phone} aria-invalid={invalid} onChange={(e) => setEdit({ ...edit, phone: e.target.value, err: '' })} />}
            </Field>
            {selected?.phone && selected.phone !== edit.phone.trim() && (
              <Button size="sm" variant="ghost" className="self-start" onClick={() => setEdit({ ...edit, phone: selected.phone!, err: '' })}>
                {s.useMgrPhone}
              </Button>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={save} disabled={busy}>
                {a.save}
              </Button>
              <Button size="sm" onClick={() => setEdit(null)}>
                {t.cancel}
              </Button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function OpsPhoneCard() {
  const { t } = useApp();
  const s = useStrings(MATERIALS_STRINGS);
  const a = useStrings(ADMIN_STRINGS);
  const { run, busy } = useRun();
  const [edit, setEdit] = useState<{ v: string; err: string } | null>(null);
  return (
    <section className={clsx(cardClass, 'flex flex-wrap items-center gap-3 px-[18px] py-4')}>
      <span className="inline-flex size-10 flex-none items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon name="phone" size={20} />
      </span>
      <div className="min-w-[220px] flex-1">
        <div className="font-extrabold">{s.opsTitle}</div>
        <div className="text-[13px] text-muted">{s.opsHint}</div>
      </div>
      {!edit ? (
        <>
          <span dir="ltr" className={clsx('text-lg font-extrabold', !SETTINGS.opsPhone && 'text-danger-ink')}>
            {SETTINGS.opsPhone ?? s.opsUnset}
          </span>
          <Button size="sm" onClick={() => setEdit({ v: SETTINGS.opsPhone ?? '', err: '' })}>
            <Icon name="edit" size={16} />
            {a.edit}
          </Button>
        </>
      ) : (
        <form
          className="flex flex-wrap items-start gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = edit.v.trim();
            if (v && !CONTACT_RE.test(v)) return setEdit({ ...edit, err: s.errContact });
            if (await run(() => setOpsPhone(v), s.opsSaved)) setEdit(null);
          }}
        >
          <span className="flex flex-col gap-1">
            <Input aria-label={s.opsTitle} dir="ltr" type="tel" placeholder="9200XXXXX" value={edit.v} aria-invalid={!!edit.err} onChange={(e) => setEdit({ v: e.target.value, err: '' })} className="!w-[200px]" autoFocus />
            {edit.err && <span className="text-[13px] font-bold text-danger-ink">{edit.err}</span>}
          </span>
          <Button type="submit" size="sm" variant="primary" disabled={busy}>
            {a.save}
          </Button>
          <Button size="sm" onClick={() => setEdit(null)}>
            {t.cancel}
          </Button>
        </form>
      )}
    </section>
  );
}

function AddMaterialDialog({ rows, staff, onClose, onCreated }: { rows: CatalogRows; staff: Staff[]; onClose: () => void; onCreated: (code: MaterialCode) => void }) {
  const { t, l } = useApp();
  const s = useStrings(MATERIALS_STRINGS);
  const { run, busy } = useRun();
  const used = rows.materials.map((m) => m.color_light.toLowerCase());
  const free = MATERIAL_PALETTE.filter((c) => !used.includes(c.light.toLowerCase()));
  const palette = free.length ? free : MATERIAL_PALETTE;
  const [v, setV] = useState({ ar: '', en: '', color: palette[0].light, mgr: '', phone: '' });
  const [tried, setTried] = useState(false);
  const dupe = rows.materials.find((m) => m.name_ar === v.ar.trim() || (v.en.trim() && m.name_en.toLowerCase() === v.en.trim().toLowerCase()));
  const errName = !v.ar.trim() || !v.en.trim() ? s.errMatName : dupe ? s.errMatExists(l({ ar: dupe.name_ar, en: dupe.name_en })) : '';
  const errMgr = !v.mgr ? s.errManager : '';
  const errPh = !CONTACT_RE.test(v.phone.trim()) ? s.errContact : '';
  const valid = !errName && !errMgr && !errPh;
  const show = (e: string) => (tried || (e && dupe && e === errName) ? e || undefined : undefined);

  const save = async () => {
    if (!valid) return setTried(true);
    const c = palette.find((x) => x.light === v.color) ?? palette[0];
    let code = '';
    if (await run(async () => (code = await createMaterial({ nameAr: v.ar, nameEn: v.en, light: c.light, dark: c.dark, managerId: v.mgr, phone: v.phone })), s.materialAdded(v.ar.trim()))) onCreated(code);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={s.addMaterialTitle} width={540}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={s.nameAr} error={show(errName)}>
          {({ id, invalid }) => <Input id={id} value={v.ar} aria-invalid={invalid} placeholder={s.nameArPh} onChange={(e) => setV({ ...v, ar: e.target.value })} autoFocus />}
        </Field>
        <Field label={s.nameEn}>{({ id }) => <Input id={id} dir="ltr" value={v.en} placeholder={s.nameEnPh} onChange={(e) => setV({ ...v, en: e.target.value })} />}</Field>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-muted">{s.color}</span>
        <div role="radiogroup" aria-label={s.color} className="flex flex-wrap gap-2">
          {palette.map((c) => (
            <button
              key={c.light}
              type="button"
              role="radio"
              aria-checked={v.color === c.light}
              aria-label={s.colorOf(l(c.name))}
              title={l(c.name)}
              onClick={() => setV({ ...v, color: c.light })}
              className={clsx('size-10 cursor-pointer rounded-xl border-[3px] shadow-[0_0_0_1px_var(--color-line)]', v.color === c.light ? 'border-ink' : 'border-transparent')}
              style={{ background: c.light }}
            />
          ))}
        </div>
        <span className="text-xs text-muted">{s.colorHint}</span>
      </div>
      <Field label={s.managerReq} error={show(errMgr)}>
        {({ id, invalid }) => (
          <Select id={id} value={v.mgr} aria-invalid={invalid} onChange={(e) => setV({ ...v, mgr: e.target.value, phone: v.phone || staff.find((u) => u.id === e.target.value)?.phone || '' })}>
            <option value="">{s.pickManager}</option>
            {staff.map((u) => (
              <option key={u.id} value={u.id}>
                {l(u.name)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={s.contactReq} hint={s.contactHint} error={show(errPh)}>
        {({ id, invalid, describedBy }) => <Input id={id} dir="ltr" type="tel" placeholder="05XXXXXXXX" value={v.phone} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => setV({ ...v, phone: e.target.value })} />}
      </Field>
      <div className="text-[13px] text-muted">{s.subsLater}</div>
      <div className="flex gap-2.5">
        <Button variant="gold" size="lg" onClick={save} disabled={busy}>
          {s.saveMaterial}
        </Button>
        <Button size="lg" onClick={onClose}>
          {t.cancel}
        </Button>
      </div>
    </Dialog>
  );
}

function StaffDrawer({
  user,
  staff,
  onClose,
  onReset,
  onDeactivate,
  onCreated,
}: {
  user: Staff | null;
  staff: Staff[];
  onClose: () => void;
  onReset: (u: Staff) => void;
  onDeactivate: (u: Staff) => void;
  onCreated: (u: Staff, pass: string) => void;
}) {
  const { t, l, user: me } = useApp();
  const s = useStrings(MATERIALS_STRINGS);
  const a = useStrings(ADMIN_STRINGS);
  const { run, busy } = useRun();
  const current = user ? Object.keys(MATERIALS).filter((code) => MATERIALS[code].managerId === user.id && MATERIALS[code].active !== false) : [];
  const [v, setV] = useState({ name: user?.name.ar ?? '', nameEn: user && user.name.en !== user.name.ar ? user.name.en : '', phone: user?.phone ?? '', mats: current });
  const [tried, setTried] = useState(false);

  const phone = v.phone.trim();
  const errName = !v.name.trim() ? s.errName : '';
  const errPhone = user ? '' : !PHONE_RE.test(phone) ? a.phoneRule : staff.some((u) => u.phone === phone) ? a.errors.LOGIN_EXISTS : '';
  const valid = !errName && !errPhone;
  const owner = (m: MaterialCode) => {
    const id = MATERIALS[m]?.managerId;
    const u = id && id !== user?.id ? staff.find((x) => x.id === id && x.active) : undefined;
    return u;
  };
  const moving = v.mats.filter((m) => owner(m));
  const options = Object.keys(MATERIALS).filter((m) => MATERIALS[m].active !== false && !v.mats.includes(m));

  const save = async () => {
    if (!valid) return setTried(true);
    if (user) {
      if (await run(() => updateStaff(user.id, { name: v.name.trim(), nameEn: v.nameEn.trim(), materials: v.mats }), s.saved(v.name.trim()))) onClose();
      return;
    }
    let r: { user_id?: string; temp_password: string } = { temp_password: '' };
    const ok = await run(async () => {
      r = await createStaffLogin({ name: v.name.trim(), nameEn: v.nameEn.trim(), phone, materials: v.mats });
    });
    if (ok) {
      onCreated({ id: r.user_id ?? '', name: { ar: v.name.trim(), en: v.nameEn.trim() || v.name.trim() }, firstName: { ar: '', en: '' }, initials: { ar: '', en: '' }, role: 'supervisor', phone, email: '', lastSignInAt: null, mustChangePassword: true }, r.temp_password);
    }
  };

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={user ? s.kickerEdit : s.kickerNew}
      width={520}
      header={<div className="text-2xl font-extrabold">{user ? l(user.name) : s.addManagerTitle}</div>}
    >
      <form
        className="flex flex-col gap-5 p-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <section className="flex flex-col gap-3">
          <Field label={s.name} error={tried ? errName || undefined : undefined}>
            {({ id, invalid }) => <Input id={id} value={v.name} aria-invalid={invalid} onChange={(e) => setV({ ...v, name: e.target.value })} />}
          </Field>
          <Field label={a.nameEn} hint={a.nameEnHint}>
            {({ id }) => <Input id={id} dir="ltr" value={v.nameEn} onChange={(e) => setV({ ...v, nameEn: e.target.value })} />}
          </Field>
          {user ? (
            <div className="rounded-2xl bg-surface-2 px-4 py-3 text-sm">
              <span className="text-muted">{s.loginIs}: </span>
              <strong dir="ltr">{user.phone ?? loginName(user.email ?? '')}</strong>
              <div className="text-xs text-muted">{s.loginLocked}</div>
            </div>
          ) : (
            <Field label={s.mobile} error={tried || errPhone === a.errors.LOGIN_EXISTS ? errPhone || undefined : undefined}>
              {({ id, invalid }) => <Input id={id} dir="ltr" type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={v.phone} aria-invalid={invalid} onChange={(e) => setV({ ...v, phone: e.target.value })} />}
            </Field>
          )}
        </section>

        <section className="flex flex-col gap-2.5">
          <div className="text-[13px] font-bold text-muted">{s.materialsTitle}</div>
          <div className="flex min-h-8 flex-wrap gap-1.5">
            {v.mats.map((m) => (
              <MatChip key={m} m={m} removeLabel={s.remove(l(materialInfo(m).name))} onRemove={() => setV({ ...v, mats: v.mats.filter((x) => x !== m) })} />
            ))}
            {v.mats.length === 0 && <span className="text-[13px] text-muted">{s.noMatsHint}</span>}
          </div>
          {options.length > 0 && (
            <Select aria-label={s.addMatLabel} value="" onChange={(e) => e.target.value && setV({ ...v, mats: [...v.mats, e.target.value] })}>
              <option value="">{s.addMatPh(v.mats.length > 0)}</option>
              {options.map((m) => {
                const o = owner(m);
                return (
                  <option key={m} value={m}>
                    {l(materialInfo(m).name)}
                    {o ? s.currently(l(o.name)) : MATERIALS[m].managerId === user?.id ? '' : s.unassigned}
                  </option>
                );
              })}
            </Select>
          )}
          {moving.length > 0 && (
            <div className="text-[13px] font-bold text-accent-ink">
              {s.replaceNote(s.list([...new Set(moving.map((m) => l(owner(m)!.name)))]), s.list(moving.map((m) => l(materialInfo(m).name))))}
            </div>
          )}
          <div className="text-xs text-muted">{s.oneManager}</div>
        </section>

        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" variant="gold" size="lg" disabled={busy || (!!user && !user.active)}>
            {user ? a.saveChanges : s.saveManager}
          </Button>
          <Button size="lg" onClick={onClose}>
            {t.cancel}
          </Button>
        </div>

        {user && (
          <section className="flex flex-col gap-2.5 border-t border-line pt-5">
            <div className="text-[13px] font-bold text-muted">{s.account}</div>
            <Button size="lg" disabled={!user.active} onClick={() => onReset(user)}>
              <Icon name="key" size={18} />
              {s.resetPw}
            </Button>
            {user.active ? (
              <Button size="lg" variant="dangerOutline" disabled={user.id === me.id} title={user.id === me.id ? a.errors.CANNOT_DEACTIVATE_SELF : undefined} onClick={() => onDeactivate(user)}>
                <Icon name="power" size={18} />
                {s.deactivate}
              </Button>
            ) : (
              <Button
                size="lg"
                className="border-success bg-success-soft text-success"
                disabled={busy}
                onClick={async () => {
                  if (await run(() => setAccountActive(user.id, true), s.reactivated(l(user.name)))) onClose();
                }}
              >
                <Icon name="power" size={18} />
                {s.reactivate}
              </Button>
            )}
          </section>
        )}
      </form>
    </Sheet>
  );
}
