import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { fetchChains, formatPhone, normalizePhone, signIn, SignInError, type Role } from '@/data/auth-api';
import { errorMessage } from '@/data/errors';
import { useAuth } from '@/providers/auth';
import { usePreferences } from '@/providers/preferences';
import { useOnline } from '@/providers/query';
import { AuthGate } from '@/ui/auth-gate';
import { AuthCard, AuthField, AuthHero, AuthSelect } from '@/ui/auth-shell';
import { Button, EmptyState, ErrorBanner, ErrorLine, ErrorState, Icon, Label, Loading,
  Screen, Segmented, TextLink } from '@/ui/components';
import { softFill } from '@/ui/tokens';

function SignInForm() {
  const { copy, colors, side, language, setSide } = usePreferences();
  const auth = useAuth();
  const online = useOnline();
  const [error, setError] = useState<unknown>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const branch = side === 'branch';
  const schema = z.object({
    chain: z.string(), branchNumber: z.string(), mobile: z.string(),
    password: z.string().min(1, copy.branch.errPass),
  }).superRefine((values, context) => {
    if (branch) {
      if (!values.chain) context.addIssue({ code: 'custom', path: ['chain'], message: copy.branch.errChain });
      if (!values.branchNumber.trim()) context.addIssue({ code: 'custom', path: ['branchNumber'], message: copy.branch.errBranch });
    } else if (!normalizePhone(values.mobile)) {
      context.addIssue({ code: 'custom', path: ['mobile'], message: copy.branch.errPhone });
    }
  });
  const form = useForm({ resolver: zodResolver(schema),
    defaultValues: { chain: '', branchNumber: '', mobile: '', password: '' } });
  const chains = useQuery({ queryKey: ['chains'], queryFn: ({ signal }) => fetchChains(signal), enabled: branch });
  const busy = form.formState.isSubmitting || switching;
  const locked = lockedUntil > Date.now();
  // The canvas turns every identity field red together and prints one message under them all,
  // rather than one message per field — so the chain, the branch number and the phone share this.
  const errors = form.formState.errors;
  const identityError = branch ? errors.chain?.message ?? errors.branchNumber?.message : errors.mobile?.message;

  useEffect(() => {
    if (!lockedUntil) return;
    const timeout = setTimeout(() => { setLockedUntil(0); setError(null); }, Math.max(0, lockedUntil - Date.now()));
    return () => clearTimeout(timeout);
  }, [lockedUntil]);

  async function switchSide(next: Role) {
    if (next === side || busy) return;
    setSwitching(true);
    try {
      await setSide(next);
      form.reset(); setError(null); auth.clearNotice(); setShowPassword(false);
      setLockedUntil(0);
    } catch (error) { setError(error); } finally { setSwitching(false); }
  }

  const submit = form.handleSubmit(async values => {
    if (!online || locked) return;
    setError(null); auth.clearNotice();
    const email = branch ? `b-${values.chain}-${values.branchNumber.trim()}@branches.cloudswater.co`
      : `d-${normalizePhone(values.mobile)}@drivers.cloudswater.co`;
    try {
      await signIn(email, values.password);
      form.reset();
    } catch (error) {
      setError(error);
      if (error instanceof SignInError && error.code === 'LOCKED') {
        setLockedUntil(Date.now() + (error.retryAfter ?? 0) * 1000);
      }
    }
  });

  // The hero paints behind the status bar, so the screen insets its bottom edge only and AuthHero
  // adds the top inset to its own padding. Hence padding 0 here: the hero is full-bleed and the
  // card sets its own margins.
  return <Screen edges={['bottom']} contentStyle={{ padding: 0, gap: 0, paddingBottom: 40 }}>
    <AuthHero title={branch ? copy.branch.loginTitle : copy.driver.loginHello}
      sub={branch ? copy.branch.loginSub : copy.driver.loginSub} />
    <AuthCard>
      <Segmented label={copy.shared.modeLabel} value={side} tone="solid" disabled={busy}
        onChange={next => void switchSide(next)}
        options={[{ value: 'branch', label: copy.shared.roleBranch, icon: 'store' },
          { value: 'driver', label: copy.shared.roleDriver, icon: 'truck' }]} />
      {branch
        ? chains.isError ? <ErrorState onRetry={() => void chains.refetch()} />
          : chains.isPending ? <Loading />
          : !chains.data.length ? <EmptyState title={copy.shared.noChains} />
          // 3fr / 2fr: the chain is a name, the branch number is three digits. Aligned to the top
          // so the message under one of them never shifts the other.
          : <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{ flex: 3, minWidth: 0 }}>
              <Controller control={form.control} name="chain" render={({ field, fieldState }) =>
                <AuthSelect label={copy.branch.chain} placeholder={copy.branch.chainPh}
                  value={field.value || null} invalid={!!fieldState.error} disabled={busy}
                  options={chains.data.map(chain => ({ value: chain.code,
                    label: chain[language === 'ar' ? 'name_ar' : 'name_en'] }))}
                  onChange={value => form.setValue('chain', value, { shouldValidate: true })} />} />
            </View>
            <View style={{ flex: 2, minWidth: 0 }}>
              <Controller control={form.control} name="branchNumber" render={({ field, fieldState }) =>
                <AuthField label={copy.branch.branchNo} value={field.value} onChangeText={field.onChange}
                  onBlur={field.onBlur} invalid={!!fieldState.error} editable={!busy} placeholder="106"
                  keyboardType="number-pad" autoCapitalize="none"
                  // Centred digits reading left-to-right, as the canvas marks this one input.
                  style={{ textAlign: 'center', writingDirection: 'ltr' }} />} />
            </View>
          </View>
        : <Controller control={form.control} name="mobile" render={({ field, fieldState }) =>
          <AuthField label={copy.driver.mobile} prefixBox={copy.shared.phonePrefix} value={field.value}
            onChangeText={value => field.onChange(formatPhone(value))} onBlur={field.onBlur}
            invalid={!!fieldState.error} placeholder={copy.shared.phonePlaceholder}
            keyboardType="phone-pad" autoComplete="tel-national" editable={!busy} />} />}
      {identityError ? <ErrorLine style={{ marginTop: -8 }}>{identityError}</ErrorLine> : null}
      <Controller control={form.control} name="password" render={({ field, fieldState }) =>
        <AuthField label={branch ? copy.branch.pass : copy.driver.password} value={field.value}
          onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message}
          // The canvas shows this hint on both sides: a driver gets a 6-digit temporary password too.
          hint={copy.branch.passHint} secureTextEntry={!showPassword} autoCapitalize="none"
          autoCorrect={false} autoComplete="current-password" editable={!busy}
          onSubmitEditing={() => void submit()}
          action={{ icon: 'eye', onPress: () => setShowPassword(value => !value),
            label: showPassword ? copy.shared.hidePassword
              : branch ? copy.branch.showPass : copy.driver.showPw }} />} />
      {auth.notice ? <ErrorBanner>{copy.shared[auth.notice]}</ErrorBanner> : null}
      {!online ? <ErrorBanner icon="wifiOff">{copy.branch.loginOff}</ErrorBanner> : null}
      {error ? <ErrorBanner icon={locked ? 'lock' : 'warn'}>{errorMessage(error, copy, side)}</ErrorBanner> : null}
      <Button variant="branch" busy={form.formState.isSubmitting}
        label={form.formState.isSubmitting ? branch ? copy.branch.loggingIn : copy.driver.signingIn
          : branch ? copy.branch.login : copy.driver.login}
        disabled={busy || !online || locked || (branch && (!chains.data?.length || chains.isError))}
        onPress={() => void submit()} />
      <TextLink label={branch ? copy.branch.forgot : copy.driver.forgot} disabled={busy}
        onPress={() => Alert.alert(branch ? copy.branch.forgotT : copy.driver.forgot,
          copy.shared.forgotNoPhone, [{ text: copy.branch.close }])} />
    </AuthCard>
    {branch ? <View style={{ marginTop: 18, marginHorizontal: 24, flexDirection: 'row', gap: 8,
      alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="store" size={18} color={colors.muted} tint={softFill(colors.muted)} />
      <Label style={{ fontSize: 13, color: colors.muted }}>{copy.branch.sharedNote}</Label>
    </View> : null}
    {/* No language or theme controls here, as the canvas has none: Ahmed's call. They live on the
        Account screen. A phone that opens in Arabic therefore signs in in Arabic. */}
  </Screen>;
}

export default function SignInScreen() {
  return <AuthGate route="/sign-in"><SignInForm /></AuthGate>;
}
