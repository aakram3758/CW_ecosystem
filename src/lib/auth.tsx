import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { fetchProfile, loadCatalog, signOut as apiSignOut, toDashboardUser } from '../data/api';
import { queryClient } from '../data/queries';
import type { DashboardUser } from '../data/types';
import { ApiError } from './supabase';
import { clearDrafts } from '../features/scheduling/draftStore';

/**
 * Session lifecycle for the dashboard:
 * no session → sign-in screen; session but not an active dashboard account → signed out with a message;
 * temporary password → change-password screen; otherwise the app.
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; notice?: 'not_staff' | 'inactive' | 'expired' }
  | { status: 'error'; code: string; retry: () => void }
  | { status: 'changePassword'; user: DashboardUser }
  | { status: 'ready'; user: DashboardUser };

interface AuthValue {
  state: AuthState;
  signOut: () => void;
  /** Re-reads the profile (after the password change). */
  reload: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const loadedFor = useRef<string | null>(null);
  const intentionalSignOut = useRef(false);

  const load = useCallback(async (userId: string, email: string | undefined) => {
    loadedFor.current = userId;
    setState({ status: 'loading' });
    try {
      const profile = await fetchProfile(userId);
      if (!profile || profile.role !== 'staff' || !profile.active) {
        intentionalSignOut.current = true;
        await apiSignOut();
        loadedFor.current = null;
        setState({ status: 'signedOut', notice: profile && profile.role === 'staff' ? 'inactive' : 'not_staff' });
        return;
      }
      await loadCatalog();
      const user = toDashboardUser({ ...profile, email });
      setState(profile.must_change_password ? { status: 'changePassword', user } : { status: 'ready', user });
    } catch (e) {
      loadedFor.current = null;
      setState({ status: 'error', code: e instanceof ApiError ? e.code : 'UNKNOWN', retry: () => void load(userId, email) });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) void load(data.session.user.id, data.session.user.email);
      else setState({ status: 'signedOut' });
    });
    // Supabase warns against awaiting other calls inside this callback — defer the work.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(() => {
        if (!mounted) return;
        if (event === 'SIGNED_OUT' || !session) {
          const wasIntentional = intentionalSignOut.current;
          intentionalSignOut.current = false;
          loadedFor.current = null;
          queryClient.clear();
          clearDrafts();
          setState((prev) => (prev.status === 'signedOut' ? prev : { status: 'signedOut', notice: wasIntentional ? undefined : prev.status === 'ready' ? 'expired' : undefined }));
          return;
        }
        if (event === 'SIGNED_IN' && loadedFor.current !== session.user.id) void load(session.user.id, session.user.email);
      }, 0);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const signOut = useCallback(() => {
    intentionalSignOut.current = true;
    void apiSignOut();
  }, []);

  const reload = useCallback(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void load(data.session.user.id, data.session.user.email);
    });
  }, [load]);

  return <AuthContext.Provider value={{ state, signOut, reload }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
