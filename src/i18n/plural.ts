/** Arabic counted nouns: 1 / 2 / 3–10 / 11+ forms. English: simple singular/plural. */

export function arCount(n: number, one: string, two: string, few: string, many: string, zero = `0 ${many}`): string {
  if (n === 0) return zero;
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

export const enCount = (n: number, word: string, plural = `${word}s`) => `${n} ${n === 1 ? word : plural}`;

export const ar = {
  requests: (n: number) => arCount(n, 'طلب واحد', 'طلبان', 'طلبات', 'طلبًا', 'لا طلبات'),
  days: (n: number) => arCount(n, 'يوم واحد', 'يومين', 'أيام', 'يومًا'),
  drivers: (n: number) => arCount(n, 'سائق واحد', 'سائقَين', 'سائقين', 'سائقًا'),
  visits: (n: number) => arCount(n, 'زيارة واحدة', 'زيارتان', 'زيارات', 'زيارة', 'لا زيارات'),
  branches: (n: number) => arCount(n, 'فرع واحد', 'فرعان', 'فروع', 'فرعًا'),
  districts: (n: number) => arCount(n, 'حي واحد', 'حيّان', 'أحياء', 'حيًا', 'لا أحياء'),
  cities: (n: number) => arCount(n, 'مدينة واحدة', 'مدينتان', 'مدن', 'مدينة'),
  chains: (n: number) => arCount(n, 'سلسلة واحدة', 'سلسلتان', 'سلاسل', 'سلسلة'),
  materials: (n: number) => arCount(n, 'مادة واحدة', 'مادتان', 'مواد', 'مادة'),
  reasons: (n: number) => arCount(n, 'سبب واحد', 'سببان', 'أسباب', 'سببًا', 'لا أسباب'),
  trips: (n: number) => arCount(n, 'رحلة واحدة', 'رحلتان', 'رحلات', 'رحلة', 'لا رحلات'),
};

export const en = {
  requests: (n: number) => (n === 0 ? 'no requests' : enCount(n, 'request')),
  days: (n: number) => enCount(n, 'day'),
  drivers: (n: number) => enCount(n, 'driver'),
  visits: (n: number) => (n === 0 ? 'no visits' : enCount(n, 'visit')),
  branches: (n: number) => enCount(n, 'branch', 'branches'),
  districts: (n: number) => (n === 0 ? 'no districts' : enCount(n, 'district')),
  cities: (n: number) => enCount(n, 'city', 'cities'),
  chains: (n: number) => enCount(n, 'chain'),
  materials: (n: number) => enCount(n, 'material'),
  reasons: (n: number) => (n === 0 ? 'no reasons' : enCount(n, 'reason')),
  trips: (n: number) => (n === 0 ? 'no trips' : enCount(n, 'trip')),
};

/** "منذ يومين" / "2 days ago" — how long something has been waiting. */
export const ageAgo = {
  ar: (d: number) => (d === 0 ? 'اليوم' : d === 1 ? 'منذ يوم' : d === 2 ? 'منذ يومين' : `منذ ${d} ${d <= 10 ? 'أيام' : 'يومًا'}`),
  en: (d: number) => (d === 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`),
};

/** Short age for tables: "اليوم" · "يوم" · "يومان" · "3 أيام" */
export const ageShort = {
  ar: (d: number) => (d === 0 ? 'اليوم' : d === 1 ? 'يوم' : d === 2 ? 'يومان' : `${d} ${d <= 10 ? 'أيام' : 'يومًا'}`),
  en: (d: number) => (d === 0 ? 'today' : enCount(d, 'day')),
};
