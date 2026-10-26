import type { RequestRow } from '../../data/api';
import type { CityCode, DayKey, Driver, MaterialCode } from '../../data/types';
import { schedulingQueue } from '../../data/selectors';
import type { Draft } from './draftStore';

/** Driver colours for chips and drop targets (distinct from the material colours). */
const DRIVER_COLORS = [
  { light: '#4B3FA8', dark: '#A79FF5' },
  { light: '#A0306E', dark: '#EC8AC0' },
  { light: '#B4441F', dark: '#F2956F' },
];
export const driverColor = (index: number, dark: boolean) => {
  const c = DRIVER_COLORS[Math.max(index, 0) % DRIVER_COLORS.length];
  return dark ? c.dark : c.light;
};

export interface DriverLoad {
  driver: Driver;
  oldVisits: number; // distinct branches already approved for the plan day
  newVisits: number; // distinct new branches in this draft
  newRequests: number;
  districts: string[];
}

/**
 * Everything the "Build plan" tab shows for one city · material, derived from the rows and the draft.
 * Pure, so the step indicator and the build area always agree.
 */
export function buildModel(rows: RequestRow[], drivers: Driver[], city: CityCode, material: MaterialCode, planDay: DayKey, draft: Draft) {
  const fullQueue = schedulingQueue(rows, city, material);
  const removed = fullQueue.filter((r) => r.status === 'waiting' && draft.removed.includes(r.id));
  const queue = fullQueue.filter((r) => !draft.removed.includes(r.id));
  const live = queue.filter((r) => r.status === 'waiting');
  const cancelled = queue.filter((r) => r.status === 'cancelled');

  const keyDrivers = drivers.filter((d) => d.city === city && d.material === material);
  const available = keyDrivers.filter((d) => d.availableNextDay);
  const unavailable = keyDrivers.filter((d) => !d.availableNextDay);

  // Draft assignments only count for live requests and available drivers.
  const assign: Record<string, string> = {};
  live.forEach((r) => {
    const d = draft.assign[r.id];
    if (d && available.some((x) => x.id === d)) assign[r.id] = d;
  });
  const assigned = live.filter((r) => assign[r.id]);
  const unassigned = live.filter((r) => !assign[r.id]);

  const approved = rows.filter((r) => r.visitDay === planDay && r.status !== 'cancelled' && r.material === material && r.branch.city === city);

  const loads: DriverLoad[] = available.map((driver) => {
    const old = new Set(approved.filter((r) => r.driverId === driver.id).map((r) => r.branchId));
    const mine = assigned.filter((r) => assign[r.id] === driver.id);
    const neu = new Set(mine.map((r) => r.branchId).filter((b) => !old.has(b)));
    const districts = [...new Set([...approved.filter((r) => r.driverId === driver.id), ...mine].map((r) => r.branch.district))];
    return { driver, oldVisits: old.size, newVisits: neu.size, newRequests: mine.length, districts };
  });
  const used = loads.filter((l) => l.newRequests > 0 || l.oldVisits > 0);

  // Several material types from one branch on one driver = one stop.
  const perBranch: Record<string, number> = {};
  live.forEach((r) => (perBranch[r.branchId] = (perBranch[r.branchId] ?? 0) + 1));

  return {
    queue,
    live,
    cancelled,
    removed,
    available,
    unavailable,
    keyDrivers,
    assign,
    assigned,
    unassigned,
    loads,
    used,
    visitsTotal: used.reduce((sum, l) => sum + l.oldVisits + l.newVisits, 0),
    hasApprovedAlready: approved.length > 0,
    sameStop: (r: RequestRow) => (perBranch[r.branchId] ?? 0) > 1,
  };
}

export type PlanModel = ReturnType<typeof buildModel>;
