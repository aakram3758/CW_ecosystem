import { createClient } from '@supabase/supabase-js';

/**
 * The one Supabase client. Only the public URL and the publishable (anon) key belong here —
 * the service role key must never reach the browser or any VITE_ variable.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = !!url && !!key;

export const supabase = createClient(url ?? 'http://missing-supabase-url.invalid', key ?? 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'cw.auth' },
});

/** Error raised by our database functions: the message is an UPPER_SNAKE code (see /supabase/migrations). */
export class ApiError extends Error {
  constructor(
    public code: string,
    public detail?: string,
  ) {
    super(code);
  }
}

/** Turns a supabase-js error into an ApiError with a stable code the screens can translate. */
export function toApiError(error: { message?: string; code?: string; details?: string | null; hint?: string | null } | null | undefined): ApiError {
  const message = error?.message ?? '';
  if (/^[A-Z][A-Z_]+$/.test(message)) return new ApiError(message, error?.details ?? undefined);
  if (error?.code === '42501' || /permission denied/i.test(message)) return new ApiError('NOT_ALLOWED');
  if (/JWT|token/i.test(message)) return new ApiError('SESSION_EXPIRED');
  if (/Failed to fetch|NetworkError|network/i.test(message)) return new ApiError('NETWORK');
  return new ApiError('UNKNOWN', message);
}

/** Localised message for any error thrown by data/api.ts (falls back to the generic "couldn't save"). */
export function errorText(e: unknown, t: { errors: Record<string, string>; saveError: string }): string {
  return e instanceof ApiError ? (t.errors[e.code] ?? t.saveError) : t.saveError;
}
