import { ar as arN, en as enN } from './plural';
import type { RequestStatus, VisitOutcome } from '../data/types';

/**
 * Copy shared by every screen (shell, statuses, states). Page-specific copy lives next to each
 * feature in `features/<page>/strings.ts`. Arabic is the source; TypeScript forces the English
 * mirror to have every key.
 */

const ar = {
  n: arN,
  dashboard: 'لوحة التشغيل',
  logoAlt: 'ماء الغيوم — Clouds Water',
  mainMenu: 'القائمة الرئيسية',
  openMenu: 'فتح القائمة',
  closeMenu: 'إغلاق القائمة',
  switchLang: 'Switch to English',
  langButton: 'EN',
  toLight: 'التبديل إلى الوضع الفاتح',
  toDark: 'التبديل إلى الوضع الداكن',
  close: 'إغلاق',
  back: 'رجوع',
  cancel: 'إلغاء',
  kg: 'كجم',
  allMaterials: 'كل المواد',
  allCities: 'كل المدن',
  material: 'المادة',
  city: 'المدينة',
  chooseReason: 'اختر سببًا…',
  otherReason: 'أخرى — اكتب السبب',

  notifications: 'الإشعارات',
  markAllRead: 'تحديد الكل كمقروء',
  unread: 'غير مقروء',
  noNotifications: 'لا توجد إشعارات',
  unreadCount: (n: number) => `${n} غير مقروءة`,
  notifScopeAll: 'تصلك إشعارات كل المواد',
  notifScopeOne: (m: string) => `تصلك إشعارات مادة ${m} فقط`,

  nav: {
    overview: 'نظرة عامة',
    requests: 'الطلبات',
    scheduling: 'الجدولة',
    decisions: 'يحتاج قرار',
    adminSection: 'الإدارة',
    branches: 'السلاسل والفروع',
    districts: 'المدن والأحياء',
    drivers: 'السائقون',
    materials: 'المواد والمسؤولون',
    lists: 'القوائم القابلة للتعديل',
    reports: 'التقارير',
  },

  roles: {
    gm: 'مدير عام',
    supervisor: (m: string) => `مسؤول مادة ${m}`,
  },

  status: {
    waiting: 'بانتظار الجدولة',
    scheduled: 'مجدول',
    needs_decision: 'يحتاج قرار',
    completed: 'مكتمل',
    closed: 'مغلق',
    cancelled: 'ملغي',
  } satisfies Record<RequestStatus, string>,
  statusNew: 'جديد',

  outcome: {
    full: 'مكتمل',
    partial: 'استلام جزئي',
    failed: 'زيارة فاشلة',
    no_result: 'بدون نتيجة',
  } satisfies Record<VisitOutcome, string>,
  outcomePending: 'لم تُسجّل بعد',

  actor: {
    branch: (name: string) => `الفرع · ${name}`,
    system: 'النظام — نهاية يوم الزيارة',
    fromDashboard: '(من اللوحة)',
  },

  loading: 'جارٍ التحميل',
  updating: 'جارٍ التحديث',
  retry: 'إعادة المحاولة',
  loadError: 'تعذّر تحميل البيانات',
  saveError: 'تعذّر الحفظ. تحقق من الاتصال وأعد المحاولة.',
  signOut: 'تسجيل الخروج',
  errors: {
    NETWORK: 'تعذّر الاتصال بالخادم. تحقق من الإنترنت وأعد المحاولة.',
    SESSION_EXPIRED: 'انتهت الجلسة. سجّل الدخول من جديد.',
    NOT_ALLOWED: 'ليست لديك صلاحية لهذا الإجراء.',
    NOT_FOUND: 'لم يعد هذا الطلب موجودًا. حدّث الصفحة.',
    INVALID_STATUS: 'تغيّرت حالة الطلب للتو. تم تحديث البيانات — راجعها وأعد المحاولة.',
    DUPLICATE_OPEN_REQUEST: 'يوجد طلب مفتوح لنفس الفرع ونفس النوع.',
    SUBTYPE_REQUIRED: 'اختر النوع.',
    BRANCH_INACTIVE: 'هذا الفرع غير مفعّل.',
    REASON_REQUIRED: 'السبب مطلوب.',
    INVALID_REASON: 'السبب المختار لم يعد متاحًا. حدّث الصفحة.',
    INVALID_VISIT_DAY: 'لا يمكن الاعتماد إلا لأول يوم عمل قادم. حدّث الصفحة.',
    NOTHING_TO_APPROVE: 'لا توجد طلبات موزّعة للاعتماد.',
    NOTHING_TO_MOVE: 'لا توجد زيارات متبقية لنقلها — ربما سُجّلت نتائجها.',
    DRIVER_UNAVAILABLE: 'السائق غير متاح في هذا اليوم.',
    DRIVER_WRONG_MATERIAL: 'السائق لا يعمل على هذه المادة.',
    DRIVER_WRONG_CITY: 'السائق من مدينة أخرى.',
    UNDO_NOT_POSSIBLE: 'لم يعد التراجع ممكنًا — تغيّر الطلب أو مرّت 15 دقيقة.',
  } as Record<string, string>,
};

