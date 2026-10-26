import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useApp, useStrings } from '../../lib/app-context';
import { errorText } from '../../lib/supabase';
import { useCancelRequest, useDrivers, useHistory, useRequests, useUsers } from '../../data/queries';
import { CANCEL_REASONS, CHAINS, CITIES, MATERIALS } from '../../data/catalog';
import type { RequestRow } from '../../data/api';
import type { StatusChange } from '../../data/types';
import { ageInDays, formatDate, formatDay, formatRelative } from '../../lib/dates';
import { actorName, branchLabel, branchLogin, districtName, materialLabel, textOf, typeLabel, whatsappLink } from '../../lib/format';
import { Sheet } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { OutcomePill, StatusPill } from '../../components/ui/Badges';
import { PhotoPlaceholder } from '../../components/ui/States';
import { REQUESTS_STRINGS } from './strings';

/** Side drawer with the full story of one request. Opened via `?open=REQ-…` so any screen can link to it. */
export function RequestDrawer({ requestId, onClose }: { requestId: string | null; onClose: () => void }) {
  const { t, lang } = useApp();
  const s = useStrings(REQUESTS_STRINGS).drawer;
  const { data: rows } = useRequests();
  const r = rows?.find((x) => x.id === requestId);

  return (
    <Sheet
      open={!!r}
      onOpenChange={(o) => !o && onClose()}
      title={r?.id ?? ''}
      header={
        r && (
          <>
            <div className="text-[26px] font-extrabold leading-snug">{branchLabel(r.branch, lang)}</div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={r.status} className={r.status === 'cancelled' ? '!border-white/20 !text-on-dark' : ''} />
              <span className="text-sm font-bold text-gold">
                {materialLabel(r.material, r.subtype, lang)} · {r.kg ? s.kgByBranch(r.kg) : s.kgUnknown}
              </span>
            </div>
          </>
        )
      }
    >
      {r && <DrawerBody r={r} key={r.id} />}
      {!r && <span className="sr-only">{t.loading}</span>}
    </Sheet>
  );
}

