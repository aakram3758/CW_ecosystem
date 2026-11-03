import { usePreferences } from '@/providers/preferences';

/** Today in Riyadh, as `YYYY-MM-DD`, which is what `visit_day` is compared against. */
export function opsToday() {
  // `en-CA` formats as YYYY-MM-DD, and the time zone is fixed because the business day is Riyadh's
  // wherever the phone happens to think it is.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());
}

export function useDateFormat(notSet = '') {
  const { language } = usePreferences();
  const locale = language === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB';
  const date = (value: string | null, long = false) => value ? new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Riyadh', day: 'numeric', month: 'short', ...(long ? { weekday: 'long' as const } : {}),
  }).format(new Date(value.length === 10 ? `${value}T12:00:00+03:00` : value)) : notSet;
  const stamp = (value: string | null) => value ? `${date(value)} · ${new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Riyadh', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(value))}` : '';
  return { date, stamp, locale };
}
