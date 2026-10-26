import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useApp, usePageTitle, useStrings } from '../../lib/app-context';
import { errorText } from '../../lib/supabase';
import { useDecide, useDrivers, useRequests, useUndoDecision } from '../../data/queries';
import type { RequestRow } from '../../data/api';
import { CITIES, CITY_ORDER, CLOSE_REASONS, MATERIALS, MATERIAL_ORDER } from '../../data/catalog';
import type { CityCode, Filter, MaterialCode, VisitOutcome } from '../../data/types';
import { decisionType, isStaleDecision, lastAttempt } from '../../data/selectors';
import { formatDay, formatRelative, nextWorkingDay, opsToday } from '../../lib/dates';
import { branchLabel, materialLabel, textOf } from '../../lib/format';
import { HeroTitle, PageBody, PageHero } from '../../components/layout/PageHero';
import { Button } from '../../components/ui/Button';
import { Field, Select, Textarea } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { MaterialTile, OutcomePill } from '../../components/ui/Badges';
import { ToggleGroup } from '../../components/ui/Toggles';
import { EmptyState, ErrorState, LoadingBlock, Skeleton, cardClass } from '../../components/ui/States';
import { DECISIONS_STRINGS } from './strings';

type DecisionType = Exclude<VisitOutcome, 'full'>;

const priorFails = (r: RequestRow) => r.attempts.slice(0, -1).filter((a) => a.outcome === 'failed').length;

