import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PreferencesProvider, usePreferences } from '@/providers/preferences';
import { QueryProvider } from '@/providers/query';
import { AuthProvider } from '@/providers/auth';
import { AppSplash, ErrorState, Screen } from '@/ui/components';

function ReadyProviders({ children }: PropsWithChildren) {
  const preferences = usePreferences();
  // The one place the app's writing direction is set, and the reason it is a style and not
  // I18nManager: `isRTL` is a native constant, and it is false in Expo Go, where config plugins
  // never run — so laying Arabic out by it puts the whole UI left-to-right on the phone we test on.
  // A `direction` style takes effect at once and inherits, so this covers every screen below it.
  // Two things are left to set it themselves, deliberately: a Modal, which React Native renders in
  // its own hierarchy outside this tree (see `Sheet`), and the few boxes that read left-to-right
  // whatever the language — a phone number, a weight, the map.
  return <View style={{ flex: 1, direction: preferences.language === 'ar' ? 'rtl' : 'ltr' }}>
    {preferences.error ? <Screen><ErrorState onRetry={preferences.retry} /></Screen>
      : !preferences.ready ? <AppSplash />
      : <QueryProvider><AuthProvider>
        <StatusBar style={preferences.theme === 'dark' ? 'light' : 'dark'} />
        {children}
      </AuthProvider></QueryProvider>}
  </View>;
}

export function AppProviders({ children }: PropsWithChildren) {
  return <PreferencesProvider><ReadyProviders>{children}</ReadyProviders></PreferencesProvider>;
}
