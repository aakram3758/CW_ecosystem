import { useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/data/supabase';

export function useOnline() {
  const network = useNetInfo();
  return network.isConnected !== false && network.isInternetReachable !== false;
}

export function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: {
    queries: { retry: false }, mutations: { retry: false },
  } }));
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      onlineManager.setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    const updateState = (state: string | null | undefined) => {
      focusManager.setFocused(state === 'active');
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    updateState(AppState.currentState);
    const subscription = AppState.addEventListener('change', updateState);
    return () => {
      unsubscribe();
      subscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
