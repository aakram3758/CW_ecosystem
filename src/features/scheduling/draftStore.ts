import { useSyncExternalStore } from 'react';

/**
 * The plan being prepared (assignments + excluded requests) per city · material.
 * Kept outside the page so it survives navigating away and back. Nobody is notified
 * until the plan is approved, so the draft stays client-side.
 */
export interface Draft {
  assign: Record<string, string>; // requestId → driverId
  removed: string[];
}

const EMPTY: Draft = { assign: {}, removed: [] };
let drafts: Record<string, Draft> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Called on sign-out so a draft never carries over to the next account on the same computer. */
export function clearDrafts() {
  drafts = {};
  emit();
}

export function useDraft(key: string): [Draft, (update: (d: Draft) => Draft) => void] {
  const draft = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => drafts[key] ?? EMPTY,
  );
  const set = (update: (d: Draft) => Draft) => {
    drafts = { ...drafts, [key]: update(drafts[key] ?? EMPTY) };
    emit();
  };
  return [draft, set];
}
