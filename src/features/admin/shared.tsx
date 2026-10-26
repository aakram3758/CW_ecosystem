import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useApp, useStrings } from '../../lib/app-context';
import { errorText } from '../../lib/supabase';
import { useAdminAction } from '../../data/queries';
import { whatsappLink } from '../../lib/format';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Icon, type IconName } from '../../components/ui/Icon';

/** Copy shared by the admin screens. */
const ar = {
  admin: 'الإدارة',
  active: 'نشط',
  inactive: 'معطّل',
  deactivate: 'تعطيل',
  reactivate: 'إعادة التفعيل',
  edit: 'تعديل',
  save: 'حفظ',
  saveChanges: 'حفظ التعديلات',
  add: '+ إضافة',
  required: 'مطلوب',
  search: 'بحث',
  nameAr: 'الاسم بالعربي *',
  nameEn: 'الاسم بالإنجليزي',
  nameEnHint: 'يظهر في الواجهة الإنجليزية. لو تركته فارغًا يظهر الاسم العربي.',
  phoneRule: 'رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05',
  done: 'تم',
  loadBody: 'تحقق من الاتصال ثم أعد المحاولة.',
  never: 'لم يسجّل دخول',
  noLogin: 'بدون حساب دخول',
  firstLogin: 'لم يغيّر الباسورد المؤقت',
  resetPw: 'تغيير الباسورد',
  createLogin: 'إنشاء حساب دخول',
  pw: {
    confirmTitle: (name: string) => `تغيير باسورد ${name}؟`,
    confirmBody: 'يتوقف الباسورد الحالي فورًا، ويُطلب منه تغيير المؤقت عند أول دخول.',
    createTitle: (name: string) => `إنشاء حساب دخول لـ ${name}؟`,
    createBody: 'يُنشأ حساب جديد بباسورد مؤقت (6 أرقام) يغيّره صاحبه عند أول دخول.',
    generate: 'إنشاء باسورد مؤقت',
    newTitle: 'باسورد مؤقت جديد',
    login: 'اسم الدخول',
    password: 'الباسورد المؤقت',
    once: 'يظهر مرة واحدة فقط. انسخه أو أرسله الآن.',
    copy: 'نسخ البيانات',
    copied: 'تم النسخ ✓',
    whatsapp: 'إرسال عبر واتساب',
    noPhone: 'لا يوجد جوال مسجّل، لذلك زر واتساب غير متاح. انسخ البيانات وأرسلها.',
    message: (name: string, app: string, login: string, pass: string) =>
      `مرحبًا ${name}، بيانات دخول ${app} — ماء الغيوم: اسم الدخول «${login}» — الباسورد المؤقت: ${pass} (ستغيّره عند أول دخول)`,
    copyText: (login: string, pass: string) => `اسم الدخول: ${login} — الباسورد: ${pass}`,
  },
  errors: {
    ALREADY_EXISTS: 'موجود بالفعل — اختر قيمة أخرى.',
    LOGIN_EXISTS: 'يوجد حساب دخول بهذا الرقم بالفعل.',
    ALREADY_HAS_LOGIN: 'لهذا الحساب دخول بالفعل — استخدم «تغيير الباسورد».',
    INVALID_PHONE: 'رقم الجوال غير صحيح.',
    INVALID_CODE: 'الرمز الإنجليزي: حروف إنجليزية صغيرة وأرقام فقط (2–20).',
    INVALID_DAY: 'لا يمكن تغيير يوم مضى.',
    CANNOT_DEACTIVATE_SELF: 'لا يمكنك إيقاف حسابك أنت.',
    NAME_REQUIRED: 'الاسم مطلوب.',
  } as Record<string, string>,
};
type Dict = typeof ar;
const en: Dict = {
  admin: 'Admin',
  active: 'Active',
  inactive: 'Inactive',
  deactivate: 'Deactivate',
  reactivate: 'Reactivate',
  edit: 'Edit',
  save: 'Save',
  saveChanges: 'Save changes',
  add: '+ Add',
  required: 'Required',
  search: 'Search',
  nameAr: 'Arabic name *',
  nameEn: 'English name',
  nameEnHint: 'Shown in the English interface. Left empty, the Arabic name is shown.',
  phoneRule: 'The mobile must be 10 digits starting with 05',
  done: 'Done',
  loadBody: 'Check your connection, then try again.',
  never: 'Never signed in',
  noLogin: 'No login',
  firstLogin: "Hasn't changed the temporary password",
  resetPw: 'Reset password',
  createLogin: 'Create login',
  pw: {
    confirmTitle: (name) => `Reset ${name}'s password?`,
    confirmBody: 'The current password stops working now; they must change the temporary one at first sign-in.',
    createTitle: (name) => `Create a login for ${name}?`,
    createBody: 'A new login is created with a 6-digit temporary password that must be changed at first sign-in.',
    generate: 'Create temporary password',
    newTitle: 'New temporary password',
    login: 'Login',
    password: 'Temporary password',
    once: 'Shown once only. Copy or send it now.',
    copy: 'Copy details',
    copied: 'Copied ✓',
    whatsapp: 'Send on WhatsApp',
    noPhone: 'No mobile on file, so WhatsApp is unavailable. Copy the details and send them.',
    message: (name, app, login, pass) => `Hello ${name}, your ${app} login — Clouds Water: login "${login}" — temporary password: ${pass} (you will change it at first sign-in)`,
    copyText: (login, pass) => `Login: ${login} — Password: ${pass}`,
  },
  errors: {
    ALREADY_EXISTS: 'Already exists — choose another value.',
    LOGIN_EXISTS: 'A login with this mobile already exists.',
    ALREADY_HAS_LOGIN: 'This account already has a login — use "Reset password".',
    INVALID_PHONE: 'Invalid mobile number.',
    INVALID_CODE: 'English code: lowercase English letters and digits only (2–20).',
    INVALID_DAY: "A past day can't be changed.",
    CANNOT_DEACTIVATE_SELF: "You can't deactivate your own account.",
    NAME_REQUIRED: 'The name is required.',
  },
};
export const ADMIN_STRINGS = { ar, en };

