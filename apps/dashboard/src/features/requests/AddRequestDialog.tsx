import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useApp, useStrings } from '../../lib/app-context';
import { useBranches, useCreateRequest, useRequests } from '../../data/queries';
import { DuplicateRequestError } from '../../data/api';
import { errorText } from '../../lib/supabase';
import { CHAINS, CHAIN_ORDER, MATERIALS, MATERIAL_ORDER, SUBTYPES } from '../../data/catalog';
import { OPEN_STATUSES } from '../../data/selectors';
import type { ChainCode, MaterialCode, SubtypeCode } from '../../data/types';
import { branchLabel, cityName } from '../../lib/format';
import { Dialog } from '../../components/ui/Dialog';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { REQUESTS_STRINGS } from './strings';

export interface AddRequestDefaults {
  chain?: ChainCode;
  number?: string;
}

const schema = z.object({
  chain: z.string().min(1),
  number: z.string().trim().min(1),
  material: z.string().min(1),
  subtype: z.string(),
  kg: z.string().refine((v) => v.trim() === '' || (/^\d+$/.test(v.trim()) && Number(v) > 0), 'kg'),
  note: z.string(),
});
type FormValues = z.infer<typeof schema>;

/** Ops adds a pickup request on behalf of a branch (e.g. after calling a late branch). */
export function AddRequestDialog({
  open,
  onOpenChange,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: AddRequestDefaults;
}) {
  const { t, l, lang, user } = useApp();
  const s = useStrings(REQUESTS_STRINGS).addForm;
  const navigate = useNavigate();
  const { data: branches = [] } = useBranches();
  const { data: rows = [] } = useRequests();
  const create = useCreateRequest(user.id);

  const initial: FormValues = useMemo(
    () => ({ chain: defaults?.chain ?? '', number: defaults?.number ?? '', material: user.material ?? '', subtype: '', kg: '', note: '' }),
    [defaults?.chain, defaults?.number, user.material],
  );

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: initial });
  const { register, handleSubmit, reset, setValue, formState } = form;
  const [chain, number, material, subtype] = useWatch({ control: form.control, name: ['chain', 'number', 'material', 'subtype'] });

  useEffect(() => {
    if (open) reset(initial);
  }, [open, initial, reset]);

  // Branch lookup by chain + number ("7" matches "007").
  const branch = useMemo(() => {
    const no = number.trim();
    if (!chain || !no) return undefined;
    return branches.find((b) => b.chain === chain && (b.number === no || Number(b.number) === Number(no)));
  }, [branches, chain, number]);

  const subtypes = material ? MATERIALS[material as MaterialCode].subtypes : [];
  const needsSubtype = subtypes.length > 0;

  // One open request per branch per material subtype.
  const duplicate = useMemo(() => {
    if (!branch?.active || !material || (needsSubtype && !subtype)) return undefined;
    return rows.find((r) => r.branchId === branch.id && r.material === material && (r.subtype ?? '') === (subtype || '') && OPEN_STATUSES.includes(r.status));
  }, [rows, branch, material, subtype, needsSubtype]);

  let lookup: { text: string; ok: boolean } | null = null;
  if (chain && number.trim()) {
    if (!branch) lookup = { text: s.notFound(number.trim(), CHAINS[chain as ChainCode][lang]), ok: false };
    else if (!branch.active) lookup = { text: s.inactive(branchLabel(branch, lang)), ok: false };
    else lookup = { text: `✓ ${branchLabel(branch, lang)} · ${cityName(branch, lang)}`, ok: true };
  }

  const submitted = formState.isSubmitted;
  const missing = submitted && (!chain || !branch?.active || !material || (needsSubtype && !subtype));

  const onSubmit = handleSubmit(async (v) => {
    if (!branch?.active || (needsSubtype && !v.subtype) || duplicate) return;
    try {
      const req = await create.mutateAsync({
        branchId: branch.id,
        material: v.material as MaterialCode,
        subtype: (v.subtype || null) as SubtypeCode | null,
        kg: v.kg.trim() ? Number(v.kg) : null,
        note: v.note.trim(),
      });
      onOpenChange(false);
      toast.success(s.done(req.id, branchLabel(branch, lang)));
    } catch (e) {
      if (e instanceof DuplicateRequestError) return; // shown inline on the next render
      toast.error(errorText(e, t));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} kicker={s.kicker} title={s.title}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-3">
          <Field label={s.chain}>
            {({ id }) => (
              <Select id={id} aria-invalid={(submitted && !chain) || undefined} {...register('chain')}>
                <option value="">{s.chooseChain}</option>
                {CHAIN_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CHAINS[c][lang]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={s.number}>
            {({ id }) => (
              <Input
                id={id}
                inputMode="numeric"
                autoComplete="off"
                placeholder={s.numberPh}
                dir="ltr"
                className="rtl:text-right"
                aria-invalid={(lookup && !lookup.ok) || (submitted && !branch?.active) || undefined}
                {...register('number')}
              />
            )}
          </Field>
        </div>
        {lookup && (
          <div role="status" className={`-mt-1.5 text-sm font-extrabold ${lookup.ok ? 'text-success' : 'text-danger-ink'}`}>
            {lookup.text}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label={s.material}>
            {({ id }) => (
              <Select
                id={id}
                aria-invalid={(submitted && !material) || undefined}
                {...register('material', { onChange: () => setValue('subtype', '') })}
              >
                <option value="">{s.chooseMaterial}</option>
                {MATERIAL_ORDER.map((m) => (
                  <option key={m} value={m}>
                    {MATERIALS[m].name[lang]}
                    {MATERIALS[m].subtypes.length ? ` (${MATERIALS[m].subtypes.map((x) => SUBTYPES[x][lang]).join(lang === 'ar' ? '، ' : ', ')})` : ''}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {needsSubtype && (
            <Field label={s.subtype}>
              {({ id }) => (
                <Select id={id} aria-invalid={(submitted && !subtype) || undefined} {...register('subtype')}>
                  <option value="">{s.chooseSubtype}</option>
                  {subtypes.map((x) => (
                    <option key={x} value={x}>
                      {SUBTYPES[x][lang]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </div>

        {duplicate && (
          <div role="alert" className="flex flex-wrap items-center gap-2.5 rounded-[14px] bg-danger-soft px-3.5 py-3 text-sm font-bold text-danger-ink">
            <span className="min-w-[200px] flex-1">
              {s.duplicate(subtype ? s.duplicateSubtype(SUBTYPES[subtype as SubtypeCode][lang]) : s.duplicateMaterial, duplicate.id, t.status[duplicate.status])}
            </span>
            <Button
              size="sm"
              className="!h-9 border border-current !bg-transparent !text-inherit"
              onClick={() => {
                onOpenChange(false);
                navigate(`/requests?open=${duplicate.id}`);
              }}
            >
              {s.viewRequest}
            </Button>
          </div>
        )}

        <Field label={s.kg} error={formState.errors.kg ? s.errKg : undefined}>
          {({ id, invalid, describedBy }) => (
            <Input id={id} type="number" min={1} inputMode="numeric" placeholder={s.kgPh} dir="ltr" className="rtl:text-right" aria-invalid={invalid} aria-describedby={describedBy} {...register('kg')} />
          )}
        </Field>
        <Field label={s.note}>{({ id }) => <Textarea id={id} rows={3} placeholder={s.notePh} {...register('note')} />}</Field>

        <div className="text-[13px] text-muted">{s.owner(l(user.name))}</div>
        {missing && (
          <div role="alert" className="text-sm font-bold text-danger-ink">
            {s.errRequired}
          </div>
        )}

        <div className="flex gap-2.5">
          <Button type="submit" variant="gold" size="lg" className="h-[50px] flex-1 text-base" disabled={!!duplicate || create.isPending}>
            {s.submit}
          </Button>
          <Button size="lg" className="h-[50px]" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
