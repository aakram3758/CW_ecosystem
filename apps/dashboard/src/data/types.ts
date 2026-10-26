/**
 * Domain types the screens work with. `data/api.ts` maps Supabase rows (see /supabase/migrations)
 * into these shapes, so the UI never deals with raw table columns.
 */

export type Lang = 'ar' | 'en';

export interface LocalizedText {
  ar: string;
  en: string;
}

/** A calendar day in the operations timezone (Asia/Riyadh), formatted YYYY-MM-DD. */
export type DayKey = string;

/** Stable latin codes from the reference tables (cities.code, chains.code, materials.code, material_subtypes.code). */
export type CityCode = string;
export type ChainCode = string;
export type MaterialCode = string;
export type SubtypeCode = string;

/** "all" means no filter. */
export type Filter<T extends string> = T | 'all';

export interface Branch {
  id: string; // branches.id (uuid)
  chain: ChainCode;
  number: string; // unique within its chain
  city: CityCode;
  district: string; // districts.id, see catalog
  active: boolean;
  phone: string | null;
  hasLogin: boolean;
  /** Display name, e.g. "الصفا" (falls back to the district). */
  name?: string | null;
  address?: string | null;
  accessNotes?: string | null;
  lat?: number | null;
  lng?: number | null;
  userId?: string | null;
}

export interface Driver {
  id: string;
  userId?: string | null;
  name: LocalizedText;
  phone: string;
  city: CityCode;
  material: MaterialCode; // each driver belongs to exactly one material
  active: boolean;
  /** Available on the next working day (the day being planned). */
  availableNextDay: boolean;
  unavailableNote?: LocalizedText;
}

export type RequestStatus = 'waiting' | 'scheduled' | 'needs_decision' | 'completed' | 'closed' | 'cancelled';

/** Outcome of one visit. `no_result` = the driver never recorded an outcome by the end of the visit day. */
export type VisitOutcome = 'full' | 'partial' | 'failed' | 'no_result';

export interface Attempt {
  day: DayKey;
  at: string; // ISO timestamp the outcome was recorded (or the end-of-day sweep)
  driverId: string;
  outcome: VisitOutcome;
  reason?: LocalizedText;
  note?: string; // free text typed by the driver
  hasPhoto: boolean;
}

export type Actor =
  | { kind: 'branch'; name: string }
  | { kind: 'user'; userId: string }
  | { kind: 'driver'; driverId: string }
  | { kind: 'system' };

export interface StatusChange {
  at: string;
  from: RequestStatus | 'new';
  to: RequestStatus;
  actor: Actor;
  note?: LocalizedText | string;
}

export interface CancelInfo {
  by: Actor;
  reason: LocalizedText;
  note?: string;
  fromStatus: RequestStatus;
}

export interface PickupRequest {
  /** Display reference "REQ-10023" — also used in links (`?open=REQ-10023`). */
  id: string;
  /** requests.id (uuid) — what the RPCs take. */
  uuid: string;
  number: number;
  branchId: string;
  material: MaterialCode;
  subtype: SubtypeCode | null;
  /** Approximate weight entered by the branch (the recorded figure). Null when unknown. */
  kg: number | null;
  createdAt: string;
  status: RequestStatus;
  /** Contact person typed by the branch for this request. Absent for dashboard-created requests. */
  contact?: { name: string; phone: string };
  createdBy: Actor;
  note?: string;
  hasBranchPhoto: boolean;
  visitDay?: DayKey;
  driverId?: string;
  attempts: Attempt[];
  log: StatusChange[];
  cancel?: CancelInfo;
  close?: { by: string; reason: LocalizedText | string; at: string };
  /** When the request entered "needs decision" (drives the 1-day no-action alert). */
  decisionSince?: string;
  /** Branch cancelled it while ops was preparing the plan; still shown struck-through in Scheduling until the next approval. */
  draftCancelled?: boolean;
}

export interface PlanApproval {
  day: DayKey;
  driverId: string;
  userId: string;
  at: string;
}

export type DashboardRole = 'gm' | 'supervisor';

export interface DashboardUser {
  id: string;
  name: LocalizedText;
  firstName: LocalizedText;
  initials: LocalizedText;
  role: DashboardRole;
  /** First material this user manages: default filter + notification scope. Everyone has full permissions. */
  material?: MaterialCode;
  /** Every material this user manages. */
  materials?: MaterialCode[];
  phone?: string | null;
  email?: string;
  active?: boolean;
}

export type NotificationKind = 'stale_decisions' | 'branch_cancelled' | 'visit_failed' | 'partial_pickup' | 'visit_no_result' | 'plan_completed' | 'other';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: LocalizedText;
  detail: LocalizedText;
  createdAt: string;
  read: boolean;
  material: MaterialCode | null;
  href: string;
}

/** A reason from the editable lists (reasons table). */
export interface Reason extends LocalizedText {
  id: string;
}
