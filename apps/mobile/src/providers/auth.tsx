import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/data/supabase';
import type { Database } from '@/data/database.types';
import { usePreferences } from '@/providers/preferences';

type Profile = Pick<Database['public']['Tables']['profiles']['Row'],
  'role' | 'display_name' | 'display_name_en' | 'must_change_password' | 'active'>;
type Notice = 'accountInactive' | 'wrongSideBranch' | 'wrongSideDriver' | 'unsupportedRole';
type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: unknown;
  notice: Notice | null;
  destination: '/sign-in' | '/change-password' | '/branch' | '/driver';
  clearNotice: () => void;
  retry: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const { side } = usePreferences();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState<unknown>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [rejectionError, setRejectionError] = useState<unknown>(null);
  const rejecting = useRef(false);

  useEffect(() => {
    let live = true;
    let eventReceived = false;
    setRestoring(true);
    setRestoreError(null);
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!live) return;
      eventReceived = true;
      setSession(nextSession);
      if (event === 'SIGNED_OUT') queryClient.removeQueries({ queryKey: ['profile'] });
      if (event === 'USER_UPDATED') void queryClient.invalidateQueries({ queryKey: ['profile'] });
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!live) return;
      if (error) throw error;
      if (!eventReceived) setSession(data.session);
      setRestoring(false);
    }).catch(error => {
      if (live) { setRestoreError(error); setRestoring(false); }
    });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, [queryClient, attempt]);

  const profileQuery = useQuery({
    queryKey: ['profile', session?.user.id],
    enabled: !!session,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('profiles')
        .select('role, display_name, display_name_en, must_change_password, active')
        .eq('id', session!.user.id).abortSignal(signal).single();
      if (error) throw error;
      return data;
    },
  });
  const profile = session ? profileQuery.data ?? null : null;
  const rejection: Notice | null = !profile ? null : !profile.active ? 'accountInactive'
    : profile.role !== 'branch' && profile.role !== 'driver' ? 'unsupportedRole'
    : profile.role !== side ? (side === 'branch' ? 'wrongSideBranch' : 'wrongSideDriver') : null;

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    queryClient.clear();
    setSession(null);
  }, [queryClient]);

  useEffect(() => {
    if (!rejection || rejecting.current || rejectionError) return;
    rejecting.current = true;
    setNotice(rejection);
    void signOut().catch(setRejectionError).finally(() => { rejecting.current = false; });
  }, [rejection, rejectionError, signOut]);

  const destination = !session || !profile || rejection ? '/sign-in'
    : profile.must_change_password ? '/change-password'
    : profile.role === 'branch' ? '/branch' : '/driver';

  return <AuthContext.Provider value={{
    session, profile, notice, destination,
    loading: restoring || (!!session && !profile && !profileQuery.error) || (!!rejection && !rejectionError),
    error: restoreError || rejectionError || (session ? profileQuery.error : null),
    clearNotice: () => setNotice(null), signOut,
    retry: () => {
      if (restoreError) setAttempt(value => value + 1);
      else if (rejectionError) setRejectionError(null);
      else void profileQuery.refetch();
    },
    refreshProfile: async () => {
      const result = await profileQuery.refetch();
      if (result.error) throw result.error;
    },
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider');
  return value;
}
