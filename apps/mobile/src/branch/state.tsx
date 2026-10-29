import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/data/branch-api';
import type { ContactTarget } from './shared';
import type { CreateRequestArgs, EditRequestArgs, RequestListRow } from '@/data/rows';
import type { Photo } from '@/data/device';
import { ErrorState, Loading, OfflineBar, Screen } from '@/ui/components';
import { errorMessage } from '@/data/errors';
import { usePreferences } from '@/providers/preferences';

export type Tab = 'home' | 'reqs' | 'notifs' | 'acc';
export type Page = Tab | 'loc' | 'create' | 'success' | 'details';
export const isOpen = (row: RequestListRow) =>
  row.status === 'waiting' || row.status === 'scheduled' || row.status === 'needs_decision';

/**
 * A request that is waiting again *after* a visit was attempted and failed — «تُعاد جدولته بعد
 * تعذّر الاستلام» rather than «بانتظار تحديد يوم الزيارة».
 *
 * There is no column for it. `staff_decide`'s reschedule branch sets the status back to `waiting`
 * and clears the visit day, and what distinguishes that from a request that has never been visited
 * is that a `visit_attempts` row exists — which the view carries as `last_outcome`. So: waiting,
 * and something was already tried.
 */
export const isRescheduled = (row: RequestListRow) =>
  row.status === 'waiting' && row.last_outcome !== null;

/** Today in Riyadh, as `YYYY-MM-DD`, which is what `visit_day` is compared against. */
function opsToday() {
  // `en-CA` formats as YYYY-MM-DD, and the time zone is fixed because the business day is Riyadh's
  // wherever the phone happens to think it is.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());
}

const KEYS = {
  context: ['branch', 'context'] as const,
  reference: ['branch', 'reference'] as const,
  requests: ['branch', 'requests'] as const,
  timeline: ['branch', 'timeline'] as const,
  notifications: ['branch', 'notifications'] as const,
};