export const PHONE_RE = /^05[0-9]{8}$/;

/** Runs an admin change with the shared refresh + toasts. Resolves to true on success. */
export function useRun() {
  const { t } = useApp();
  const a = useStrings(ADMIN_STRINGS);
  const action = useAdminAction();
  const run = async (fn: () => Promise<unknown>, success?: string): Promise<boolean> => {
    try {
      await action.mutateAsync(fn);
      if (success) toast.success(success);
      return true;
    } catch (e) {
      const code = (e as { code?: string })?.code;
      toast.error((code && a.errors[code]) || errorText(e, t));
      return false;
    }
  };
  return { run, busy: action.isPending };
}

export function Pill({ tone, children, className }: { tone: 'success' | 'danger' | 'accent' | 'primary' | 'muted'; children: ReactNode; className?: string }) {
  const tones = {
    success: 'bg-success-soft text-success',
    danger: 'bg-danger-soft text-danger-ink',
    accent: 'bg-accent-soft text-accent-ink',
    primary: 'bg-primary-soft text-primary',
    muted: 'bg-surface-2 text-muted',
  };
  return <span className={clsx('inline-flex items-center gap-1 justify-self-start whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold', tones[tone], className)}>{children}</span>;
}

export function IconButton({ icon, label, onClick, tone = 'plain', disabled }: { icon: IconName; label: string; onClick: () => void; tone?: 'plain' | 'danger' | 'success'; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={clsx(
        'inline-flex size-[38px] flex-none cursor-pointer items-center justify-center rounded-[10px] border p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        tone === 'success' ? 'border-success bg-success-soft text-success' : 'border-line bg-surface hover:bg-surface-2',
        tone === 'danger' ? 'text-danger-ink' : tone === 'plain' ? 'text-ink' : '',
      )}
    >
      <Icon name={icon} size={17} />
    </button>
  );
}

/** Confirmation dialog for deactivations and other consequential actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  danger,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
}) {
  const { t } = useApp();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} width={480}>
      <div className="text-[15px] leading-relaxed text-muted">{children}</div>
      <div className="flex flex-wrap gap-2.5">
        <Button variant={danger ? 'danger' : 'gold'} size="lg" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
        <Button size="lg" onClick={() => onOpenChange(false)}>
          {t.cancel}
        </Button>
      </div>
    </Dialog>
  );
}

export interface PasswordTarget {
  name: string;
  /** What the person types to sign in (shown to staff). */
  login: string;
  phone?: string | null;
  /** "the branch app", "the driver app", "the dashboard" — used in the WhatsApp message. */
  app: string;
  /** null = no login yet: the dialog creates one. */
  userId: string | null;
  create: () => Promise<{ temp_password: string }>;
  reset: (userId: string) => Promise<{ temp_password: string }>;
  /** Show the password right away (after adding). */
  issued?: { temp_password: string; title: string };
  /** Called after the dialog is closed. */
  onDone?: () => void;
}

