import type { PropsWithChildren } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PreferencesProvider, usePreferences } from '@/providers/preferences';
import { QueryProvider } from '@/providers/query';
import { AuthProvider } from '@/providers/auth';
import { AppSplash, ErrorState, Screen } from '@/ui/components';

function ReadyProviders({ children }: PropsWithChildren) {
  const preferences = usePreferences();
  if (preferences.error) return <Screen><ErrorState onRetry={preferences.retry} /></Screen>;
  if (!preferences.ready) return <AppSplash />;
  return <QueryProvider><AuthProvider>
    <StatusBar style={preferences.theme === 'dark' ? 'light' : 'dark'} />
    {children}
  </AuthProvider></QueryProvider>;
}

export function AppProviders({ children }: PropsWithChildren) {
  return <PreferencesProvider><ReadyProviders>{children}</ReadyProviders></PreferencesProvider>;
}