function DrawerBody({ r }: { r: RequestRow }) {
  const { t, l, lang } = useApp();
  const rs = useStrings(REQUESTS_STRINGS);
  const s = rs.drawer;
  const { data: drivers = [] } = useDrivers();
  const { data: users = [] } = useUsers();
  const driver = drivers.find((d) => d.id === r.driverId);
  const driverName = driver ? l(driver.name) : '—';
  const fromDashboard = r.createdBy.kind === 'user';
  const label = branchLabel(r.branch, lang);
  const what = materialLabel(r.material, r.subtype, lang);
  // History is loaded when the drawer opens; the key changes whenever the request moves on.
  const history = useHistory(r.id, branchLogin(r.branch, lang), `${r.status}|${r.driverId ?? ''}|${r.attempts.length}`);
  const log = history.data ?? [];

  const facts = [
    { k: s.facts.chain, v: l(CHAINS[r.branch.chain]) },
    { k: s.facts.cityDistrict, v: `${l(CITIES[r.branch.city])} · ${districtName(r.branch.district, lang)}` },
    { k: s.facts.material, v: l(MATERIALS[r.material].name) },
    { k: s.facts.subtype, v: r.subtype ? typeLabel(r.material, r.subtype, lang) : '—' },
    { k: s.facts.created, v: formatDate(r.createdAt, lang) },
    { k: s.facts.age, v: rs.age(ageInDays(r.createdAt)) },
    { k: s.facts.visit, v: r.visitDay ? formatDay(r.visitDay, lang, 'short') : '—' },
    { k: s.facts.driver, v: driverName },
  ];

  const noAttemptsText =
    r.status === 'scheduled' && r.visitDay
      ? s.noAttemptsScheduled(formatDay(r.visitDay, lang, 'short'), driverName)
      : r.status === 'cancelled'
        ? r.cancel?.by.kind === 'user'
          ? s.noAttemptsCancelledDash(actorName(r.cancel.by, lang, users, drivers), r.cancel.fromStatus === 'scheduled')
          : s.noAttemptsCancelledBranch
        : s.noAttempts;

  const arrow = lang === 'ar' ? '←' : '→';
  const logLine = (e: StatusChange) => (e.from === 'new' ? t.statusNew : t.status[e.from]) + ` ${arrow} ` + t.status[e.to];
  const logBy = (e: StatusChange) => {
    const who = actorName(e.actor, lang, users, drivers) + (e.actor.kind === 'user' && e.from === 'new' ? ` ${t.actor.fromDashboard}` : '');
    const extra = e.to === 'scheduled' && e.from === 'waiting' ? ` · ${s.planApproval}` : e.note ? ` · ${textOf(e.note, lang)}` : '';
    return who + extra;
  };

  return (
    <div className="flex flex-col gap-[18px] px-6 pb-8 pt-5">
      {/* Who asked */}
      <section className="flex flex-wrap items-center gap-3 rounded-[18px] border border-line bg-surface p-4">
        <span className="inline-flex size-11 flex-none items-center justify-center rounded-[14px] bg-primary-soft text-primary">
          <Icon name="user" size={22} />
        </span>
        <span className="flex min-w-[180px] flex-1 flex-col">
          <span className="text-xs text-muted">{fromDashboard ? s.createdBy : s.requester}</span>
          <span className="text-base font-extrabold">{fromDashboard ? actorName(r.createdBy, lang, users, drivers) : r.contact?.name ?? '—'}</span>
          <span dir="ltr" className="text-[13px] text-muted rtl:text-right">
            {r.contact?.phone ?? (fromDashboard ? s.internal : '—')}
          </span>
        </span>
        {r.contact && (
          <>
            <a href={`tel:${r.contact.phone}`} className="inline-flex h-10 items-center rounded-xl border border-line bg-surface px-3.5 font-bold text-ink no-underline hover:bg-surface-2">
              {s.call}
            </a>
            <a
              href={whatsappLink(r.contact.phone, s.waMessage(r.contact.name, what, r.id, label))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-xl bg-[#19764A] px-3.5 font-bold text-white no-underline hover:brightness-110"
            >
              {s.whatsapp}
            </a>
          </>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3.5 rounded-[18px] border border-line bg-surface p-[18px]">
        {facts.map((f) => (
          <div key={f.k}>
            <div className="mb-0.5 text-xs text-muted">{f.k}</div>
            <div className="text-sm font-bold">{f.v}</div>
          </div>
        ))}
      </section>

      {r.note && (
        <section className="rounded-2xl bg-surface-2 px-4 py-3.5 text-sm leading-relaxed">
          <span className="text-muted">{s.details}</span>
          {r.note}
        </section>
      )}

      {r.cancel && (
        <section className="rounded-2xl bg-surface-2 px-4 py-3.5 text-sm leading-relaxed">
          <span className="text-muted">{s.cancelReason}</span>
          {l(r.cancel.reason)}
          {r.cancel.note ? ` — ${r.cancel.note}` : ''}
        </section>
      )}

      {(r.status === 'waiting' || r.status === 'scheduled') && <CancelSection r={r} driverName={driverName} />}

      <section className="flex flex-col gap-2.5">
        <h3 className="m-0 text-base font-extrabold">{s.branchPhoto}</h3>
        <PhotoPlaceholder className="h-40" label={fromDashboard ? s.noPhotoDashboard : r.hasBranchPhoto && r.kg ? s.photoLabel(r.kg, formatDate(r.createdAt, lang)) : s.noPhoto} />
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className="m-0 text-base font-extrabold">
          {s.attempts} <span className="text-sm font-medium text-muted">({r.attempts.length})</span>
        </h3>
        {r.attempts.length === 0 && <div className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">{noAttemptsText}</div>}
        {r.attempts.map((a, i) => {
          const d = drivers.find((x) => x.id === a.driverId);
          const detail =
            a.outcome === 'full'
              ? s.attemptFull
              : a.outcome === 'no_result'
                ? s.attemptNoResult
                : `${s.reasonLabel}${textOf(a.reason, lang)}${a.note ? s.driverNote + a.note : ''}`;
          return (
            <div key={i} className="flex gap-3.5 rounded-2xl border border-line bg-surface p-3.5">
              <div role="img" aria-label={s.driverPhoto} className="photo-placeholder flex size-[84px] flex-none items-center justify-center rounded-xl border border-line text-center text-[11px] text-muted">
                {a.hasPhoto ? <Icon name="camera" size={22} /> : s.noDriverPhoto}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold">{s.attemptN(i + 1)}</span>
                  <OutcomePill outcome={a.outcome} />
                </div>
                <div className="text-[13px] text-muted">
                  {formatDay(a.day, lang, 'short')} · {d ? l(d.name) : '—'}
                </div>
                <div className="text-sm">{detail}</div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className="m-0 text-base font-extrabold">{s.log}</h3>
        <ol className="m-0 list-none rounded-2xl border border-line bg-surface px-4 py-1.5">
          {history.isPending && <li className="py-3 text-sm text-muted">{t.loading}…</li>}
          {history.isError && (
            <li className="flex items-center gap-3 py-3 text-sm text-muted">
              {t.loadError}
              <Button size="sm" onClick={() => history.refetch()}>
                {t.retry}
              </Button>
            </li>
          )}
          {[...log].reverse().map((e, i, all) => (
            <li key={i} className={clsx('flex items-start gap-3 py-3', i < all.length - 1 && 'border-b border-line')}>
              <span className="mt-1.5 size-2.5 flex-none rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{logLine(e)}</div>
                <div className="text-[13px] text-muted">
                  {logBy(e)} · {formatRelative(e.at, lang)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

const OTHER = '__other';
const cancelSchema = z
  .object({ reason: z.string().min(1, 'reason'), note: z.string() })
  .refine((v) => v.reason !== OTHER || v.note.trim().length > 0, { path: ['note'], message: 'note' });

function CancelSection({ r, driverName }: { r: RequestRow; driverName: string }) {
  const { t, l, lang, user } = useApp();
  const s = useStrings(REQUESTS_STRINGS).cancel;
  const [open, setOpen] = useState(false);
  const cancel = useCancelRequest(user.id);
  const form = useForm<{ reason: string; note: string }>({ resolver: zodResolver(cancelSchema), defaultValues: { reason: '', note: '' } });
  const reason = useWatch({ control: form.control, name: 'reason' });
  const isScheduled = r.status === 'scheduled';
  const day = r.visitDay ? formatDay(r.visitDay, lang, 'short') : '';
  const errors = form.formState.errors;

  useEffect(() => {
    if (!open) form.reset();
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (v) => {
    const picked = v.reason === OTHER ? null : CANCEL_REASONS[Number(v.reason)];
    try {
      await cancel.mutateAsync({ id: r.id, reason: picked, note: v.note.trim() });
      toast.success(isScheduled ? s.doneScheduled(r.id, driverName) : s.doneWaiting(r.id));
      setOpen(false);
    } catch (e) {
      toast.error(errorText(e, t));
    }
  });

  return (
    <section aria-label={s.section} className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-4">
      {!open ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="min-w-[200px] flex-1 text-sm leading-relaxed text-muted">{isScheduled ? s.hintScheduled(day, driverName) : s.hintWaiting}</span>
          <Button variant="dangerOutline" onClick={() => setOpen(true)}>
            {s.open}
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
          <div className="text-[17px] font-extrabold">{s.title(r.id)}</div>
          <div role="note" className="flex items-start gap-2.5 rounded-[14px] bg-accent-soft px-3.5 py-3 text-sm font-bold leading-relaxed text-accent-ink">
            <Icon name="bell" className="mt-0.5 flex-none" />
            <span>{isScheduled ? s.impactScheduled(driverName, day) : s.impactWaiting}</span>
          </div>
          <Field label={s.reason} error={errors.reason ? s.errReason : undefined}>
            {({ id, invalid, describedBy }) => (
              <Select id={id} aria-invalid={invalid} aria-describedby={describedBy} {...form.register('reason')}>
                <option value="">{t.chooseReason}</option>
                {CANCEL_REASONS.map((c, i) => (
                  <option key={i} value={String(i)}>
                    {l(c)}
                  </option>
                ))}
                <option value={OTHER}>{t.otherReason}</option>
              </Select>
            )}
          </Field>
          <Field label={reason === OTHER ? s.noteRequired : s.note} error={errors.note ? s.errNote : undefined}>
            {({ id, invalid, describedBy }) => <Input id={id} aria-invalid={invalid} aria-describedby={describedBy} placeholder={s.notePh} {...form.register('note')} />}
          </Field>
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" variant="danger" size="lg" disabled={cancel.isPending}>
              {s.confirm}
            </Button>
            <Button size="lg" onClick={() => setOpen(false)}>
              {t.back}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