/** Confirm → issue a temporary password → show it once with copy + WhatsApp. */
export function PasswordDialog({ target, onClose }: { target: PasswordTarget | null; onClose: () => void }) {
  const { t } = useApp();
  const all = useStrings(ADMIN_STRINGS);
  const a = all.pw;
  const { run, busy } = useRun();
  const [issued, setIssued] = useState<{ pass: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const shown = issued ?? (target?.issued ? { pass: target.issued.temp_password, title: target.issued.title } : null);

  const close = () => {
    const done = target?.onDone;
    setIssued(null);
    setCopied(false);
    onClose();
    done?.();
  };

  const generate = async () => {
    if (!target) return;
    let pass = '';
    const ok = await run(async () => {
      const res = target.userId ? await target.reset(target.userId) : await target.create();
      pass = res.temp_password;
    });
    if (ok) setIssued({ pass, title: a.newTitle });
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && close()} title={shown ? shown.title : target ? (target.userId ? a.confirmTitle(target.name) : a.createTitle(target.name)) : ''} kicker={target?.name} width={500}>
      {target && !shown && (
        <>
          <p className="m-0 text-[15px] leading-relaxed text-muted">{target.userId ? a.confirmBody : a.createBody}</p>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="gold" size="lg" onClick={generate} disabled={busy}>
              {a.generate}
            </Button>
            <Button size="lg" onClick={close}>
              {t.cancel}
            </Button>
          </div>
        </>
      )}
      {target && shown && (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-surface-2 p-3.5 text-center">
              <div className="mb-1.5 text-[13px] font-bold text-muted">{a.login}</div>
              <div dir="ltr" className="break-all text-xl font-extrabold">
                {target.login}
              </div>
            </div>
            <div className="rounded-2xl border-[1.5px] border-dashed border-accent bg-accent-soft p-3.5 text-center">
              <div className="mb-1.5 text-[13px] font-bold text-accent-ink">{a.password}</div>
              <div dir="ltr" data-testid="temp-password" className="text-[26px] font-extrabold tracking-[.2em]">
                {shown.pass}
              </div>
            </div>
          </div>
          <div role="note" className="flex items-start gap-2 text-sm font-bold text-danger-ink">
            <Icon name="warn" size={18} className="mt-px flex-none" />
            {a.once}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button
              size="lg"
              className="min-w-[140px] flex-1"
              onClick={() => {
                try {
                  void navigator.clipboard.writeText(a.copyText(target.login, shown.pass));
                } catch {
                  /* clipboard blocked */
                }
                setCopied(true);
              }}
            >
              <Icon name="copy" size={18} />
              {copied ? a.copied : a.copy}
            </Button>
            {target.phone && (
              <a
                href={whatsappLink(target.phone, a.message(target.name, target.app, target.login, shown.pass))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 min-w-[140px] flex-1 items-center justify-center rounded-[14px] bg-[#19764A] px-4 font-extrabold text-white no-underline hover:brightness-110"
              >
                {a.whatsapp}
              </a>
            )}
          </div>
          {!target.phone && <div className="text-[13px] text-muted">{a.noPhone}</div>}
          <Button size="lg" variant="outline" onClick={close}>
            {all.done}
          </Button>
        </>
      )}
    </Dialog>
  );
}

/** Chip-style filter button with a count, as in the design. */
export function FilterChip({ on, label, count, alert, onClick }: { on: boolean; label: string; count: number; alert?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={clsx(
        'inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-bold',
        on ? 'border-side bg-side text-white' : 'border-line bg-surface text-ink',
      )}
    >
      {label}
      <span className={clsx('rounded-full px-2 py-px text-xs', on ? 'bg-gold text-navy-ink' : alert && count ? 'bg-danger-soft text-danger-ink' : 'bg-surface-2 text-muted')}>{count}</span>
    </button>
  );
}

/** On/off switch (role="switch") as in the design. */
export function Switch({ on, label, onClick, disabled }: { on: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={clsx('relative h-7 w-12 flex-none cursor-pointer rounded-full border-0 p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-60', on ? 'bg-success' : 'bg-line')}
    >
      <span className={clsx('absolute top-[3px] size-[22px] rounded-full bg-white shadow transition-all', on ? 'start-[23px]' : 'start-[3px]')} />
    </button>
  );
}
