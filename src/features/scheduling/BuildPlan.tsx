import { useMemo, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useApp, useStrings } from '../../lib/app-context';
import { errorText } from '../../lib/supabase';
import { useApprovePlan } from '../../data/queries';
import type { RequestRow } from '../../data/api';
import { CITIES, MATERIALS, MAX_VISITS_PER_DAY } from '../../data/catalog';
import type { CityCode, DayKey, Driver, MaterialCode } from '../../data/types';
import { ageInDays, formatDay } from '../../lib/dates';
import { branchLabel, districtName, initials, materialColor, typeLabel } from '../../lib/format';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Icon } from '../../components/ui/Icon';
import { EmptyState, cardClass } from '../../components/ui/States';
import { useDraft } from './draftStore';
import { buildModel, driverColor, type DriverLoad, type PlanModel } from './planModel';
import { SCHEDULING_STRINGS } from './strings';

interface Props {
  rows: RequestRow[];
  drivers: Driver[];
  city: CityCode;
  material: MaterialCode;
  planDay: DayKey;
  onApproved: () => void;
  onShowApproved: () => void;
}

interface DragPayload {
  ids: string[];
  label: string;
}

const ROW_GRID = 'grid grid-cols-[36px_24px_96px_minmax(190px,1.6fr)_110px_72px_72px_minmax(160px,1fr)] items-center gap-2.5';