function useBranchState() {
  const client = useQueryClient();
  const { copy } = usePreferences();
  const invalidateRequests = () => Promise.all([
    client.invalidateQueries({ queryKey: KEYS.requests }),
    client.invalidateQueries({ queryKey: KEYS.timeline }),
  ]);

  // ---------------------------------------------------------------- reads
  //
  // Five queries rather than one, so a failure is localised and an invalidation is cheap: sending a
  // request has to refetch the list and the timeline and must not refetch the reference tables.
  //
  // `context` and `reference` are the slow-changing pair — the branch's own row, and the materials,
  // subtypes, reasons and ops number. They are given a long `staleTime` because ops changing a
  // material mid-session is not something the branch needs to see within the minute.
  const context = useQuery({ queryKey: KEYS.context, queryFn: api.fetchBranchContext, staleTime: 5 * 60_000 });
  const reference = useQuery({ queryKey: KEYS.reference, queryFn: api.fetchReference, staleTime: 5 * 60_000 });
  const requests = useQuery({ queryKey: KEYS.requests, queryFn: api.fetchRequests });
  const timeline = useQuery({ queryKey: KEYS.timeline, queryFn: api.fetchTimeline });
  const notifications = useQuery({ queryKey: KEYS.notifications, queryFn: api.fetchNotifications });

  // ---------------------------------------------------------------- navigation
  //
  // Unchanged from bite 2, and still local state: which page, which tab, which request is open,
  // which material the create screen opened on. None of it belongs to the server.
  const [page, setPage] = useState<Page>('home');
  const [tab, setTab] = useState<Tab>('home');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [initialMaterial, setInitialMaterial] = useState<string | null>(null);
  const [initialSubtype, setInitialSubtype] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [past, setPast] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactTarget | null>(null);

  // ---------------------------------------------------------------- writes
  //
  // Each mutation invalidates exactly what it changed. A created or edited request changes the list
  // and its timeline; confirming a location changes the context; marking notifications read changes
  // the notifications. Nothing invalidates `reference`, because no branch write touches it.
  //
  // The photo is uploaded inside the create and edit mutations rather than by the screen, so the
  // rule that the file goes up before the row is written lives in one place. The screen hands over
  // the `Photo` it picked; the path is this layer's business.
  //
  // `networkMode: 'always'` on the four that a person waits for, and it is not a detail. The
  // default is `'online'`, and `providers/query` hands `onlineManager` to NetInfo — so by default a
  // send with no connection is *paused*, not failed: no error ever arrives, and the button spins
  // until the connection comes back. The design says otherwise. «تعذّر إرسال الطلب لعدم وجود
  // اتصال. بياناتك محفوظة» is a state the canvas drew, which means the attempt has to be allowed to
  // fail so the screen can say so and keep the form. `readAll` is left on the default on purpose:
  // nothing waits on it and no failure was drawn for it, so letting it pause and run on reconnect
  // is the better behaviour there.

  /** Create, which also uploads. `p_photo_path` is this mutation's to fill, not the caller's. */
  const create = useMutation({
    networkMode: 'always',
    mutationFn: async ({ args, photo }: { args: Omit<CreateRequestArgs, 'p_photo_path'>; photo: Photo | null }) => {
      // Upload first when there is a photo, then call the RPC with the path it returned. A failed
      // upload means no row at all, which is the point.
      const path = photo ? await api.uploadScalePhoto(context.data!.branch.id, photo) : undefined;
      return api.createRequest({ ...args, p_photo_path: path });
    },
    onSuccess: async result => {
      await invalidateRequests();
      setSelectedId(result.id); setPage('success');
    },
  });

  /** Edit. A new photo replaces the old path; no photo leaves `branch_photo_path` alone. */
  const edit = useMutation({
    networkMode: 'always',
    mutationFn: async ({ args, photo }: { args: Omit<EditRequestArgs, 'p_photo_path'>; photo: Photo | null }) => {
      const path = photo ? await api.uploadScalePhoto(context.data!.branch.id, photo) : undefined;
      return api.updateRequest({ ...args, p_photo_path: path });
    },
    onSuccess: async (_, { args }) => {
      await invalidateRequests();
      setSelectedId(args.p_request_id); setPage('details');
    },
  });

  const cancel = useMutation({ mutationFn: api.cancelRequest, networkMode: 'always',
    onError: error => setToast(errorMessage(error, copy, 'branch')),
    onSuccess: async () => { await invalidateRequests(); setToast(copy.branch.cancelledT); },
  });
  const confirm = useMutation({
    networkMode: 'always',
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => api.setLocation(lat, lng),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: KEYS.context });
      setPage('home'); setToast(copy.branch.locSaved);
    },
    onError: error => {
      if (/\bLOCATION_ALREADY_SET\b/.test(error.message)) {
        setToast(copy.branch.locLocked);
        void client.invalidateQueries({ queryKey: KEYS.context });
      }
    },
  });
  const readAll = useMutation({ mutationFn: api.markNotificationsRead,
    onSuccess: () => client.invalidateQueries({ queryKey: KEYS.notifications }),
  });

  // ---------------------------------------------------------------- derived
  const rows = requests.data ?? [];
  const selected = rows.find(r => r.id === selectedId);

  function navigate(next: Tab) { setTab(next); setPage(next); }
  function openRequest(requestId: string) {
    setSelectedId(requestId);
    setPage('details');
  }
  function startCreate(materialId: string | null = null, subtypeId: string | null = null, editing: string | null = null) {
    create.reset(); edit.reset();
    setEditId(editing); setInitialMaterial(materialId); setInitialSubtype(subtypeId);
    setCreateKey(n => n + 1); setPage('create');
  }

  return {
    // The branch's own row and its three reference rows. Non-null here because `BranchProvider`
    // does not render the app until the context has loaded — see the note there.
    branch: context.data!.branch,
    chain: context.data!.chain,
    city: context.data!.city,
    district: context.data!.district,

    requests: rows,
    events: timeline.data?.events ?? [],
    attempts: timeline.data?.attempts ?? [],
    notifications: notifications.data ?? [],
    materials: reference.data?.materials ?? [],
    subtypes: reference.data?.subtypes ?? [],
    reasons: reference.data?.reasons ?? [],
    opsPhone: reference.data?.opsPhone ?? null,
    today: opsToday(),

    /**
     * What the home screen draws skeletons for: the request list has never arrived. Not "is
     * refetching" — a background refresh must not blank a screen that already has rows on it,
     * which is why this is the first load and not `isFetching`.
     */
    loading: requests.isPending || reference.isPending,
    /** Any of the three reads the home screen needs has failed. */
    error: requests.isError || reference.isError || timeline.isError,
    /** Refetch everything the home screen needs. The retry button and the offline bar share it. */
    retry: () => Promise.all(Object.values(KEYS).map(queryKey => client.invalidateQueries({ queryKey }))),
    refreshing: context.isFetching || reference.isFetching || requests.isFetching || timeline.isFetching || notifications.isFetching,

    page: context.data!.branch.location_confirmed_at === null ? 'loc' as const : page, tab, selected, editId, initialMaterial, initialSubtype,
    filter, setFilter, past, setPast, createKey, navigate, openRequest, startCreate,
    toast, contact,
    showToast: (text: string) => setToast(text),
    dismissToast: () => setToast(null),
    openContact: (target: ContactTarget) => setContact(target),
    closeContact: () => setContact(null),
    back: () => setPage(tab),

    /**
     * Whether a write is in flight, and why the last one failed.
     *
     * The create screen needs both: the button spins while `sending`, and `sendError` is the
     * canvas's «لم نتمكن من إرسال الطلب» block — which keeps the filled form and the chosen photo
     * on screen, because the whole point of that state is that nothing the user typed is lost.
     */
    sending: create.isPending || edit.isPending,
    sendError: create.error ?? edit.error ?? null,
    clearSendError: () => { create.reset(); edit.reset(); },

    /** Confirm the pin. Unlike phase A, nothing is remembered on the device — the row is the truth. */
    confirmLocation: (lat: number, lng: number) => confirm.mutate({ lat, lng }),
    locating: confirm.isPending,
    locationError: confirm.error ?? null,

    create: (args: Omit<CreateRequestArgs, 'p_photo_path'>, photo: Photo | null) => create.mutate({ args, photo }),
    edit: (args: Omit<EditRequestArgs, 'p_photo_path'>, photo: Photo | null) => edit.mutate({ args, photo }),
    cancelRequest: (requestId: string) => cancel.mutate(requestId),
    markAllRead: () => readAll.mutate(),
  };
}

