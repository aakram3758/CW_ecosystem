import { createClient, processLock } from '@supabase/supabase-js';
import type { Database } from '@/data/database.types';
import { secureStorage } from '@/data/secure-storage';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export const supabase = createClient<Database>(
  supabaseUrl,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: secureStorage,
      storageKey: 'cw.session',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  },
);