/** Pointer: drop where the cursor is. Keyboard: fall back to overlapping rectangles. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

export function BuildPlan({ rows, drivers, city, material, planDay, onApproved, onShowApproved }: Props) {
  const { t, l, lang, theme } = useApp();
  const s = useStrings(SCHEDULING_STRINGS);
  const dark = theme === 'dark';
  const key = `${city}|${material}`;
  const [draft, setDraft] = useDraft(key);
  const m = useMemo(() => buildModel(rows, drivers, city, material, planDay, draft), [rows, drivers, city, material, planDay, draft]);

  const [grouped, setGrouped] = useState(true);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const matName = l(MATERIALS[material].name);
  const cityLabel = l(CITIES[city]);
  const dayName = formatDay(planDay, lang, 'weekday');
  const colorOf = (driverId: string) => driverColor(m.available.findIndex((d) => d.id === driverId), dark);
  const driverById = (id: string) => drivers.find((d) => d.id === id);

  // ---------------------------------------------------------------- actions
  const assign = (ids: string[], driverId: string, message: string) => {
    const live = ids.filter((id) => m.live.some((r) => r.id === id));
    if (!live.length) return;
    setDraft((d) => ({ ...d, assign: { ...d.assign, ...Object.fromEntries(live.map((id) => [id, driverId])) } }));
    setSelected([]);
    toast(message);
  };
  const exclude = (ids: string[]) => {
    setDraft((d) => ({ ...d, removed: [...new Set([...d.removed, ...ids])] }));
    setSelected([]);
    toast(s.toastExcluded(ids.length, dayName));
  };
  const restore = (id: string) => setDraft((d) => ({ ...d, removed: d.removed.filter((x) => x !== id) }));
  const toggleSel = (ids: string[], on: boolean) => setSelected((cur) => (on ? [...new Set([...cur, ...ids])] : cur.filter((x) => !ids.includes(x))));

  // ---------------------------------------------------------------- drag & drop
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const nameOfDroppable = (id: string | number | undefined) => {
    const d = typeof id === 'string' ? driverById(id.replace('drv:', '')) : undefined;
    return d ? l(d.name) : '';
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => (active.data.current as DragPayload).label,
    onDragOver: ({ over }) => (over ? nameOfDroppable(over.id) : ''),
    onDragEnd: ({ over }) => (over ? nameOfDroppable(over.id) : ''),
    onDragCancel: () => t.cancel,
  };

  // ---------------------------------------------------------------- rendering helpers
  const visible = (r: RequestRow) => !onlyUnassigned || (r.status === 'waiting' && !m.assign[r.id]);
  const sections = useMemo(() => {
    if (!grouped) return [{ district: null as string | null, rows: m.queue }];
    const order: string[] = [];
    const map: Record<string, RequestRow[]> = {};
    m.queue.forEach((r) => {
      if (!map[r.branch.district]) {
        map[r.branch.district] = [];
        order.push(r.branch.district);
      }
      map[r.branch.district].push(r);
    });
    return order.map((district) => ({ district, rows: map[district] }));
  }, [grouped, m.queue]);

  const visibleLiveIds = m.queue.filter((r) => visible(r) && r.status === 'waiting').map((r) => r.id);
  const allChecked = visibleLiveIds.length > 0 && visibleLiveIds.every((id) => selected.includes(id));

  if (m.live.length === 0 && m.cancelled.length === 0) {
    return (
      <>
        <EmptyState
          title={s.nothingTitle(matName, cityLabel)}
          body={s.nothingBody(dayName)}
          action={
            <Button size="lg" onClick={onShowApproved}>
              {s.showApproved}
            </Button>
          }
        />
        {m.removed.length > 0 && <RemovedList model={m} dayName={dayName} onRestore={restore} />}
      </>
    );
  }

  const approveDisabled = m.assigned.length === 0;
  const approveHint = approveDisabled
    ? m.available.length === 0
      ? s.hintNoDriver
      : s.hintAssignOne
    : m.unassigned.length
      ? s.hintUnassignedStay
      : m.hasApprovedAlready
        ? s.hintAddKeeps
        : s.hintNobody;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      accessibility={{ announcements, screenReaderInstructions: { draggable: lang === 'ar' ? 'اضغط مسافة للالتقاط، ثم الأسهم للتحريك، ثم مسافة للإفلات على سائق، أو Esc للإلغاء.' : 'Press space to pick up, arrow keys to move, space to drop on a driver, or Esc to cancel.' } }}
      onDragStart={(e) => setDragging(e.active.data.current as DragPayload)}
      onDragCancel={() => setDragging(null)}
      onDragEnd={(e) => {
        setDragging(null);
        const payload = e.active.data.current as DragPayload;
        const driver = e.over ? driverById(String(e.over.id).replace('drv:', '')) : undefined;
        if (!driver) return;
        const name = l(driver.name);
        const isDistrict = String(e.active.id).startsWith('dist:');
        assign(payload.ids, driver.id, isDistrict ? s.toastAssignedDistrict(payload.label, payload.ids.length, name) : s.toastAssignedOne(name));
      }}
    >
      {m.available.length === 0 && m.live.length > 0 && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[18px] bg-danger-soft px-[18px] py-3.5 font-bold text-danger-ink">
          <span className="min-w-[240px] flex-1">{s.noDrivers(matName, cityLabel, dayName)}</span>
          <ButtonLink to="/drivers" size="sm" className="!border-0 !bg-surface !text-danger-ink">
            {s.openDrivers}
          </ButtonLink>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-4">
        {/* ---------------- queue */}
        <section aria-label={s.queueTitle(matName, cityLabel)} className={clsx(cardClass, 'min-w-0 flex-[999_1_560px] overflow-hidden')}>
          <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-4 py-3.5">
            <h2 className="m-0 min-w-[180px] flex-1 text-[17px] font-extrabold">{s.queueTitle(matName, cityLabel)}</h2>
            <PressButton on={grouped} onClick={() => setGrouped(!grouped)}>
              {s.groupByDistrict}
            </PressButton>
            <PressButton on={onlyUnassigned} onClick={() => setOnlyUnassigned(!onlyUnassigned)}>
              {s.onlyUnassigned}
              <span className={clsx('rounded-full px-2 py-px text-xs', m.unassigned.length ? 'bg-coral text-navy-ink' : 'bg-success-soft text-success')}>{m.unassigned.length}</span>
            </PressButton>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5 border-b border-line bg-primary-soft px-4 py-2.5">
              <span className="text-sm font-extrabold text-primary">{s.selected(selected.length)}</span>
              <DriverSelect
                label={s.assignSelectedLabel}
                placeholder={s.assignTo}
                value=""
                loads={m.loads}
                onPick={(id) => assign(selected, id, s.toastAssignedMany(selected.length, l(driverById(id)!.name)))}
                className="!h-[38px] min-w-[220px] !w-auto"
              />
              <Button size="sm" className="!h-[38px] !text-danger-ink" onClick={() => exclude(selected)}>
                {s.exclude(dayName)}
              </Button>
              <Button variant="ghost" size="sm" className="!h-[38px]" onClick={() => setSelected([])}>
                {s.clearSelection}
              </Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div className={clsx(ROW_GRID, 'bg-surface-2 px-4 py-2.5 text-xs font-bold text-muted')}>
                <span>
                  <input type="checkbox" className="check" checked={allChecked} onChange={() => toggleSel(visibleLiveIds, !allChecked)} aria-label={s.selectAll} />
                </span>
                <span />
                <span>{s.cols.id}</span>
                <span>{s.cols.branch}</span>
                <span>{s.cols.type}</span>
                <span>{s.cols.kg}</span>
                <span>{s.cols.age}</span>
                <span>{s.cols.driver}</span>
              </div>

              {sections.map((sec) => {
                const rowsShown = sec.rows.filter(visible);
                if (sec.district && onlyUnassigned && rowsShown.length === 0) return null;
                const open = !sec.district || !collapsed[sec.district];
                return (
                  <div key={sec.district ?? 'all'}>
                    {sec.district && (
                      <DistrictHeader
                        district={sec.district}
                        rows={sec.rows}
                        model={m}
                        open={open}
                        selected={selected}
                        onToggleOpen={() => setCollapsed((c) => ({ ...c, [sec.district!]: open }))}
                        onToggleSel={toggleSel}
                        onAssign={(ids, driverId) =>
                          assign(ids, driverId, s.toastAssignedDistrict(districtName(sec.district!, lang), ids.length, l(driverById(driverId)!.name)))
                        }
                      />
                    )}
                    {open &&
                      rowsShown.map((r) => (
                        <QueueRow
                          key={r.id}
                          r={r}
                          showDistrict={!grouped}
                          sameStop={r.status === 'waiting' && m.sameStop(r)}
                          driver={m.assign[r.id] ? driverById(m.assign[r.id]) : undefined}
                          driverColor={m.assign[r.id] ? colorOf(m.assign[r.id]) : ''}
                          checked={selected.includes(r.id)}
                          onCheck={(on) => toggleSel([r.id], on)}
                        />
                      ))}
                  </div>
                );
              })}

              {onlyUnassigned && m.unassigned.length === 0 && (
                <div className="flex flex-col items-center gap-2 border-t border-line px-4 py-9 text-center">
                  <div className="text-[17px] font-extrabold">{s.allAssigned}</div>
                  <div className="text-sm text-muted">{s.allAssignedBody}</div>
                  <Button size="sm" onClick={() => setOnlyUnassigned(false)}>
                    {s.showAll}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ---------------- drivers */}
        <aside aria-label={t.nav.drivers} className="flex flex-[1_1_280px] flex-col gap-3">
          <div className={clsx(cardClass, 'flex flex-col gap-3 p-[18px]')}>
            <h2 className="m-0 text-[17px] font-extrabold">{s.driversTitle(matName, dayName)}</h2>
            <p className="m-0 text-[13px] text-muted">{s.driversHint}</p>
            {m.loads.map((load) => (
              <DriverCard key={load.driver.id} load={load} color={colorOf(load.driver.id)} highlight={!!dragging} />
            ))}
            {m.unavailable.map((d) => (
              <div key={d.id} className="text-xs text-muted">
                {l(d.name)} — {d.unavailableNote ? l(d.unavailableNote) : ''}
              </div>
            ))}
          </div>
          {m.removed.length > 0 && <RemovedList model={m} dayName={dayName} onRestore={restore} />}
        </aside>
      </div>

      {/* ---------------- sticky approval bar */}
      <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-x-[18px] gap-y-2 rounded-[20px] bg-navy px-4 py-3 text-white shadow-[0_16px_40px_rgba(11,27,46,.35)] sm:px-[18px] sm:py-3.5">
        <span className="text-sm text-side-text">
          <strong className="text-xl text-white">{m.assigned.length}</strong> {s.assignedNow}
        </span>
        <span className={clsx('text-sm', m.unassigned.length ? 'text-[#F49A90]' : 'text-[#46C489]')}>
          <strong className="text-xl">{m.unassigned.length}</strong> {s.unassigned}
        </span>
        <span className="hidden text-sm text-side-text sm:inline">
          {s.afterApproval} <strong className="text-xl text-white">{m.visitsTotal}</strong> {s.visitsOn} <strong className="text-xl text-white">{m.used.length}</strong> {s.driversWord}
        </span>
        <span className="hidden flex-1 sm:block" />
        <span className="hidden text-xs text-side-muted md:inline">{approveHint}</span>
        <Button
          variant="gold"
          size="lg"
          title={approveHint}
          className="h-[50px] w-full text-base sm:w-auto disabled:!bg-white/[.12] disabled:!text-side-muted disabled:!opacity-100"
          disabled={approveDisabled}
          onClick={() => setConfirmOpen(true)}
        >
          {m.hasApprovedAlready ? s.approveAdd : s.approve}
        </Button>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-navy px-3.5 py-2.5 text-sm font-extrabold text-white shadow-pop">
            <Icon name="grip" size={16} />
            {dragging.label}
            {dragging.ids.length > 1 && <span className="rounded-full bg-gold px-2 text-xs text-navy-ink">{dragging.ids.length}</span>}
          </div>
        )}
      </DragOverlay>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        model={m}
        planDay={planDay}
        matName={matName}
        cityLabel={cityLabel}
        colorOf={colorOf}
        onDone={(count) => {
          setDraft((d) => ({ ...d, assign: Object.fromEntries(Object.entries(d.assign).filter(([id]) => !m.assign[id])) }));
          setConfirmOpen(false);
          toast.success(s.toastApproved(m.hasApprovedAlready, count, formatDay(planDay, lang, 'long'), matName, cityLabel));
          onApproved();
        }}
      />
    </DndContext>
  );
}

