import { useCallback, useRef, useState } from 'react';
import { Alert, BackHandler, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/data/supabase';
import { passwordRules } from '@/data/auth-api';
import { errorMessage } from '@/data/errors';
import { useAuth } from '@/providers/auth';
import { usePreferences } from '@/providers/preferences';
import { useOnline } from '@/providers/query';
import { AuthGate } from '@/ui/auth-gate';
import { Button, Card, Field, Icon, Label, Message, OfflineBar, PreferencesIcons, Screen, Title } from '@/ui/components';

function PasswordForm() {
  const { copy, side, colors } = usePreferences();
  const auth = useAuth();
  const online = useOnline();
  const branch = side === 'branch';
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const updatedPassword = useRef<string | null>(null);
  const labels = branch ? [copy.branch.r1, copy.branch.r2, copy.branch.r3]
    : [copy.driver.rule8, copy.driver.ruleNum, copy.driver.ruleMatch];
  const schema = z.object({ password: z.string().min(8, labels[0]).regex(/[a-z]/i, labels[1]).regex(/\d/, labels[1]),
    confirmation: z.string() }).refine(value => value.password === value.confirmation,
    { path: ['confirmation'], message: labels[2] });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { password: '', confirmation: '' } });
  const rules = passwordRules(form.watch('password'), form.watch('confirmation'));
  const busy = form.formState.isSubmitting;

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []));

  const submit = form.handleSubmit(async values => {
    if (!online || !rules.every(Boolean)) return;
    setError(null);
    try {
      // If completion fails after Auth has saved the password, retry the RPC without trying to
      // change to that same password again. The server still decides whether completion is valid.
      if (updatedPassword.current !== values.password) {
        const result = await supabase.auth.updateUser({ password: values.password });
        if (result.error) throw result.error;
        updatedPassword.current = values.password;
      }
      const completed = await supabase.rpc('complete_password_change');
      if (completed.error) throw completed.error;
      await auth.refreshProfile();
      updatedPassword.current = null;
      form.reset();
      Alert.alert(copy.branch.passSaved, undefined, [{ text: copy.branch.close }]);
    } catch (error) { setError(error); }
  });

  return <Screen>
    <Stack.Screen options={{ gestureEnabled: false, headerBackVisible: false }} />
    {/* Opposite the key, not at the foot of the screen: the full language and theme controls used
        to sit below the form and took a third of it. */}
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Icon name="key" />
      <PreferencesIcons />
    </View>
    <View style={{ gap: 8 }}><Title>{branch ? copy.branch.pwdT : copy.driver.cpTitle}</Title>
      <Label>{branch ? copy.branch.pwdSub : copy.driver.cpSubFirst}</Label></View>
    <OfflineBar />
    <Card>
      {branch ? <Label>{copy.branch.pwdHdr}</Label> : null}
      <Controller control={form.control} name="password" render={({ field, fieldState }) =>
        <Field label={branch ? copy.branch.newPass : copy.driver.newPw} value={field.value}
          onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message}
          secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!busy} />
      } />
      <Controller control={form.control} name="confirmation" render={({ field, fieldState }) =>
        <Field label={branch ? copy.branch.confPass : copy.driver.confirmPw} value={field.value}
          onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message}
          secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="new-password"
          editable={!busy} onSubmitEditing={() => void submit()} />
      } />
      <Button secondary label={visible ? copy.branch.hidePw : copy.branch.showPw} disabled={busy}
        onPress={() => setVisible(value => !value)} />
      {rules.map((valid, index) => <View key={index} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}
        accessible accessibilityLabel={labels[index]} accessibilityRole="checkbox" accessibilityState={{ checked: valid }}>
        <Icon name={valid ? 'check' : 'info'} color={valid ? colors.success : colors.muted} />
        <Label style={{ flex: 1, color: valid ? colors.success : colors.muted }}>{labels[index]}</Label>
      </View>)}
      {error ? <Message>{errorMessage(error, copy, side)}</Message> : null}
      <Button label={busy ? copy.branch.saving : branch ? copy.branch.savePass : copy.driver.saveContinue}
        disabled={busy || !online || !rules.every(Boolean)} onPress={() => void submit()} />
    </Card>
  </Screen>;
}

export default function ChangePasswordScreen() {
  return <AuthGate route="/change-password"><PasswordForm /></AuthGate>;
}
