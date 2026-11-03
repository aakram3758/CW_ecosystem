import type { PropsWithChildren } from 'react';
import { Alert } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/auth';
import { usePreferences } from '@/providers/preferences';
import { errorMessage, loadErrorTitle } from '@/data/errors';
import { BlankScreen, Button, ErrorState, OfflineBar, Screen } from '@/ui/components';

export function AuthGate({ route, children }: PropsWithChildren<{
  route: '/sign-in' | '/change-password' | '/branch' | '/driver';
}>) {
  const auth = useAuth();
  const { copy, side } = usePreferences();
  if (auth.error) return <Screen><OfflineBar /><ErrorState onRetry={auth.retry} />
    {auth.session ? <Button label={copy.branch.logout} onPress={() => {
      void auth.signOut().catch(error => Alert.alert(loadErrorTitle(copy, side),
        errorMessage(error, copy, side), [{ text: copy.branch.close }]));
    }} /> : null}
  </Screen>;
  if (auth.loading) return <BlankScreen />;
  if (auth.destination !== route) return <Redirect href={auth.destination} />;
  return children;
}
