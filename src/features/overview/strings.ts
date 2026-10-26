import { ar as arN, en as enN, ageAgo } from '../../i18n/plural';

const ar = {
  greeting: (hour: number, name: string) => `${hour < 12 ? 'صباح الخير' : 'مساء الخير'}، ${name}`,
  heroLine: (n: number) => `${arN.requests(n)} بانتظار الجدولة`,
  kpi: {
    waiting: 'بانتظار الجدولة',
    waitingSub: 'لم تدخل خطة معتمدة بعد',
    today: 'مجدول اليوم',
    todaySub: (d: number) => (d ? `على ${arN.drivers(d)}` : 'لا زيارات اليوم'),
    decision: 'يحتاج قرار',
    decisionSub: (p: number, f: number, nr: number) => `${p} استلام جزئي · ${f} زيارة فاشلة${nr ? ` · ${nr} بدون نتيجة` : ''}`,
    stale: (n: number) => `${n} بدون إجراء منذ أكثر من يوم`,
    done: 'مكتمل هذا الأسبوع',
    doneSub: (kg: string) => `${kg} كجم تم جمعها`,
  },
  stale: {
    title: (n: number) => `${arN.requests(n)} تنتظر الجدولة منذ أكثر من يوم`,
    sub: (day: string) => `الأقدم أولًا. أدرجها في خطة ${day}.`,
    viewAll: 'عرض الكل',
    age: ageAgo.ar,
  },
  late: {
    title: 'الفروع المتأخرة',
    sub: 'لم ترسل أي طلب منذ أكثر من أسبوع · من كل المواد',
    none: 'كل الفروع في هذه المدينة أرسلت طلبًا خلال الأسبوع.',
    button: (n: number) => `عرض الفروع (${n})`,
    sheetKicker: (city: string) => `من كل المواد · ${city}`,
    sheetTitle: (n: number) => `الفروع المتأخرة (${n})`,
    sheetBody: 'لم ترسل أي طلب منذ أكثر من أسبوع. أضف لها طلبًا بعد التواصل معها.',
    login: (name: string) => `اسم الدخول: ${name}`,
    last: (d: number | null) => (d === null ? 'لم يرسل أي طلب' : ageAgo.ar(d)),
    lastLabel: 'آخر طلب: ',
    add: '+ إضافة طلب',
  },
  plan: {
    title: (weekday: string) => `خطّط ${weekday.startsWith('ال') ? `لل${weekday.slice(2)}` : `لـ${weekday}`}`,
    sub: (day: string, skipsWeekend: boolean, n: number) =>
      `${day} · ${skipsWeekend ? 'أول يوم عمل (الجمعة والسبت إجازة)' : 'يوم العمل القادم'} · ${arN.requests(n)} جاهزة`,
    cta: (day: string) => `ابدأ خطة ${day}`,
  },
  queue: {
    title: 'طابور يحتاج قرار',
    sub: (n: number, p: number, f: number, nr: number) => `${arN.requests(n)}: ${p} استلام جزئي · ${f} زيارة فاشلة${nr ? ` · ${nr} بدون نتيجة` : ''}`,
    stale: (n: number) => `${arN.requests(n)} بدون إجراء منذ أكثر من يوم`,
    cta: 'افتح الطابور',
  },
  empty: {
    title: 'لا توجد طلبات بعد',
    body: 'ستظهر الأرقام هنا بمجرد أن ترسل الفروع أول طلب استلام. تأكد أن الفروع لديها حسابات ومواقع محددة.',
    cta: 'إدارة الفروع',
  },
  errorBody: 'تحقق من الاتصال بالإنترنت ثم أعد المحاولة. لم يتغير أي شيء في بياناتك.',
};

export type OverviewStrings = typeof ar;

const en: OverviewStrings = {
  greeting: (hour, name) => `${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, ${name}`,
  heroLine: (n) => `${enN.requests(n)} awaiting scheduling`,
  kpi: {
    waiting: 'Awaiting scheduling',
    waitingSub: 'Not in an approved plan yet',
    today: 'Scheduled today',
    todaySub: (d) => (d ? `Across ${enN.drivers(d)}` : 'No visits today'),
    decision: 'Needs decision',
    decisionSub: (p, f, nr) => `${p} partial · ${f} failed${nr ? ` · ${nr} no outcome` : ''}`,
    stale: (n) => `${n} with no action for over a day`,
    done: 'Completed this week',
    doneSub: (kg) => `${kg} kg collected`,
  },
  stale: {
    title: (n) => `${enN.requests(n)} waiting more than a day to be scheduled`,
    sub: (day) => `Oldest first. Add them to ${day}'s plan.`,
    viewAll: 'View all',
    age: ageAgo.en,
  },
  late: {
    title: 'Late branches',
    sub: 'No request for more than a week · all materials',
    none: 'Every branch in this city sent a request this week.',
    button: (n) => `View branches (${n})`,
    sheetKicker: (city) => `All materials · ${city}`,
    sheetTitle: (n) => `Late branches (${n})`,
    sheetBody: 'No request for more than a week. Add one for them after contacting the branch.',
    login: (name) => `Login: ${name}`,
    last: (d) => (d === null ? 'Never sent a request' : ageAgo.en(d)),
    lastLabel: 'Last request: ',
    add: '+ Add request',
  },
  plan: {
    title: (weekday) => `Plan ${weekday}`,
    sub: (day, skipsWeekend, n) => `${day} · ${skipsWeekend ? 'next working day (Fri & Sat off)' : 'next working day'} · ${enN.requests(n)} ready`,
    cta: (day) => `Start the plan for ${day}`,
  },
  queue: {
    title: 'Needs decision queue',
    sub: (n, p, f, nr) => `${enN.requests(n)}: ${p} partial · ${f} failed${nr ? ` · ${nr} no outcome` : ''}`,
    stale: (n) => `${enN.requests(n)} with no action for over a day`,
    cta: 'Open queue',
  },
  empty: {
    title: 'No requests yet',
    body: 'Numbers appear here as soon as a branch sends its first pickup request. Make sure branches have accounts and a location set.',
    cta: 'Manage branches',
  },
  errorBody: 'Check your connection and try again. Nothing in your data has changed.',
};

export const OVERVIEW_STRINGS = { ar, en };
