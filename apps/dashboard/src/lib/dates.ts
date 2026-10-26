import type { DayKey, Lang } from '../data/types';

/**
 * All operational dates use the Riyadh timezone, whatever timezone the browser is in.
 * Friday and Saturday are non-working days: planning always targets the next working day.
 */
export const OPS_TIMEZONE = 'Asia/Riyadh';
const RIYADH_OFFSET_HOURS = 3; // Saudi Arabia has no DST

export const LOCALE: Record<Lang, string> = {
  ar: 'ar-u-nu-latn-ca-gregory', // Arabic text, Latin digits, Gregorian calendar
  en: 'en-GB',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's calendar day in Riyadh. */
export function opsToday(now = new Date()): DayKey {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: OPS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts; // en-CA formats as YYYY-MM-DD
}

export function dayOf(iso: string): DayKey {
  return opsToday(new Date(iso));
}

function toUtcNoon(day: DayKey) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function addDays(day: DayKey, n: number): DayKey {
  const dt = toUtcNoon(day);
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** 0 = Sunday … 5 = Friday, 6 = Saturday */
export function weekday(day: DayKey): number {
  return toUtcNoon(day).getUTCDay();
}

export const isWorkingDay = (day: DayKey) => weekday(day) !== 5 && weekday(day) !== 6;

/** The first working day strictly after `day`. Thursday → Sunday. */
export function nextWorkingDay(day: DayKey): DayKey {
  let d = addDays(day, 1);
  while (!isWorkingDay(d)) d = addDays(d, 1);
  return d;
}

/** The last working day strictly before `day`. */
export function previousWorkingDay(day: DayKey): DayKey {
  let d = addDays(day, -1);
  while (!isWorkingDay(d)) d = addDays(d, -1);
  return d;
}

export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((toUtcNoon(to).getTime() - toUtcNoon(from).getTime()) / 86400000);
}

/** ISO timestamp for a Riyadh wall-clock time on `day`. */
export function riyadhTime(day: DayKey, hour: number, minute = 0): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - RIYADH_OFFSET_HOURS, minute)).toISOString();
}

/** Opsdate of `iso` → whole calendar days until today. */
export const ageInDays = (iso: string, today = opsToday()) => daysBetween(dayOf(iso), today);

export const hoursSince = (iso: string, now = new Date()) => (now.getTime() - new Date(iso).getTime()) / 3600000;

/** Hour of day (0–23) in Riyadh. */
export function opsHour(now = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: OPS_TIMEZONE, hour: '2-digit', hourCycle: 'h23' }).format(now));
}

type DayStyle = 'full' | 'long' | 'short' | 'weekday' | 'numeric';

const DAY_FORMATS: Record<DayStyle, Intl.DateTimeFormatOptions> = {
  full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  long: { weekday: 'long', day: 'numeric', month: 'long' },
  short: { weekday: 'short', day: 'numeric', month: 'short' },
  weekday: { weekday: 'long' },
  numeric: { day: '2-digit', month: '2-digit' },
};

/** e.g. "الأحد 25 أكتوبر" / "Sunday 25 October" */
export function formatDay(day: DayKey, lang: Lang, style: DayStyle = 'full'): string {
  const text = new Intl.DateTimeFormat(LOCALE[lang], { ...DAY_FORMATS[style], timeZone: 'UTC' }).format(toUtcNoon(day));
  return text.replace('،', '').replace(/,/g, '');
}

export function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: OPS_TIMEZONE,
  }).format(new Date(iso));
}

export function formatTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: OPS_TIMEZONE,
  }).format(new Date(iso));
}

/** "قبل 12 دقيقة" · "اليوم 9:05 ص" · "أمس 6:40 م" · "12/10/2026 9:00 ص" */
export function formatRelative(iso: string, lang: Lang, now = new Date()): string {
  const diffMin = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(LOCALE[lang], { numeric: 'auto' });
  if (diffMin >= 0 && diffMin < 60) return rtf.format(-Math.max(diffMin, 1), 'minute');
  const dayDiff = daysBetween(dayOf(iso), opsToday(now));
  const time = formatTime(iso, lang);
  if (dayDiff === 0) return `${lang === 'ar' ? 'اليوم' : 'Today'} ${time}`;
  if (dayDiff === 1) return `${lang === 'ar' ? 'أمس' : 'Yesterday'} ${time}`;
  return `${formatDate(iso, lang)} ${time}`;
}

export function formatNumber(n: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALE[lang]).format(n);
}