type BranchState = ReturnType<typeof useBranchState>;
const BranchContext = createContext<BranchState | null>(null);

/**
 * The branch app's data, and the one thing it waits for before drawing anything.
 *
 * The context query — the branch's own row with its chain, district and city — is the app's
 * identity: the home hero, the account card and the photo path all need it, and there is no sensible
 * screen to draw without it. So this gates on that one query only, and everything else loads into a
 * screen that is already on the page: the home screen draws the canvas's skeletons while the
 * request list is still coming, the way it was designed to.
 *
 * It is one row by primary key, and the splash is still on screen while it is in flight, so in
 * practice nobody sees this gate. What they do see is its failure, which is the designed error
 * state with a retry — the first thing a branch meets when it opens the app on no connection.
 *
 * **Two components, not one `if`.** A hook cannot be called conditionally, and `useBranchState`
 * asserts the context row is there. So this component owns the gate and `BranchData` below owns the
 * state; both read the same query key, so the second one costs nothing — it is already in the
 * cache by the time it mounts.
 */
export function BranchProvider({ children }: PropsWithChildren) {
  const context = useQuery({ queryKey: KEYS.context, queryFn: api.fetchBranchContext, staleTime: 5 * 60_000 });
  if (!context.data) return <Screen>
    {context.isError ? <ErrorState onRetry={() => void context.refetch()} /> : <Loading />}
    <OfflineBar busy={context.isFetching} onRetry={() => void context.refetch()} />
  </Screen>;
  return <BranchData>{children}</BranchData>;
}

function BranchData({ children }: PropsWithChildren) {
  return <BranchContext.Provider value={useBranchState()}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const state = useContext(BranchContext);
  if (!state) throw new Error('BranchProvider');
  return state;
}
