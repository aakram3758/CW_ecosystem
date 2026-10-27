import { z } from 'zod';
import { supabase, supabaseUrl } from '@/data/supabase';

export type Role = 'branch' | 'driver';

const chainsResponse = z.object({
  chains: z.array(z.object({ code: z.string(), name_ar: z.string(), name_en: z.string() })),
});
const sessionResponse = z.object({
  session: z.object({ access_token: z.string(), refresh_token: z.string() }),
});

export class SignInError extends Error {
  constructor(public code: 'INVALID_CREDENTIALS' | 'LOCKED', public attemptsLeft?: number,
    public retryAfter?: number) {
    super(code);
  }
}

export async function fetchChains(signal?: AbortSignal) {
  const response = await fetch(`${supabaseUrl}/functions/v1/chains`, {
    headers: { 'Content-Type': 'application/json' }, signal,
  });
  if (!response.ok) throw new Error('chains');
  return chainsResponse.parse(await response.json()).chains;
}

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '').replace(/^966/, '').replace(/^0/, '');
}

export function normalizePhone(value: string): string | null {
  const digits = phoneDigits(value);
  return /^5\d{8}$/.test(digits) ? `0${digits}` : null;
}

export function formatPhone(value: string): string {
  const digits = phoneDigits(value);
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5)].filter(Boolean).join(' ');
}

export function passwordRules(password: string, confirmation: string) {
  return [password.length >= 8, /[a-z]/i.test(password) && /\d/.test(password),
    confirmation.length > 0 && password === confirmation];
}

export async function signIn(email: string, password: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/sign-in`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body: unknown = await response.json();
  if (response.status === 401) {
    const error = z.object({ error: z.literal('INVALID_CREDENTIALS'), attempts_left: z.number().int().min(0).max(5) }).parse(body);
    throw new SignInError(error.error, error.attempts_left);
  }
  if (response.status === 429) {
    const error = z.object({ error: z.literal('LOCKED'), retry_after: z.number().nonnegative() }).parse(body);
    throw new SignInError(error.error, undefined, error.retry_after);
  }
  if (response.status !== 200) throw new Error('sign-in');
  const { error } = await supabase.auth.setSession(sessionResponse.parse(body).session);
  if (error) throw error;
}
