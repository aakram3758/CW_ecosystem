import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { usePrefs, useStrings, usePageTitle } from '../../lib/app-context';
import { useAuth, type AuthState } from '../../lib/auth';
import { changePassword, signIn } from '../../data/api';
import { ApiError, supabaseConfigured } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import logo from '../../assets/logo.png';
import { AUTH_STRINGS } from './strings';

/** Navy brand panel + form card. Stacks on small screens. */
function AuthShell({ children }: { children: ReactNode }) {
  const { t, theme, toggleTheme, toggleLang } = usePrefs();
  const s = useStrings(AUTH_STRINGS);
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink lg:flex-row">
      <section className="relative flex flex-col gap-8 overflow-hidden bg-navy px-6 pb-10 pt-6 text-white lg:w-[46%] lg:px-12 lg:pb-14 lg:pt-10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-[200px] size-[420px] rounded-full border border-white/[.08] ltr:-right-[140px] rtl:-left-[140px]" />
          <div className="absolute -bottom-[90px] size-[260px] rounded-full border border-gold/[.22] ltr:left-[12%] rtl:right-[12%]" />
        </div>
        <div className="relative flex items-center gap-2.5">
          <img src={logo} alt={t.logoAlt} className="h-14 w-auto lg:h-[72px]" />
          <div className="flex-1" />
          <Button variant="onDark" onClick={toggleLang} aria-label={t.switchLang}>
            <Icon name="globe" size={18} />
            {t.langButton}
          </Button>
          <Button variant="onDark" className="!px-0 w-11" onClick={toggleTheme} aria-label={theme === 'dark' ? t.toLight : t.toDark}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </Button>
        </div>
        <div className="relative hidden flex-1 flex-col justify-center gap-5 lg:flex">
          <div className="text-sm font-bold text-gold">{s.tagline}</div>
          <h1 className="m-0 text-[38px] font-extrabold leading-tight">{s.heroTitle}</h1>
          <p className="m-0 max-w-[460px] text-base leading-relaxed text-side-text">{s.heroBody}</p>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {s.heroPoints.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[15px] font-bold">
                <span className="inline-flex size-8 flex-none items-center justify-center rounded-[10px] bg-gold/[.14] text-gold">
                  <Icon name="tick" size={16} strokeWidth={2.4} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-sm font-bold text-gold lg:hidden">{s.tagline}</div>
      </section>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-8">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}

const loginSchema = z.object({
  // A dashboard login is an email, or the mobile number the account was created with.
  email: z.string().trim().refine((v) => /^05[0-9]{8}$/.test(v) || z.string().email().safeParse(v).success, 'email'),
  password: z.string().min(1, 'password'),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage({ notice }: { notice?: 'not_staff' | 'inactive' | 'expired' }) {
  const { t } = usePrefs();
  const s = useStrings(AUTH_STRINGS);
  usePageTitle(s.title);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const errors = form.formState.errors;
  const busy = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await signIn(v.email, v.password);
      // AuthProvider takes over from here (profile + reference data, then the app).
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'UNKNOWN';
      setError(s.errors[code] ?? t.errors[code] ?? t.saveError);
      form.setValue('password', '');
      form.setFocus('password');
    }
  });

  return (
    <AuthShell>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 rounded-[24px] border border-line bg-surface p-6 shadow-card sm:p-8">
        <div>
          <h2 className="m-0 text-[26px] font-extrabold">{s.title}</h2>
          <p className="m-0 mt-1 text-sm text-muted">{s.staffOnly}</p>
        </div>

        {!supabaseConfigured && (
          <div role="alert" className="rounded-[14px] bg-danger-soft px-3.5 py-3 text-sm font-bold leading-relaxed text-danger-ink">
            {s.missingConfig}
          </div>
        )}
        {notice && !error && (
          <div role="status" className="rounded-[14px] bg-accent-soft px-3.5 py-3 text-sm font-bold leading-relaxed text-accent-ink">
            {s.notice[notice]}
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-[14px] bg-danger-soft px-3.5 py-3 text-sm font-bold leading-relaxed text-danger-ink">
            {error}
          </div>
        )}

        <Field label={s.email} error={errors.email ? s.errEmail : undefined}>
          {({ id, invalid, describedBy }) => (
            <Input
              id={id}
              type="text"
              autoComplete="username"
              inputMode="email"
              dir="ltr"
              placeholder={s.emailPh}
              className="rtl:text-right"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              autoFocus
              {...form.register('email')}
            />
          )}
        </Field>
        <Field label={s.password} error={errors.password ? s.errPassword : undefined}>
          {({ id, invalid, describedBy }) => (
            <div className="relative">
              <Input
                id={id}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                dir="ltr"
                className="w-full ltr:pr-20 rtl:pl-20 rtl:text-right"
                aria-invalid={invalid}
                aria-describedby={describedBy}
                {...form.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                className="absolute inset-y-1 cursor-pointer rounded-[10px] border-0 bg-transparent px-3 text-[13px] font-bold text-primary ltr:right-1 rtl:left-1"
              >
                {showPassword ? s.hide : s.show}
              </button>
            </div>
          )}
        </Field>

        <Button type="submit" variant="gold" size="lg" className="h-[50px] text-base" disabled={busy || !supabaseConfigured}>
          {busy ? s.submitting : s.submit}
        </Button>
        <p className="m-0 text-[13px] leading-relaxed text-muted">{s.forgot}</p>
      </form>
    </AuthShell>
  );
}

const changeSchema = z
  .object({
    password: z.string().min(8, 'rule').regex(/[A-Za-z؀-ۿ]/, 'rule').regex(/\d/, 'rule'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'match' });
type ChangeValues = z.infer<typeof changeSchema>;

export function ChangePasswordPage() {
  const { t } = usePrefs();
  const s = useStrings(AUTH_STRINGS).change;
  const { reload, signOut } = useAuth();
  usePageTitle(s.title);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ChangeValues>({ resolver: zodResolver(changeSchema), defaultValues: { password: '', confirm: '' } });
  const errors = form.formState.errors;
  const busy = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await changePassword(v.password);
      toast.success(s.done);
      reload();
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'UNKNOWN';
      setError(s.errors[code] ?? t.errors[code] ?? t.saveError);
    }
  });

  return (
    <AuthShell>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 rounded-[24px] border border-line bg-surface p-6 shadow-card sm:p-8">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 flex-none items-center justify-center rounded-[14px] bg-accent-soft text-accent-ink">
            <Icon name="lock" size={22} />
          </span>
          <div>
            <h2 className="m-0 text-[24px] font-extrabold">{s.title}</h2>
            <p className="m-0 mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
          </div>
        </div>
        {error && (
          <div role="alert" className="rounded-[14px] bg-danger-soft px-3.5 py-3 text-sm font-bold text-danger-ink">
            {error}
          </div>
        )}
        <Field label={s.password} hint={s.rule} error={errors.password ? s.errRule : undefined}>
          {({ id, invalid, describedBy }) => (
            <Input id={id} type="password" autoComplete="new-password" dir="ltr" className="rtl:text-right" aria-invalid={invalid} aria-describedby={describedBy} autoFocus {...form.register('password')} />
          )}
        </Field>
        <Field label={s.confirm} error={errors.confirm ? s.errMatch : undefined}>
          {({ id, invalid, describedBy }) => (
            <Input id={id} type="password" autoComplete="new-password" dir="ltr" className="rtl:text-right" aria-invalid={invalid} aria-describedby={describedBy} {...form.register('confirm')} />
          )}
        </Field>
        <Button type="submit" variant="gold" size="lg" className="h-[50px] text-base" disabled={busy}>
          {s.submit}
        </Button>
        <Button variant="ghost" onClick={signOut}>
          {t.signOut}
        </Button>
      </form>
    </AuthShell>
  );
}

