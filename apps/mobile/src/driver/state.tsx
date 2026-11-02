import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/data/driver-api';
import { fetchNotifications, markNotificationsRead } from '@/data/shared-api';
import { supabase } from '@/data/supabase';
import { errorCode } from '@/data/errors';
import { opsToday } from '@/ui/date';
import { ErrorState, OfflineBar, Screen, Skeleton } from '@/ui/components';
import { useAuth } from '@/providers/auth';
import { emptyDraft, shiftDay, suggest, validDraft, type Draft, type Outcome } from './model';
import type { RequestListRow } from '@/data/rows';

export type Tab = 'home' | 'upcoming' | 'history' | 'account';
export type Page = Tab | 'plan' | 'stop' | 'outcome' | 'success' | 'notifications' | 'pwd';

function useDriverState(today: string, identity: api.DriverContext) {
  const client = useQueryClient();
  const id = identity.driver.id;
  const { session } = useAuth();
  const prefix = ['driver', session!.user.id];
  const keys = { context: [...prefix, 'context'], day: [...prefix, 'day'], next: [...prefix, 'next'],
    history: [...prefix, 'history'], reasons: [...prefix, 'reasons'], notifications: [...prefix, 'notifications'] };
  const [range, setRange] = useState({ from: shiftDay(today, -6), to: today });
  const context = useQuery({ queryKey: [...keys.context, today], queryFn: () => api.fetchDriverContext(today) });
  const day = useQuery({ queryKey: [...keys.day, id, today], queryFn: () => api.fetchDay(id, today) });
  const next = useQuery({ queryKey: [...keys.next, id, today], queryFn: () => api.fetchNextPlan(id, today) });
  const history = useQuery({ queryKey: [...keys.history, id, range.from, range.to], queryFn: () => api.fetchHistory(id, range.from, range.to) });
  // A small existence read distinguishes first-ever empty history from an empty chosen period.
  const historyExists = useQuery({ queryKey: [...prefix, 'history-exists', id], queryFn: () => api.hasHistory(id) });
  const reasons = useQuery({ queryKey: keys.reasons, queryFn: api.fetchReasons });
  const notifications = useQuery({ queryKey: keys.notifications, queryFn: fetchNotifications });
  const retry = () => client.invalidateQueries({ queryKey: prefix });
  const refreshVisits = () => Promise.all(['day', 'next', 'history', 'history-exists'].map(k => client.invalidateQueries({ queryKey: [...prefix, k] })));
  useEffect(() => {
    const base = ['driver', session!.user.id];
    const channel = supabase.channel('driver-live');
    const on = (table: string, names: string[]) => channel.on('postgres_changes', { event: '*', schema: 'public', table },
      () => { for (const name of names) void client.invalidateQueries({ queryKey: [...base, name] }); });
    on('requests', ['day', 'next', 'history']);
    on('visit_attempts', ['day', 'next', 'history', 'history-exists']);
    // A notification also refetches the plans. Realtime only sends a change to someone who can read
    // the row afterwards, so when ops moves a stop to another driver, this driver never hears about
    // the request: it is not theirs any more. The `plan_updated` notification ops writes to them at
    // the same moment is the one event that does arrive.
    on('notifications', ['notifications', 'day', 'next']);
    on('driver_days_off', ['context']);
    on('plan_approvals', ['next']);
    channel.subscribe(status => { if (status === 'SUBSCRIBED') void client.invalidateQueries({ queryKey: base }); });
    return () => { void supabase.removeChannel(channel); };
  }, [client, session!.user.id]);

  const [page, setPage] = useState<Page>('home');
  const [stopFrom, setStopFrom] = useState<Page>('home');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const draftsRef = useRef(drafts);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [ops, setOps] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [last, setLast] = useState<{ row: RequestListRow; kind: Outcome } | null>(null);
  const [sendError, setSendError] = useState<unknown>(null);
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);
  function patchDraft(requestId: string, patch: Partial<Draft>) {
    const updated = { ...draftsRef.current, [requestId]: { ...(draftsRef.current[requestId] ?? emptyDraft()), ...patch } };
    draftsRef.current = updated; setDrafts(updated);
  }
  // Always attempt both writes even offline, so the form can fail visibly instead of pausing indefinitely.
  const upload = useMutation({ networkMode: 'always', mutationFn: ({ requestId, photo }: { requestId: string; photo: NonNullable<Draft['photo']> }) => api.uploadOutcomePhoto(requestId, photo) });
  const record = useMutation({ networkMode: 'always', mutationFn: api.recordOutcome });
  const read = useMutation({ mutationFn: markNotificationsRead, onSuccess: () => client.invalidateQueries({ queryKey: keys.notifications }) });
  const rows = day.data ?? [];
  const selected = rows.find(r => r.id === selectedId);
  async function send() {
    if (!selectedId || !selected || sendingRef.current) return;
    const requestId = selectedId;
    const draft = draftsRef.current[requestId] ?? emptyDraft();
    if (!validDraft(draft) || !draft.kind) return;
    sendingRef.current = true; setSending(true); setSendError(null);
    try {
      let path = draft.photoPath;
      if (draft.kind !== 'failed' && !path && draft.photo) {
        path = await upload.mutateAsync({ requestId, photo: draft.photo });
        patchDraft(requestId, { photoPath: path });
      }
      await record.mutateAsync({ requestId, outcome: draft.kind,
        reasonId: draft.kind === 'full' || draft.other ? null : draft.reasonId,
        reasonText: draft.kind === 'failed' && draft.other ? draft.reasonText.trim()
          : draft.kind === 'partial' && !draft.reasonId ? draft.note.trim() : null,
        note: draft.kind === 'partial' && draft.reasonId ? draft.note.trim() || null : null,
        photoPath: draft.kind === 'failed' ? null : path });
      const updated = { ...draftsRef.current }; delete updated[requestId]; draftsRef.current = updated; setDrafts(updated);
      setLast({ row: selected, kind: draft.kind });
      await refreshVisits();
      setPage('success');
    } catch (error) {
      setSendError(error);
      if (['INVALID_STATUS', 'NOT_VISIT_DAY'].includes(errorCode(error) ?? '')) void day.refetch();
    } finally { sendingRef.current = false; setSending(false); }
  }
  function openStop(requestId: string, from: Page = page) { setSelectedId(requestId); setStopFrom(from); setPage('stop'); }
  function back() {
    if (sendingRef.current) return;
    setPage(page === 'outcome' ? 'stop' : page === 'stop' ? stopFrom : page === 'pwd' ? 'account' : 'home');
  }
  const change = (notifications.data ?? []).find(n => !n.read_at && !dismissed.includes(n.id)
    && ['plan_changed', 'plan_updated'].includes(n.kind)
    && new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date(n.created_at)) === today);
  return { today, context: context.data ?? identity, contextError: context.isError, rows, day, next, history, historyExists,
    reasons, notifications, range, setRange, retry, selected, selectedId, page, setPage, openStop, back,
    drafts, patchDraft, sending, sendError, clearSendError: () => setSendError(null), send, last,
    suggestion: suggest(rows, today), change, dismissChange: () => { if (change) setDismissed(ids => [...ids, change.id]); },
    ops, openOps: () => { if ((context.data ?? identity).opsPhone) setOps(true); }, closeOps: () => setOps(false),
    toast, showToast: setToast, dismissToast: () => setToast(null), markAllRead: read.mutate, readError: read.error,
    refreshing: day.isFetching || next.isFetching || context.isFetching || history.isFetching || notifications.isFetching };
}
type DriverState = ReturnType<typeof useDriverState>;
const Context = createContext<DriverState | null>(null);
export function DriverProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [today, setToday] = useState(opsToday);
  useEffect(() => {
    const refresh = () => setToday(opsToday());
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    const interval = setInterval(refresh, 60_000);
    return () => { subscription.remove(); clearInterval(interval); };
  }, []);
  // Keep the provider mounted at Riyadh midnight so an in-memory draft survives the date refresh.
  const context = useQuery({ queryKey: ['driver', session!.user.id, 'context', today], queryFn: () => api.fetchDriverContext(today), placeholderData: previous => previous });
  if (!context.data) return <Screen>{context.isError ? <ErrorState onRetry={() => void context.refetch()} />
    : <><Skeleton height={90} /><Skeleton height={220} /></>}<OfflineBar onRetry={() => void context.refetch()} busy={context.isFetching} /></Screen>;
  return <DriverData today={today} identity={context.data}>{children}</DriverData>;
}
function DriverData({ today, identity, children }: PropsWithChildren<{ today: string; identity: api.DriverContext }>) {
  return <Context.Provider value={useDriverState(today, identity)}>{children}</Context.Provider>;
}
export function useDriver() { const value = useContext(Context); if (!value) throw new Error('DriverProvider'); return value; }