export function DecisionsPage() {
  const { t, l, user } = useApp();
  const s = useStrings(DECISIONS_STRINGS);
  usePageTitle(t.nav.decisions);

  const [type, setType] = useState<Filter<DecisionType>>('all');
  const [material, setMaterial] = useState<Filter<MaterialCode>>(user.material ?? 'all');
  const [city, setCity] = useState<Filter<CityCode>>('all');
  const [deciding, setDeciding] = useState<{ id: string; kind: 'reschedule' | 'close' } | null>(null);

  const requests = useRequests();
  const queue = useMemo(() => (requests.data ?? []).filter((r) => r.status === 'needs_decision'), [requests.data]);
  const scoped = queue.filter((r) => (material === 'all' || r.material === material) && (city === 'all' || r.branch.city === city));
  // Most troubled first: more failed attempts, then longest waiting for a decision.
  const cards = scoped
    .filter((r) => type === 'all' || decisionType(r) === type)
    .sort((a, b) => priorFails(b) - priorFails(a) || (a.decisionSince ?? '').localeCompare(b.decisionSince ?? ''));

  return (
    <>
      <PageHero crumb={t.nav.decisions}>
        <HeroTitle title={t.nav.decisions} line={requests.data ? s.heroLine(scoped.length, material === 'all' ? null : l(MATERIALS[material].name)) : ' '} />
      </PageHero>

      <PageBody>
        <section className={clsx(cardClass, 'flex flex-wrap items-center gap-3 px-[18px] py-4')}>
          <ToggleGroup
            tone="chips"
            label={s.typeLabel}
            value={type}
            onChange={setType}
            options={(['all', 'partial', 'failed', 'no_result'] as const).map((k) => ({
              value: k,
              label: k === 'all' ? s.all : t.outcome[k],
              count: scoped.filter((r) => k === 'all' || decisionType(r) === k).length,
            }))}
          />
          <Select aria-label={t.material} value={material} onChange={(e) => setMaterial(e.target.value as Filter<MaterialCode>)} className="!w-auto min-w-[150px]">
            <option value="all">{t.allMaterials}</option>
            {MATERIAL_ORDER.map((m) => (
              <option key={m} value={m}>
                {l(MATERIALS[m].name)}
              </option>
            ))}
          </Select>
          <Select aria-label={t.city} value={city} onChange={(e) => setCity(e.target.value as Filter<CityCode>)} className="!w-auto min-w-[140px]">
            <option value="all">{t.allCities}</option>
            {CITY_ORDER.map((c) => (
              <option key={c} value={c}>
                {l(CITIES[c])}
              </option>
            ))}
          </Select>
          <span className="ms-auto text-[13px] text-muted">{s.hint}</span>
        </section>

        {requests.isError ? (
          <ErrorState title={s.errorTitle} body={s.errorBody} onRetry={() => requests.refetch()} />
        ) : !requests.data ? (
          <LoadingBlock>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(390px,100%),1fr))] gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-[18px]">
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-[100px]" />
                  <Skeleton className="h-3.5" />
                  <Skeleton className="h-11" />
                </div>
              ))}
            </div>
          </LoadingBlock>
        ) : requests.data.length === 0 ? (
          <EmptyState tone="success" icon="tick" title={s.emptyTitle} body={s.emptyBody} />
        ) : cards.length === 0 ? (
          <EmptyState tone="success" icon="tick" title={s.allDoneTitle} body={s.allDoneBody} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(390px,100%),1fr))] items-start gap-4">
            {cards.map((r) => (
              <DecisionCard
                key={r.id}
                r={r}
                deciding={deciding?.id === r.id ? deciding.kind : null}
                onDecide={(kind) => setDeciding(kind ? { id: r.id, kind } : null)}
              />
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}

const OTHER = '__other';
const decisionSchema = z
  .object({ kind: z.enum(['reschedule', 'close']), reason: z.string(), text: z.string() })
  .superRefine((v, ctx) => {
    if (v.kind !== 'close') return;
    if (!v.reason) ctx.addIssue({ code: 'custom', path: ['reason'], message: 'reason' });
    if (v.reason === OTHER && !v.text.trim()) ctx.addIssue({ code: 'custom', path: ['text'], message: 'text' });
  });
type DecisionForm = z.infer<typeof decisionSchema>;

function DecisionCard({ r, deciding, onDecide }: { r: RequestRow; deciding: 'reschedule' | 'close' | null; onDecide: (kind: 'reschedule' | 'close' | null) => void }) {
  const { l, lang } = useApp();
  const s = useStrings(DECISIONS_STRINGS);
  const { data: drivers = [] } = useDrivers();
  const type = decisionType(r);
  const attempt = lastAttempt(r);
  const driver = drivers.find((d) => d.id === attempt?.driverId);
  const fails = priorFails(r);
  const many = fails >= 2;
  const stale = isStaleDecision(r);
  const label = branchLabel(r.branch, lang);

  return (
    <article aria-label={`${label} — ${type}`} className={clsx('flex flex-col gap-3.5 rounded-[20px] bg-surface p-[18px] shadow-card', stale ? 'border-[1.5px] border-danger' : 'border border-line')}>
      <div className="flex items-start gap-3">
        <MaterialTile material={r.material} size={42} />
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-extrabold">{label}</div>
          <div className="text-[13px] text-muted">
            {r.id} · {materialLabel(r.material, r.subtype, lang)} · {l(CITIES[r.branch.city])}
          </div>
        </div>
        <OutcomePill outcome={type} className="!px-3 !py-[5px] !text-[13px]" />
      </div>

      {stale && (
        <div className="flex items-center gap-2 text-[13px] font-extrabold text-danger-ink">
          <Icon name="clock" size={16} strokeWidth={2} />
          {s.stale}
        </div>
      )}

      {/* Partial pickups show the driver's photo and note only — the driver does not record a weight. */}
      {type === 'partial' && (
        <div className="flex items-stretch gap-3.5">
          <div role="img" aria-label={s.driverPhoto} className="photo-placeholder flex h-[100px] w-[120px] flex-none items-end justify-center rounded-[14px] border border-line p-2">
            <span className="rounded-lg bg-surface px-2 py-0.5 text-[11px] font-bold">{s.photoTag}</span>
          </div>
          <div className="flex min-w-0 flex-1 items-center text-sm leading-relaxed text-muted">{s.partialNote}</div>
        </div>
      )}

      {type === 'no_result' && (
        <div className="flex items-start gap-3 rounded-[14px] bg-primary-soft px-3.5 py-3 text-ink">
          <span className="inline-flex size-9 flex-none items-center justify-center rounded-[10px] bg-surface text-primary">
            <Icon name="clock" size={18} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm leading-relaxed">
            <span>{s.noResult(attempt ? formatDay(attempt.day, lang, 'short') : '')}</span>
            <span className="text-[13px] text-muted">{s.noResultHint}</span>
          </div>
          {driver && (
            <a href={`tel:${driver.phone}`} className="inline-flex h-10 flex-none items-center rounded-xl border border-line bg-surface px-3.5 text-sm font-bold text-ink no-underline">
              {s.callDriver}
            </a>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {type !== 'no_result' && attempt?.reason && (
          <div className="text-sm">
            <span className="text-muted">{s.driverReason}</span>
            <strong>{textOf(attempt.reason, lang)}</strong>
          </div>
        )}
        {attempt?.note && (
          <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
            <span className="text-muted">{s.driverNote}</span>
            {attempt.note}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <span>
            {driver ? l(driver.name) : '—'} · {attempt ? formatRelative(attempt.at, lang) : ''}
          </span>
          <span className={clsx('rounded-full px-2.5 py-1 text-xs font-extrabold', many ? 'bg-danger-soft text-danger-ink' : 'bg-surface-2 text-muted')}>
            {fails === 0 ? s.firstIssue : s.priorFails(fails, many)}
          </span>
        </div>
      </div>

      {deciding ? (
        <DecisionForm r={r} initialKind={deciding} onDone={() => onDecide(null)} />
      ) : (
        <div className="flex gap-2 border-t border-line pt-3.5">
          <Button variant={many ? 'outline' : 'primary'} size="lg" className="flex-1" onClick={() => onDecide('reschedule')}>
            <Icon name="refresh" size={18} />
            {s.reschedule}
          </Button>
          <Button variant={many ? 'danger' : 'outline'} size="lg" className={clsx('flex-1', !many && '!text-danger-ink')} onClick={() => onDecide('close')}>
            <Icon name="lock" size={18} />
            {s.closeShort}
          </Button>
        </div>
      )}
    </article>
  );
}

function DecisionForm({ r, initialKind, onDone }: { r: RequestRow; initialKind: 'reschedule' | 'close'; onDone: () => void }) {
  const { t, l, lang, user } = useApp();
  const s = useStrings(DECISIONS_STRINGS);
  const decide = useDecide(user.id);
  const undo = useUndoDecision();
  const form = useForm<DecisionForm>({ resolver: zodResolver(decisionSchema), defaultValues: { kind: initialKind, reason: '', text: '' } });
  const [kind, reason] = useWatch({ control: form.control, name: ['kind', 'reason'] });
  const isClose = kind === 'close';
  const other = reason === OTHER;
  const errors = form.formState.errors;
  const label = branchLabel(r.branch, lang);

  const onSubmit = form.handleSubmit(async (v) => {
    const why = v.kind === 'close' ? (v.reason === OTHER ? v.text.trim() : CLOSE_REASONS[Number(v.reason)]) : '';
    try {
      if (v.kind === 'close') {
        await decide.mutateAsync({ id: r.id, decision: { kind: 'close', reason: why } });
        toast.success(s.toastClosed(r.id, textOf(why, lang), l(user.name)));
      } else {
        const note = v.text.trim();
        await decide.mutateAsync({ id: r.id, decision: { kind: 'reschedule', note } });
        toast.success(s.toastRescheduled(label, !!note), {
          duration: 8000,
          action: {
            label: s.undo,
            onClick: () => undo.mutate(r.id, { onSuccess: () => toast(s.undone), onError: (e) => toast.error(errorText(e, t)) }),
          },
        });
      }
      onDone();
    } catch (e) {
      toast.error(errorText(e, t));
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={clsx('flex flex-col gap-2.5 rounded-[14px] p-3', isClose ? 'bg-danger-soft text-danger-ink' : 'bg-primary-soft text-primary')}
    >
      <div role="radiogroup" aria-label={s.decisionLabel} className="grid grid-cols-2 gap-1.5 rounded-xl bg-surface p-1">
        {(['reschedule', 'close'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => {
              form.setValue('kind', k);
              form.clearErrors();
            }}
            className={clsx(
              'h-10 cursor-pointer rounded-[10px] border-0 font-extrabold',
              kind === k ? (k === 'close' ? 'bg-danger text-navy-ink' : 'bg-primary text-white') : 'bg-transparent text-ink',
            )}
          >
            {k === 'close' ? s.close : s.reschedule}
          </button>
        ))}
      </div>

      {isClose && (
        <Field label={<span className="text-current">{s.closeReason}</span>} error={errors.reason ? s.errReason : undefined}>
          {({ id, invalid, describedBy }) => (
            <Select id={id} aria-invalid={invalid} aria-describedby={describedBy} {...form.register('reason')}>
              <option value="">{t.chooseReason}</option>
              {CLOSE_REASONS.map((c, i) => (
                <option key={i} value={String(i)}>
                  {l(c)}
                </option>
              ))}
              <option value={OTHER}>{t.otherReason}</option>
            </Select>
          )}
        </Field>
      )}
      {(!isClose || other) && (
        <Field label={<span className="text-current">{isClose ? s.closeText : s.noteOptional}</span>} error={errors.text ? s.errText : undefined}>
          {({ id, invalid, describedBy }) => (
            <Textarea
              id={id}
              rows={2}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              placeholder={isClose ? s.closeTextPh : s.rescheduleNotePh(formatDay(nextWorkingDay(opsToday()), lang, 'weekday'))}
              {...form.register('text')}
            />
          )}
        </Field>
      )}
      <div className="text-[13px] leading-relaxed">{isClose ? s.closeHint : s.rescheduleHint}</div>
      <div className="flex gap-2">
        <Button type="submit" variant={isClose ? 'danger' : 'primary'} disabled={decide.isPending}>
          {isClose ? s.confirmClose : s.confirmReschedule}
        </Button>
        <Button onClick={onDone}>{t.back}</Button>
      </div>
    </form>
  );
}