/** Full-screen state while the session, profile and reference lists load. */
export function AuthSplash({ state }: { state: Extract<AuthState, { status: 'loading' } | { status: 'error' }> }) {
  const { t } = usePrefs();
  const s = useStrings(AUTH_STRINGS);
  const { signOut } = useAuth();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 400); // avoid a flash on fast loads
    return () => clearTimeout(id);
  }, []);

  if (state.status === 'error') {
    return (
      <AuthShell>
        <div role="alert" className="flex flex-col gap-3 rounded-[24px] border border-line bg-surface p-6 shadow-card sm:p-8">
          <h2 className="m-0 text-[22px] font-extrabold">{s.loadErrorTitle}</h2>
          <p className="m-0 text-sm leading-relaxed text-muted">{t.errors[state.code] ?? t.loadError}</p>
          <div className="flex gap-2">
            <Button variant="gold" onClick={state.retry}>
              {t.retry}
            </Button>
            <Button onClick={signOut}>{t.signOut}</Button>
          </div>
        </div>
      </AuthShell>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy text-white" aria-busy="true">
      {slow && (
        <div className="flex flex-col items-center gap-4">
          <img src={logo} alt={t.logoAlt} className="h-20 w-auto animate-pulse" />
          <span className="text-sm text-side-text">{s.loadingTitle}</span>
        </div>
      )}
    </div>
  );
}
