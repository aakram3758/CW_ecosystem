import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { I18nManager, useColorScheme } from 'react-native';
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
  /** False until the onboarding slides have been seen or skipped once on this install. */
  onboarded: boolean;
  ready: boolean;
  error: unknown;
  retry: () => void;
  setLanguage: (value: Language) => Promise<void>;
  setTheme: (value: ThemeChoice) => Promise<void>;
  setSide: (value: Role) => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

const PreferencesContext = createContext<Preferences | null>(null);

// Ask native for a direction. This does NOT take effect now: I18nManager.isRTL is a native constant
// read at launch, and forceRTL only records what the next launch should use.
//
// Nothing reloads to "apply" it, from here or anywhere. A JS reload cannot change a native
// constant, so testing one against the other and reloading is a loop with no exit — which is
// exactly what a mismatched direction used to cause on every boot. The app's own direction is a
// style set from `language` in `AppProviders`, which takes effect on the next render.
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
  const [onboarded, setOnboarded] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    void (async () => {
      const [savedLanguage, savedTheme, savedSide, savedOnboarded] = await Promise.all([
        SecureStore.getItemAsync('cw.language'), SecureStore.getItemAsync('cw.theme'),
        SecureStore.getItemAsync('cw.side'), SecureStore.getItemAsync('cw.onboarded'),
      ]);
      if (!live) return;
      const nextLanguage = savedLanguage === 'en' ? 'en' : 'ar';
      setLanguageState(nextLanguage);
      setThemeState(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'system');
      setSideState(savedSide === 'driver' ? 'driver' : 'branch');
      // Defaults to false, so a read that fails shows the slides again rather than hiding them
      // for good. Nothing below `ready` renders until this has run, so the slides never flash.
      setOnboarded(savedOnboarded === 'yes');
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
    side, onboarded, ready, error, retry: () => setAttempt(value => value + 1),
    setLanguage: async value => {
      setLanguageState(value);
      // Tell native, for the next cold start and for anything it draws itself. Nothing in this app
      // lays out by `I18nManager.isRTL` any more — `AppProviders` sets `direction` from this very
      // state — so the switch takes effect on the next render and **nothing reloads**. It used to,
      // and that was wrong twice over: it is not needed, and it threw away whatever the user was
      // in the middle of typing, which from the password screen is the password itself.
      requestDirection(value);
      await SecureStore.setItemAsync('cw.language', value);
    },
    setTheme: async value => {
      await SecureStore.setItemAsync('cw.theme', value);
      setThemeState(value);
    },
    setSide: async value => {
      await SecureStore.setItemAsync('cw.side', value);
      setSideState(value);
    },
    completeOnboarding: async () => {
      // Shown first, remembered after: if the write fails the user still gets into the app, and
      // the worst that happens is they see three slides again next launch.
      setOnboarded(true);
      await SecureStore.setItemAsync('cw.onboarded', 'yes');
    },
  }}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('PreferencesProvider');
  return value;
}
