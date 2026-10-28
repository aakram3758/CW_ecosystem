import type { Copy } from '@/i18n/copy';
import { interpolate } from '@/i18n/copy';
import { SignInError, type Role } from '@/data/auth-api';

// These are the application error codes documented in the backend README.
export const errorMessages = {
  INVALID_CREDENTIALS: (copy: Copy, role: Role, attempts?: number) => attempts === undefined
    ? copy.driver.loginErr
    : interpolate(role === 'branch' ? copy.branch.badLogin : copy.driver.loginErrN, { n: attempts }),
  // Sign-in is one screen for both roles now and draws one locked banner, so both get the branch
  // wording. The driver's own 'lockedTitle' / 'lockedBody' stay for its locked artboard in bite 5.
  LOCKED: (copy: Copy) => copy.branch.lockMsg,
  PASSWORD_NOT_CHANGED: (copy: Copy) => copy.shared.samePassword,
  DUPLICATE_OPEN_REQUEST: (copy: Copy) => copy.branch.subOpen,
  REASON_REQUIRED: (copy: Copy) => copy.driver.needReason,
};

// The two designs word the generic failure differently, so anything shared has to pick by role.
export const loadErrorTitle = (copy: Copy, role: Role) =>
  role === 'branch' ? copy.branch.loadErrT : copy.driver.errTitle;

export function errorMessage(error: unknown, copy: Copy, role: Role): string {
  const message = typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message) : '';
  // Auth can reject an unchanged password before the completion RPC is reached.
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'same_password') {
    return copy.shared.samePassword;
  }
  const code = (Object.keys(errorMessages) as (keyof typeof errorMessages)[])
    .find(key => new RegExp(`\\b${key}\\b`).test(message));
  return code ? errorMessages[code](copy, role, error instanceof SignInError ? error.attemptsLeft : undefined)
    : role === 'branch' ? copy.branch.loadErrB : copy.driver.errBody;
}
