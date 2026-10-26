import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { COMMON, type CommonDict } from '../i18n/common';
import type { DashboardUser, Lang, LocalizedText } from '../data/types';

type Theme = 'light' | 'dark';

interface PrefsValue {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  /** Shared copy. Page copy: `useStrings(pageStrings)`. */
  t: CommonDict;
  /** Picks the current-language value from a bilingual record. */
  l: (text: LocalizedText) => string;
  toggleLang: () => void;
  theme: Theme;
  toggleTheme: () => void;
}

interface AppContextValue extends PrefsValue {
  /** Signed-in dashboard user (from the Supabase session + profiles row). */
  user: DashboardUser;
  signOut: () => void;
}

const PrefsContext = createContext<PrefsValue | null>(null);
const AppContext = createContext<AppContextValue | null>(null);

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — keep in memory only */
  }
}

/** Language + theme — available everywhere, including the sign-in screen. */
export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => readStored('cw.lang', ['ar', 'en'] as const, 'ar'));
  const [theme, setTheme] = useState<Theme>(() => readStored('cw.theme', ['light', 'dark'] as const, 'light'));

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    store('cw.lang', lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    store('cw.theme', theme);
  }, [theme]);

  const toggleLang = useCallback(() => setLang((v) => (v === 'ar' ? 'en' : 'ar')), []);
  const toggleTheme = useCallback(() => setTheme((v) => (v === 'light' ? 'dark' : 'light')), []);

  const value = useMemo<PrefsValue>(
    () => ({ lang, dir: lang === 'ar' ? 'rtl' : 'ltr', t: COMMON[lang], l: (text) => text[lang], toggleLang, theme, toggleTheme }),
    [lang, theme, toggleLang, toggleTheme],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

/** Wraps the signed-in part of the app. */
export function AppProvider({ user, signOut, children }: { user: DashboardUser; signOut: () => void; children: ReactNode }) {
  const prefs = usePrefs();
  const value = useMemo<AppContextValue>(() => ({ ...prefs, user, signOut }), [prefs, user, signOut]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside <PrefsProvider>');
  return ctx;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/** Current-language copy for a page: `const s = useStrings(REQUESTS_STRINGS)`. */
export function useStrings<T>(dict: { ar: T; en: T }): T {
  return dict[usePrefs().lang];
}

/** Sets the browser tab title for a page. */
export function usePageTitle(title: string) {
  const { lang } = usePrefs();
  useEffect(() => {
    document.title = `${title} — ${lang === 'ar' ? 'ماء الغيوم' : 'Clouds Water'}`;
  }, [title, lang]);
}