export type CommonDict = typeof ar;

const en: CommonDict = {
  n: enN,
  dashboard: 'Operations',
  logoAlt: 'Clouds Water — ماء الغيوم',
  mainMenu: 'Main menu',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  switchLang: 'التبديل إلى العربية',
  langButton: 'عربي',
  toLight: 'Switch to light mode',
  toDark: 'Switch to dark mode',
  close: 'Close',
  back: 'Back',
  cancel: 'Cancel',
  kg: 'kg',
  allMaterials: 'All materials',
  allCities: 'All cities',
  material: 'Material',
  city: 'City',
  chooseReason: 'Choose a reason…',
  otherReason: 'Other — type the reason',

  notifications: 'Notifications',
  markAllRead: 'Mark all as read',
  unread: 'Unread',
  noNotifications: 'No notifications',
  unreadCount: (n: number) => `${n} unread`,
  notifScopeAll: 'You get notifications for every material',
  notifScopeOne: (m: string) => `You get ${m} notifications only`,

  nav: {
    overview: 'Overview',
    requests: 'Requests',
    scheduling: 'Scheduling',
    decisions: 'Needs decision',
    adminSection: 'Admin',
    branches: 'Chains & branches',
    districts: 'Cities & districts',
    drivers: 'Drivers',
    materials: 'Materials & managers',
    lists: 'Editable lists',
    reports: 'Reports',
  },

  roles: {
    gm: 'General manager',
    supervisor: (m: string) => `${m} supervisor`,
  },

  status: {
    waiting: 'Awaiting scheduling',
    scheduled: 'Scheduled',
    needs_decision: 'Needs decision',
    completed: 'Completed',
    closed: 'Closed',
    cancelled: 'Cancelled',
  },
  statusNew: 'New',

  outcome: {
    full: 'Completed',
    partial: 'Partial pickup',
    failed: 'Failed visit',
    no_result: 'No outcome',
  },
  outcomePending: 'Not recorded yet',

  actor: {
    branch: (name: string) => `Branch · ${name}`,
    system: 'System — end of visit day',
    fromDashboard: '(from dashboard)',
  },

  loading: 'Loading',
  updating: 'Updating',
  retry: 'Try again',
  loadError: "Couldn't load the data",
  saveError: "Couldn't save. Check your connection and try again.",
  signOut: 'Sign out',
  errors: {
    NETWORK: "Couldn't reach the server. Check your internet connection and try again.",
    SESSION_EXPIRED: 'Your session ended. Please sign in again.',
    NOT_ALLOWED: "You don't have permission to do this.",
    NOT_FOUND: 'This request no longer exists. Refresh the page.',
    INVALID_STATUS: 'The request just changed. The data was refreshed — check it and try again.',
    DUPLICATE_OPEN_REQUEST: 'There is already an open request for this branch and type.',
    SUBTYPE_REQUIRED: 'Choose the type.',
    BRANCH_INACTIVE: 'This branch is inactive.',
    REASON_REQUIRED: 'A reason is required.',
    INVALID_REASON: 'That reason is no longer available. Refresh the page.',
    INVALID_VISIT_DAY: 'Plans can only be approved for the next working day. Refresh the page.',
    NOTHING_TO_APPROVE: 'No assigned requests to approve.',
    NOTHING_TO_MOVE: 'No visits left to move — their outcomes may already be recorded.',
    DRIVER_UNAVAILABLE: "The driver isn't available that day.",
    DRIVER_WRONG_MATERIAL: "The driver doesn't work on this material.",
    DRIVER_WRONG_CITY: 'The driver is in another city.',
    UNDO_NOT_POSSIBLE: "Undo is no longer possible — the request changed or 15 minutes passed.",
  },
};

export const COMMON = { ar, en };
