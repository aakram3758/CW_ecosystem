import { useEffect, useState } from 'react';
import { Alert, Modal, View } from 'react-native';
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
import { Button, Card, EmptyState, ErrorState, Field, Icon, Label, Loading, Message,
  OfflineBar, PreferencesControls, Screen, Title } from '@/ui/components';

function SignInForm() {
  const { copy, side, language, setSide } = usePreferences();
  const auth = useAuth();
  const online = useOnline();
  const [error, setError] = useState<unknown>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
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
  const selectedCode = form.watch('chain');
  const selectedChain = chains.data?.find(chain => chain.code === selectedCode);
  const busy = form.formState.isSubmitting || switching;
  const locked = lockedUntil > Date.now();

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
      setPickerOpen(false); setLockedUntil(0);
    } catch (error) { setError(error); } finally { setSwitching(false); }
  }

  const submit = form.handleSubmit(async values => {
    if (!online || locked) return;
    setError(null); auth.clearNotice();
    if (branch && !selectedChain) {
      form.setError('chain', { message: copy.branch.errChain });
      return;
    }
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

  return <Screen>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}><Button label={copy.shared.roleBranch} secondary={!branch} selected={branch}
        disabled={busy} onPress={() => void switchSide('branch')} /></View>
      <View style={{ flex: 1 }}><Button label={copy.shared.roleDriver} secondary={branch} selected={!branch}
        disabled={busy} onPress={() => void switchSide('driver')} /></View>
    </View>
    <Icon name={branch ? 'store' : 'truck'} />
    <View style={{ gap: 8 }}><Title>{branch ? copy.branch.loginTitle : copy.driver.loginHello}</Title>
      <Label>{branch ? copy.branch.loginSub : copy.driver.loginSub}</Label></View>
    <OfflineBar />
    <Card>
      {branch ? <>
        {chains.isError ? <ErrorState onRetry={() => void chains.refetch()} />
          : chains.isPending ? <Loading />
          : !chains.data.length ? <EmptyState title={copy.shared.noChains} /> : <>
            <Label>{copy.branch.chain}</Label>
            <Button secondary label={selectedChain ? selectedChain[language === 'ar' ? 'name_ar' : 'name_en'] : copy.branch.chainPh}
              disabled={busy} onPress={() => setPickerOpen(true)} />
          </>}
        {form.formState.errors.chain ? <Message>{form.formState.errors.chain.message}</Message> : null}
        <Controller control={form.control} name="branchNumber" render={({ field, fieldState }) =>
          <Field label={copy.branch.branchNo} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={fieldState.error?.message} keyboardType="number-pad" editable={!busy} autoCapitalize="none" />
        } />
      </> : <Controller control={form.control} name="mobile" render={({ field, fieldState }) =>
          <Field label={copy.driver.mobile} prefix={copy.shared.phonePrefix} value={field.value} onChangeText={value => field.onChange(formatPhone(value))}
            onBlur={field.onBlur} error={fieldState.error?.message} placeholder={copy.shared.phonePlaceholder}
            keyboardType="phone-pad" autoComplete="tel-national" editable={!busy}
            style={{ writingDirection: 'ltr', textAlign: 'left' }} />
      } />}
      <Controller control={form.control} name="password" render={({ field, fieldState }) =>
        <Field label={branch ? copy.branch.pass : copy.driver.password} value={field.value}
          onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message}
          secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false}
          autoComplete="current-password" editable={!busy} onSubmitEditing={() => void submit()} />
      } />
      <Button secondary label={showPassword ? copy.shared.hidePassword : branch ? copy.branch.showPass : copy.driver.showPw}
        disabled={busy} onPress={() => setShowPassword(value => !value)} />
      {branch ? <Label>{copy.branch.passHint}</Label> : null}
      {auth.notice ? <Message>{copy.shared[auth.notice]}</Message> : null}
      {error ? <View style={{ gap: 8 }}>
        {!branch && error instanceof SignInError && error.code === 'LOCKED' ? <Label>{copy.driver.lockedTitle}</Label> : null}
        <Message>{errorMessage(error, copy, side)}</Message>
      </View> : null}
      {!online ? <Message>{copy.branch.loginOff}</Message> : null}
      <Button label={form.formState.isSubmitting ? branch ? copy.branch.loggingIn : copy.driver.signingIn
        : branch ? copy.branch.login : copy.driver.login}
        disabled={busy || !online || locked || (branch && (!chains.data?.length || chains.isError))}
        onPress={() => void submit()} />
      <Button secondary label={branch ? copy.branch.forgot : copy.driver.forgot} disabled={busy}
        onPress={() => Alert.alert(branch ? copy.branch.forgotT : copy.driver.forgot,
          copy.shared.forgotNoPhone, [{ text: copy.branch.close }])} />
    </Card>
    <Label>{branch ? copy.branch.sharedNote : copy.driver.accountsNote}</Label>
    <PreferencesControls />
    <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
      <Screen><Title>{copy.branch.chainPh}</Title>
        {chains.data?.map(chain => <Button key={chain.code} secondary selected={chain.code === selectedCode}
          label={chain[language === 'ar' ? 'name_ar' : 'name_en']} onPress={() => {
            form.setValue('chain', chain.code, { shouldValidate: true }); setPickerOpen(false);
          }} />)}
        <Button secondary label={copy.branch.close} onPress={() => setPickerOpen(false)} />
      </Screen>
    </Modal>
  </Screen>;
}

export default function SignInScreen() {
  return <AuthGate route="/sign-in"><SignInForm /></AuthGate>;
}