/* ---------------------------------------------------------------- pieces */

function PressButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={clsx(
        'inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-primary',
        on ? 'border-side bg-side text-white' : 'border-line bg-surface text-ink hover:bg-surface-2',
      )}
    >
      {children}
    </button>
  );
}

function DriverSelect({
  label,
  placeholder,
  value,
  loads,
  onPick,
  className,
}: {
  label: string;
  placeholder: string;
  value: string;
  loads: DriverLoad[];
  onPick: (driverId: string) => void;
  className?: string;
}) {
  const { l } = useApp();
  const s = useStrings(SCHEDULING_STRINGS);
  return (
    <select aria-label={label} className={clsx('fld font-bold', className)} value={value} onChange={(e) => e.target.value && onPick(e.target.value)}>
      <option value="">{placeholder}</option>
      {loads.map((ld) => (
        <option key={ld.driver.id} value={ld.driver.id}>
          {s.driverOption(l(ld.driver.name), ld.oldVisits, ld.newVisits)}
        </option>
      ))}
    </select>
  );
}

function DistrictHeader({
  district,
  rows,
  model: m,
  open,
  selected,
  onToggleOpen,
  onToggleSel,
  onAssign,
}: {
  district: string;
  rows: RequestRow[];
  model: PlanModel;
  open: boolean;
  selected: string[];
  onToggleOpen: () => void;
  onToggleSel: (ids: string[], on: boolean) => void;
  onAssign: (ids: string[], driverId: string) => void;
}) {
  const { lang } = useApp();
  const s = useStrings(SCHEDULING_STRINGS);
  const name = districtName(district, lang);
  const live = rows.filter((r) => r.status === 'waiting');
  const ids = live.map((r) => r.id);
  const done = live.filter((r) => m.assign[r.id]).length;
  const complete = live.length > 0 && done === live.length;
  const driversHere = [...new Set(live.map((r) => m.assign[r.id] ?? ''))];
  const common = driversHere.length === 1 ? driversHere[0] : '';
  const allChecked = ids.length > 0 && ids.every((id) => selected.includes(id));
  const kg = live.reduce((sum, r) => sum + (r.kg ?? 0), 0);

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `dist:${district}`,
    data: { ids, label: name } satisfies DragPayload,
    disabled: ids.length === 0,
  });

  return (
    <div ref={setNodeRef} {...listeners} className={clsx('flex flex-wrap items-center gap-2.5 border-t border-line bg-canvas px-4 py-2.5', ids.length && 'cursor-grab active:cursor-grabbing', isDragging && 'opacity-50')}>
      <input type="checkbox" className="check" checked={allChecked} onChange={() => onToggleSel(ids, !allChecked)} aria-label={s.selectDistrict(name)} disabled={!ids.length} />
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={open}
        aria-label={open ? s.collapse(name) : s.expand(name)}
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[10px] border border-line bg-surface p-0 text-ink"
      >
        <Icon name="chevDown" size={16} strokeWidth={2.2} className={clsx('transition-transform', !open && 'ltr:-rotate-90 rtl:rotate-90')} />
      </button>
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        aria-label={s.dragDistrict(name)}
        className="inline-flex size-8 cursor-grab items-center justify-center rounded-[10px] border-0 bg-transparent p-0 text-muted"
      >
        <Icon name="grip" size={16} strokeWidth={3} />
      </button>
      <span className="flex min-w-[160px] flex-1 flex-col">
        <span className="text-base font-extrabold">{name}</span>
        <span className="text-xs text-muted">{s.districtMeta(live.length, kg, rows.length - live.length)}</span>
      </span>
      {live.length > 0 && (
        <span className={clsx('rounded-full px-2.5 py-1 text-xs font-extrabold', complete ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger-ink')}>
          {complete ? s.districtAll(done, live.length) : s.districtSome(done, live.length)}
        </span>
      )}
      {live.length > 0 && (
        <DriverSelect
          label={s.assignDistrictLabel(name)}
          placeholder={driversHere.length > 1 ? s.assignDistrictMixed : s.assignDistrict}
          value={common}
          loads={m.loads}
          onPick={(id) => onAssign(ids, id)}
          className="!h-10 !w-auto min-w-[230px]"
        />
      )}
    </div>
  );
}

function QueueRow({
  r,
  showDistrict,
  sameStop,
  driver,
  driverColor: color,
  checked,
  onCheck,
}: {
  r: RequestRow;
  showDistrict: boolean;
  sameStop: boolean;
  driver?: Driver;
  driverColor: string;
  checked: boolean;
  onCheck: (on: boolean) => void;
}) {
  const { t, l, lang, theme } = useApp();
  const s = useStrings(SCHEDULING_STRINGS);
  const cancelled = r.status === 'cancelled';
  const label = branchLabel(r.branch, lang);
  const age = ageInDays(r.createdAt);
  const mc = materialColor(r.material, theme === 'dark');
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `req:${r.id}`,
    data: { ids: [r.id], label: `${r.id} · ${label}` } satisfies DragPayload,
    disabled: cancelled,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      className={clsx(
        ROW_GRID,
        'border-t border-line px-4 py-2.5 transition-colors',
        !cancelled && 'cursor-grab hover:bg-surface-2 active:cursor-grabbing',
        checked && 'bg-primary-soft',
        cancelled && 'opacity-75',
        isDragging && 'opacity-40',
      )}
    >
      <span>
        <input type="checkbox" className="check" checked={checked} disabled={cancelled} onChange={() => onCheck(!checked)} aria-label={s.selectRow(r.id)} />
      </span>
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        disabled={cancelled}
        aria-label={s.dragHandle(r.id)}
        className="inline-flex size-6 cursor-grab items-center justify-center rounded-md border-0 bg-transparent p-0 text-muted disabled:cursor-default disabled:opacity-40"
      >
        <Icon name="grip" size={16} strokeWidth={3} />
      </button>
      <span className="text-[13px] font-bold text-primary">{r.id}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={clsx('text-sm font-bold', cancelled && 'text-muted line-through')}>{label}</span>
        {showDistrict && <span className="text-xs text-muted">{districtName(r.branch.district, lang)}</span>}
        {sameStop && <span className="self-start rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-extrabold text-primary">{s.sameStop}</span>}
        {cancelled && <span className="self-start rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-extrabold text-danger-ink">{s.cancelledNow}</span>}
      </span>
      <span className="justify-self-start whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold" style={{ color: mc, background: `${mc}1F` }}>
        {typeLabel(r.material, r.subtype, lang)}
      </span>
      <span className="text-sm">{r.kg ? `${r.kg} ${t.kg}` : '—'}</span>
      <span className={clsx('text-sm', age >= 1 && 'font-extrabold text-danger-ink')}>{s.age(age)}</span>
      <span>
        {driver ? (
          <span className="inline-flex items-center gap-2">
            <DriverChip name={l(driver.name)} color={color} size={28} />
            <span className="text-[13px] font-bold">{l(driver.name)}</span>
          </span>
        ) : (
          !cancelled && <span className="text-[13px] font-bold text-danger-ink">{s.noDriver}</span>
        )}
      </span>
    </div>
  );
}

