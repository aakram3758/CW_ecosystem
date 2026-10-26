import type { RequestRow } from './api';
import type { LateBranchRef } from './api';
import type { Branch, CityCode, DayKey, Filter, MaterialCode, PickupRequest, RequestStatus, VisitOutcome } from './types';
import { addDays, ageInDays, hoursSince, opsToday } from '../lib/dates';

/** Pure functions that derive what each screen shows from the rows loaded by `data/api.ts`. */

export const OPEN_STATUSES: RequestStatus[] = ['waiting', 'scheduled', 'needs_decision'];

export const matches = (r: { material: MaterialCode; branch: Branch }, city: Filter<CityCode>, material: Filter<MaterialCode>) =>
  (city === 'all' || r.branch.city === city) && (material === 'all' || r.material === material);

export const lastAttempt = (r: PickupRequest) => r.attempts[r.attempts.length - 1];

/** Outcome that put the request in "needs decision". */
export const decisionType = (r: PickupRequest): Exclude<VisitOutcome, 'full'> => {
  const a = lastAttempt(r);
  return a && a.outcome !== 'full' ? a.outcome : 'no_result';
};

export const isStaleDecision = (r: PickupRequest) => r.status === 'needs_decision' && !!r.decisionSince && hoursSince(r.decisionSince) >= 24;

// ---------------------------------------------------------------- overview

export interface OverviewSummary {
  waiting: number;
  scheduledToday: number;
  driversToday: number;
  needsDecision: number;
  partial: number;
  failed: number;
  noResult: number;
  staleDecisions: number;
  completedWeek: number;
  kgWeek: number;
}

export function overviewSummary(rows: RequestRow[], city: Filter<CityCode>, material: Filter<MaterialCode>, today = opsToday()): OverviewSummary {
  const scoped = rows.filter((r) => matches(r, city, material));
  const decisions = scoped.filter((r) => r.status === 'needs_decision');
  const todays = scoped.filter((r) => r.visitDay === today && r.status !== 'cancelled');
  const weekStart = addDays(today, -6);
  const completed = scoped.filter((r) => r.status === 'completed' && lastAttempt(r) && lastAttempt(r).day >= weekStart);

  return {
    waiting: scoped.filter((r) => r.status === 'waiting').length,
    scheduledToday: todays.length,
    driversToday: new Set(todays.map((r) => r.driverId)).size,
    needsDecision: decisions.length,
    partial: decisions.filter((r) => decisionType(r) === 'partial').length,
    failed: decisions.filter((r) => decisionType(r) === 'failed').length,
    noResult: decisions.filter((r) => decisionType(r) === 'no_result').length,
    staleDecisions: decisions.filter(isStaleDecision).length,
    completedWeek: completed.length,
    kgWeek: completed.reduce((sum, r) => sum + (r.kg ?? 0), 0),
  };
}

/** Waiting for more than a day (2+ calendar days), oldest first. */
export const staleWaiting = (rows: RequestRow[], city: Filter<CityCode>, material: Filter<MaterialCode>) =>
  rows
    .filter((r) => r.status === 'waiting' && matches(r, city, material) && ageInDays(r.createdAt) >= 2)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export interface LateBranch {
  branch: Branch;
  /** Days since the last request; null = never sent one. */
  lastDays: number | null;
}

/** Active branches with no request (any material) for more than a week, oldest first. The material filter never applies. */
export function lateBranches(branches: Branch[], late: LateBranchRef[], city: Filter<CityCode>): LateBranch[] {
  const byId = new Map(branches.map((b) => [b.id, b]));
  return late
    .map((l) => ({ branch: byId.get(l.branchId), lastDays: l.lastDays }))
    .filter((x): x is LateBranch => !!x.branch && x.branch.active && (city === 'all' || x.branch.city === city))
    .sort((a, b) => (b.lastDays ?? 999) - (a.lastDays ?? 999));
}

// ---------------------------------------------------------------- scheduling

/** Requests waiting for the plan of (city, material), plus branch-cancelled ones still shown struck-through. */
export const schedulingQueue = (rows: RequestRow[], city: CityCode, material: MaterialCode) =>
  rows
    .filter((r) => r.branch.city === city && r.material === material && (r.status === 'waiting' || (r.status === 'cancelled' && r.draftCancelled)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export interface DriverPlan {
  driverId: string;
  items: RequestRow[];
}

/** Approved plan for a day, grouped by driver. */
export function plansFor(rows: RequestRow[], day: DayKey, city: CityCode, material: MaterialCode): DriverPlan[] {
  const map = new Map<string, RequestRow[]>();
  rows
    .filter((r) => r.visitDay === day && r.driverId && r.branch.city === city && r.material === material && r.status !== 'cancelled')
    .forEach((r) => map.set(r.driverId!, [...(map.get(r.driverId!) ?? []), r]));
  return [...map.entries()].map(([driverId, items]) => ({ driverId, items }));
}

/** Outcome of the visit on `day` (pending if the driver hasn't recorded it yet). */
export const outcomeOn = (r: PickupRequest, day: DayKey): VisitOutcome | 'pending' =>
  r.attempts.find((a) => a.day === day)?.outcome ?? 'pending';

/** Distinct stops (a branch with several material types is one visit). */
export const visitCount = (items: { branchId: string }[]) => new Set(items.map((i) => i.branchId)).size;
