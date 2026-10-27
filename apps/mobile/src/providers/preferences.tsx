import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { I18nManager, useColorScheme } from 'react-native';
import { reloadAppAsync } from 'expo';
import * as SecureStore from 'expo-secure-store';
import { ar } from '@/i18n/ar';
import { en } from '@/i18n/en';
import type { Copy } from '@/i18n/copy';
import { palette, type ThemeName } from '@/ui/tokens';
import type { Role } from '@/data/auth-api';

type Language = 'ar' | 'en';
type ThemeChoice = ThemeName | 'system';
type Preferences = {
  language: Language;
  themeChoice: ThemeChoice;
  theme: ThemeName;
  colors: (typeof palette)[ThemeName];
  copy: Copy;
  side: Role;
  ready: boolean;
  error: unknown;
  retry: () => void;
  setLanguage: (value: Language) => Promise<void>;
  setTheme: (value: ThemeChoice) => Promise<void>;
  setSide: (value: Role) => Promise<void>;
};

const PreferencesContext = createContext<Preferences | null>(null);

// Ask native for a direction. This does NOT take effect now: I18nManager.isRTL is a native constant
// read at launch, and forceRTL only records what the next launch should use.
//
// Never reload from here to "apply" it. reloadAppAsync restarts the JS bundle while the native
// constant keeps its launch value, so `isRTL !== rtl` is still true on the next mount — which
// reloads again, forever. That loop is what a mismatched direction used to cause on every boot.
function requestDirection(language: Language) {
  const rtl = language === 'ar';
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(rtl);
  return rtl;
}

export function PreferencesProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [language, setLanguageState] = useState<Language>('ar');
  const [themeChoice, setThemeState] = useState<ThemeChoice>('system');
  const [side, setSideState] = useState<Role>('branch');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    void (async () => {
      const [savedLanguage, savedTheme, savedSide] = await Promise.all([
        SecureStore.getItemAsync('cw.language'), SecureStore.getItemAsync('cw.theme'),
        SecureStore.getItemAsync('cw.side'),
      ]);
      if (!live) return;
      const nextLanguage = savedLanguage === 'en' ? 'en' : 'ar';
      setLanguageState(nextLanguage);
      setThemeState(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'system');
      setSideState(savedSide === 'driver' ? 'driver' : 'branch');
      // Boot records the direction and renders whatever the app launched with. A first install
      // whose saved language disagrees with the launch direction looks right from the second
      // launch; reloading to fix it here is what caused the loop.
      requestDirection(nextLanguage);
      if (live) setReady(true);
    })().catch(error => { if (live) setError(error); });
    return () => { live = false; };
  }, [attempt]);

  const theme = themeChoice === 'system' ? (system === 'dark' ? 'dark' : 'light') : themeChoice;
  return <PreferencesContext.Provider value={{
    language, themeChoice, theme, colors: palette[theme], copy: language === 'ar' ? ar : en,
    side, ready, error, retry: () => setAttempt(value => value + 1),
    setLanguage: async value => {
      // Persist first: the reload below throws the current JS state away.
      await SecureStore.setItemAsync('cw.language', value);
      setLanguageState(value);
      // One reload, and only when the user themself switched language — never on boot. If native
      // ignores the request (Expo Go does not always honour forceRTL), this still reloads exactly
      // once, because the boot path above never reloads.
      if (requestDirection(value) !== I18nManager.isRTL) await reloadAppAsync();
    },
    setTheme: async value => {
      await SecureStore.setItemAsync('cw.theme', value);
      setThemeState(value);
    },
    setSide: async value => {
      await SecureStore.setItemAsync('cw.side', value);
      setSideState(value);
    },
  }}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('PreferencesProvider');
  return value;
}