export function DriverChip({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-none items-center justify-center font-extrabold"
      style={{ width: size, height: size, borderRadius: Math.round(size / 3), fontSize: size > 30 ? 14 : 11, color, background: `${color}26`, border: `1px solid ${color}55` }}
    >
      {initials(name)}
    </span>
  );
}

function DriverCard({ load, color, highlight }: { load: DriverLoad; color: string; highlight: boolean }) {
  const { lang, l } = useApp();
  const s = useStrings(SCHEDULING_STRINGS);
  const { setNodeRef, isOver } = useDroppable({ id: `drv:${load.driver.id}` });
  const total = load.oldVisits + load.newVisits;
  const over = total > MAX_VISITS_PER_DAY;
  const pct = (n: number) => `${Math.min(100, Math.round((n / MAX_VISITS_PER_DAY) * 100))}%`;
  return (
    <div
      ref={setNodeRef}
      className="flex flex-col gap-2 rounded-2xl p-3 transition-colors"
      style={
        highlight
          ? { border: `2px dashed ${color}`, background: isOver ? `${color}2E` : `${color}12` }
          : { border: '1px solid var(--line)', background: 'var(--surface)' }
      }
    >
      <div className="flex items-center gap-2.5">
        <DriverChip name={l(load.driver.name)} color={color} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-extrabold">{l(load.driver.name)}</span>
          <span className="text-xs text-muted">{s.driverLoad(load.oldVisits, load.newVisits)}</span>
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded bg-surface-2" role="img" aria-label={`${total} / ${MAX_VISITS_PER_DAY}`}>
        <div className="h-full bg-muted" style={{ width: pct(load.oldVisits) }} />
        <div className="h-full" style={{ width: pct(load.newVisits), background: over ? 'var(--danger)' : color }} />
      </div>
      <div className="text-xs text-muted">{load.districts.length ? s.driverDists(load.districts.map((d) => districtName(d, lang)).join(lang === 'ar' ? '، ' : ', ')) : s.dropHere}</div>
    </div>
  );
}

