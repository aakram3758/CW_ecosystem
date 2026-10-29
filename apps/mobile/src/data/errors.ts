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

  // The codes the branch's four RPCs raise. Most of these the form already prevents, and they are
  // here because "prevented by the client" is not the same as "cannot happen": the RPC is reachable
  // without the form, and a branch account is shared, so two phones can be on the same request.
  //
  // The two that a person will actually meet are the first two.

  /** A visit day was set, or the request was cancelled, while this screen was open. */
  INVALID_STATUS: (copy: Copy) => copy.branch.lockedT,
  /** Another device on the same account already confirmed the pin. */
  LOCATION_ALREADY_SET: (copy: Copy) => copy.branch.locLocked,

  /** Migration 18's ceiling. The form refuses this first; this is the server saying so. */
  KG_TOO_LARGE: (copy: Copy) => copy.branch.errWmax,
  KG_REQUIRED: (copy: Copy) => copy.branch.errW0,
  CONTACT_REQUIRED: (copy: Copy) => copy.branch.errCName,
  INVALID_PHONE: (copy: Copy) => copy.branch.errPhone,

  // Deliberately **not** mapped: `NOT_ALLOWED`, `SUBTYPE_REQUIRED`, `LOCATION_REQUIRED` and
  // `INVALID_LOCATION`. Each is unreachable in order — the app forces the location screen before
  // the first request, always sends a subtype where one exists, and clamps the pin to the map — and
  // no approved sentence fits any of them. They fall through to the generic failure, which is at
  // least not a sentence about the wrong thing. If one ever shows up on a real phone, that is when
  // it earns copy of its own.
};

// The two designs word the generic failure differently, so anything shared has to pick by role.
export const loadErrorTitle = (copy: Copy, role: Role) =>
  role === 'branch' ? copy.branch.loadErrT : copy.driver.errTitle;

/**
 * The application code this error carries, or null when it carries none.
 *
 * Postgres raises these inside the message text, so recognising one is a word-boundary match —
 * `\bKG_TOO_LARGE\b` — and everything else matches nothing: a dropped connection, a gateway error,
 * a `TypeError` from our own code.
 *
 * Exported because one screen needs the question rather than the answer. The create screen's
 * send-failure block has its own approved sentence for a lost connection, which promises the form
 * is kept, and it may only be overridden when the server genuinely said something more specific.
 */
export function errorCode(error: unknown): keyof typeof errorMessages | null {
  const message = typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message) : '';
  return (Object.keys(errorMessages) as (keyof typeof errorMessages)[])
    .find(key => new RegExp(`\\b${key}\\b`).test(message)) ?? null;
}

export function errorMessage(error: unknown, copy: Copy, role: Role): string {
  // Auth can reject an unchanged password before the completion RPC is reached.
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'same_password') {
    return copy.shared.samePassword;
  }
  const code = errorCode(error);
  return code ? errorMessages[code](copy, role, error instanceof SignInError ? error.attemptsLeft : undefined)
    : role === 'branch' ? copy.branch.loadErrB : copy.driver.errBody;
}
