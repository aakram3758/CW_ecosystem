import { useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useApp, usePageTitle, useStrings } from '../../lib/app-context';
import { useCatalog, useReasonUsage } from '../../data/queries';
import { addReason, reorderReasons, setReasonActive, updateReason, type ReasonKind } from '../../data/admin';
import type { CatalogRows } from '../../data/catalog';
import { HeroTitle, PageBody, PageHero } from '../../components/layout/PageHero';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { ToggleGroup } from '../../components/ui/Toggles';
import { EmptyState, ErrorState, LoadingBlock, Skeleton, cardClass } from '../../components/ui/States';
import { ADMIN_STRINGS, IconButton, Pill, useRun } from '../admin/shared';
import { LISTS_STRINGS } from './strings';

type ReasonRow = CatalogRows['reasons'][number];
const KINDS: ReasonKind[] = ['failed', 'partial', 'close', 'cancel'];
const norm = (x: string) => x.trim().replace(/\s+/g, ' ');

/** Editable lists: the reasons drivers, branches and ops pick from. */
export function ListsPage() {
  const { t, lang } = useApp();
  const s = useStrings(LISTS_STRINGS);
  const a = useStrings(ADMIN_STRINGS);
  usePageTitle(t.nav.lists);

  const catalog = useCatalog();
  const usage = useReasonUsage();
  const { run, busy } = useRun();
  const [kind, setKind] = useState<ReasonKind>('failed');
  const [edit, setEdit] = useState<{ id: string; ar: string; en: string; err: string } | null>(null);
  const [add, setAdd] = useState('');
  const [addErr, setAddErr] = useState('');

  const rows = catalog.data;
  const list = (rows?.reasons ?? []).filter((r) => r.kind === kind).sort((x, y) => x.sort_order - y.sort_order);
  const meta = s.meta[kind];
  const label = (r: ReasonRow) => (lang === 'ar' ? r.label_ar : r.label_en || r.label_ar);
  const dupe = (text: string, except?: string) => list.some((r) => r.id !== except && (r.label_ar === text || r.label_en.toLowerCase() === text.toLowerCase()));

  const move = (i: number, dir: -1 | 1) => {
    const ids = list.map((r) => r.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    void run(() => reorderReasons(ids));
  };

  const toggle = async (r: ReasonRow) => {
    if (r.active && list.filter((x) => x.active).length === 1) return toast.error(s.keepOne);
    if (await run(() => setReasonActive(r.id, !r.active))) {
      if (r.active) toast.success(s.off(label(r)), { action: { label: s.undo, onClick: () => void run(() => setReasonActive(r.id, true), s.on(label(r))) }, duration: 8000 });
      else toast.success(s.on(label(r)));
    }
  };

  const saveEdit = async () => {
    if (!edit) return;
    const ar = norm(edit.ar);
    const en = norm(edit.en);
    if (!ar) return setEdit({ ...edit, err: s.errText });
    if (dupe(ar, edit.id) || (en && dupe(en, edit.id))) return setEdit({ ...edit, err: s.errDupe });
    if (await run(() => updateReason(edit.id, { ar, en: en || ar }), s.saved)) setEdit(null);
  };

  const submitAdd = async () => {
    const v = norm(add);
    if (!v) return setAddErr(s.errText);
    if (dupe(v)) return setAddErr(s.errDupe);
    if (await run(() => addReason(kind, { ar: v, en: v }), s.added(v))) setAdd('');
  };

  let pos = 0;
  return (
    <>
      <PageHero crumb={t.nav.lists} parent={t.nav.adminSection}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <HeroTitle title={t.nav.lists} line={rows ? s.heroLine(list.filter((r) => r.active).length, meta.title) : ' '} />
          <ToggleGroup
            tone="dark"
            label={s.tabsLabel}
            value={kind}
            onChange={(k) => (setKind(k), setEdit(null), setAdd(''), setAddErr(''))}
            options={KINDS.map((k) => ({ value: k, label: s.meta[k].tab, count: (rows?.reasons ?? []).filter((r) => r.kind === k && r.active).length }))}
          />
        </div>
      </PageHero>

      <PageBody>
        <section className={clsx(cardClass, 'mx-auto flex w-full max-w-[880px] flex-col overflow-hidden')}>
          <div className="px-5 py-4">
            <h2 className="m-0 text-lg font-extrabold">{meta.title}</h2>
            <div className="text-[13px] text-muted">{meta.hint}</div>
          </div>

          {catalog.isError && !rows ? (
            <ErrorState className="!rounded-none !border-0 !shadow-none" title={s.loadError} body={a.loadBody} onRetry={() => catalog.refetch()} />
          ) : !rows ? (
            <LoadingBlock>
              <div className="flex flex-col gap-2 p-5">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            </LoadingBlock>
          ) : (
            <>
              {list.length === 0 ? (
                <EmptyState className="!rounded-none !border-0 !shadow-none" icon="lists" title={s.emptyTitle} body={s.emptyBody} />
              ) : (
                <ol className="m-0 list-none p-0">
                  {list.map((r, i) => {
                    if (r.active) pos += 1;
                    const text = label(r);
                    const editing = edit?.id === r.id;
                    return (
                      <li key={r.id} data-testid="reason-row" className={clsx('flex flex-wrap items-center gap-3 border-t border-line px-5 py-3', !r.active && !editing && 'opacity-70')}>
                        <span className={clsx('inline-flex size-[30px] flex-none items-center justify-center rounded-[10px] text-[13px] font-extrabold', r.active ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-muted')}>
                          {r.active ? pos : '—'}
                        </span>
                        {editing ? (
                          <>
                            <span className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                              <span className="grid gap-2 sm:grid-cols-2">
                                <Input aria-label={s.newText} value={edit.ar} aria-invalid={!!edit.err} onChange={(e) => setEdit({ ...edit, ar: e.target.value, err: '' })} autoFocus />
                                <Input aria-label={s.newTextEn} dir="ltr" placeholder={s.newTextEn} value={edit.en} onChange={(e) => setEdit({ ...edit, en: e.target.value, err: '' })} />
                              </span>
                              {edit.err ? <span className="text-[13px] font-bold text-danger-ink">{edit.err}</span> : <span className="text-xs text-muted">{s.keepOld}</span>}
                            </span>
                            <Button size="sm" variant="primary" onClick={saveEdit} disabled={busy}>
                              {a.save}
                            </Button>
                            <Button size="sm" onClick={() => setEdit(null)}>
                              {t.cancel}
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="min-w-[170px] flex-1">
                              <span className="block font-bold">{text}</span>
                              <span className="block text-xs text-muted">{usage.data ? s.used(usage.data[r.id] ?? 0, meta.unit) : ' '}</span>
                            </span>
                            {!r.active && <Pill tone="muted">{s.inactive}</Pill>}
                            <IconButton icon="up" label={s.up(text)} disabled={i === 0 || busy} onClick={() => move(i, -1)} />
                            <IconButton icon="down" label={s.down(text)} disabled={i === list.length - 1 || busy} onClick={() => move(i, 1)} />
                            <IconButton icon="edit" label={s.edit(text)} onClick={() => setEdit({ id: r.id, ar: r.label_ar, en: r.label_en === r.label_ar ? '' : r.label_en, err: '' })} />
                            <IconButton icon="power" tone={r.active ? 'danger' : 'success'} label={s.toggle(r.active, text)} disabled={busy} onClick={() => toggle(r)} />
                          </>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
              <form
                className="flex flex-col gap-1.5 border-t border-line px-5 py-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitAdd();
                }}
              >
                <span className="flex gap-2">
                  <Input aria-label={s.addLabel} placeholder={s.addPh} value={add} aria-invalid={!!addErr} onChange={(e) => (setAdd(e.target.value), setAddErr(''))} />
                  <Button type="submit" variant="primary" disabled={busy}>
                    {a.add}
                  </Button>
                </span>
                {addErr && <span className="text-[13px] font-bold text-danger-ink">{addErr}</span>}
              </form>
            </>
          )}
        </section>
      </PageBody>
    </>
  );
}
