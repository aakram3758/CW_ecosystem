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

/**
 * The two ways a voluntary password change is refused, as codes `src/data/errors.ts` can word.
 *
 * `SAME_PASSWORD` is Auth's own `same_password` renamed on the way through, because the sentence
 * already mapped to that one names the *temporary* password — true in the forced flow, wrong here.
 */
export class PasswordError extends Error {
  constructor(public code: 'WRONG_PASSWORD' | 'SAME_PASSWORD') {
    super(code);
  }
}

/**
 * Change this account's own password, with its current one as proof.
 *
 * Unlike the forced change, which the server already knows is due and which finishes with
 * `complete_password_change`, this is the branch choosing to rotate a password that is working.
 * There is nothing to complete afterwards — `must_change_password` is already false — so this is
 * two Auth calls and no RPC.
 *
 * **Verification goes to Auth directly, never through the `sign-in` function.** That function is
 * where the lockout lives: five wrong attempts and the account is locked for everyone on it. A
 * branch mistyping its own current password while changing it must not be able to lock the branch
 * out, and there is nothing to protect by counting attempts here — whoever is holding the phone is
 * already signed in. The email comes from the session for the same reason: the branch typed a chain
 * and a number to get here, and the account's email is already known.
 *
 * A successful verification issues a fresh session for the same user, which is harmless; a failed
 * one leaves the existing session alone, which is what lets the screen stay up and say so.
 *
 * Only `invalid_credentials` becomes `WRONG_PASSWORD`. Every other failure of the verification is
 * rethrown as it is, so a change attempted with no connection says so instead of telling the branch
 * its own password is wrong — which is the kind of wrong answer that makes someone call operations.
 * `same_password` from the update is renamed; anything else there is rethrown for the same reason.
 *
 * Without a session, or without an email on it, this throws `NOT_ALLOWED`, which no screen words:
 * it cannot happen behind the gate, and there is nothing a branch could do about it.
 */
export async function changeOwnPassword(current: string, next: string): Promise<void> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.user.email) throw new Error('NOT_ALLOWED');
  const { error: verificationError } = await supabase.auth.signInWithPassword({
    email: session.user.email, password: current,
  });
  if (verificationError) {
    if (verificationError.code === 'invalid_credentials') throw new PasswordError('WRONG_PASSWORD');
    throw verificationError;
  }
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error?.code === 'same_password') throw new PasswordError('SAME_PASSWORD');
  if (error) throw error;
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