function RemovedList({ model: m, dayName, onRestore }: { model: PlanModel; dayName: string; onRestore: (id: string) => void }) {
  const { lang } = useApp();
  const s = useStrings(SCHEDULING_STRINGS);
  return (
    <div className={clsx(cardClass, 'flex flex-col gap-2.5 p-4 shadow-none')}>
      <div className="text-[15px] font-extrabold">{s.excludedTitle(dayName, m.removed.length)}</div>
      {m.removed.map((r) => (
        <div key={r.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-2.5 py-2 text-[13px]">
          <span className="min-w-0 flex-1">
            <strong>{branchLabel(r.branch, lang)}</strong> · {typeLabel(r.material, r.subtype, lang)}
          </span>
          <Button variant="ghost" size="sm" className="!h-8 rounded-[10px] !bg-surface !px-2.5" onClick={() => onRestore(r.id)}>
            {s.restore}
          </Button>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  model: m,
  planDay,
  matName,
  cityLabel,
  colorOf,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  model: PlanModel;
  planDay: DayKey;
  matName: string;
  cityLabel: string;
  colorOf: (driverId: string) => string;
  onDone: (count: number) => void;
}) {
  const { t, l, lang } = useApp();
  const s = useStrings(SCHEDULING_STRINGS);
  const approve = useApprovePlan();

  const submit = async () => {
    try {
      const res = await approve.mutateAsync({ day: planDay, assignments: m.assign, clearDraftCancelled: m.cancelled.map((r) => r.id) });
      onDone(res.scheduled);
      if (res.skipped.length > 0) toast.warning(s.toastSkipped(res.skipped.length), { duration: 8000 });
    } catch (e) {
      toast.error(errorText(e, t));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      kicker={m.hasApprovedAlready ? s.confirmKickerAdd : s.confirmKicker}
      title={
        <>
          {s.confirmTitle(formatDay(planDay, lang, 'long'))}
          <br />
          <span className="text-gold">
            {matName} · {cityLabel}
          </span>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {[
          [m.assigned.length, s.statNew],
          [m.used.length, s.statDrivers],
          [m.visitsTotal, s.statVisits],
        ].map(([n, label]) => (
          <div key={String(label)} className="rounded-[14px] bg-surface-2 p-3 text-center">
            <div className="text-[26px] font-extrabold">{n}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        ))}
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {m.used.map((ld) => (
          <li key={ld.driver.id} className="flex items-center gap-2.5 text-sm">
            <DriverChip name={l(ld.driver.name)} color={colorOf(ld.driver.id)} size={28} />
            <strong>{l(ld.driver.name)}</strong>
            <span className="text-muted">{s.confirmDriverLoad(ld.oldVisits, ld.newVisits, ld.districts.map((d) => districtName(d, lang)).join(lang === 'ar' ? '، ' : ', '))}</span>
          </li>
        ))}
      </ul>
      {m.unassigned.length > 0 && <div className="rounded-[14px] bg-accent-soft px-3.5 py-3 text-sm font-bold text-accent-ink">{s.unassignedWarn(m.unassigned.length)}</div>}
      {m.cancelled.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-[14px] bg-danger-soft px-3.5 py-3">
          <div className="text-sm font-extrabold text-danger-ink">{s.autoRemoved}</div>
          {m.cancelled.map((r) => (
            <div key={r.id} className="text-sm">
              {r.id} · {branchLabel(r.branch, lang)} · {typeLabel(r.material, r.subtype, lang)}
            </div>
          ))}
        </div>
      )}
      <p className="m-0 text-sm leading-relaxed text-muted">{s.confirmBody}</p>
      <div className="flex flex-wrap gap-2.5">
        <Button variant="gold" size="lg" className="h-[50px] min-w-[200px] flex-1 text-base" onClick={submit} disabled={approve.isPending}>
          {s.confirmApprove}
        </Button>
        <Button size="lg" className="h-[50px]" onClick={() => onOpenChange(false)}>
          {t.back}
        </Button>
      </div>
    </Dialog>
  );
}
