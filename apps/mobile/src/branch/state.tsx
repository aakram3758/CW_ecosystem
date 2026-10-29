import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as mock from '@/data/mock/branch';
import type { Database } from '@/data/database.types';
import type { ContactTarget } from './shared';

export type Tab = 'home' | 'reqs' | 'notifs' | 'acc';
export type Page = Tab | 'loc' | 'create' | 'success' | 'details';
// p_note is nullable for the same reason as in the create args — see mock/branch.ts.
type EditArgs = Omit<Database['public']['Functions']['branch_update_request']['Args'], 'p_note'>
  & { p_note: string | null };
export const isOpen = (row: mock.RequestListRow) =>
  row.status === 'waiting' || row.status === 'scheduled' || row.status === 'needs_decision';

// A branch confirms its pin once and should never be asked again — `locOnce` says so on the screen
// itself. On mock data "never again" lasted until the next launch, because the confirmation lived
// in React state, so signing in sent you back to the map. Keeping it on the device makes phase A
// behave the way the wired app will. `SecureStore.getItem` is the synchronous read, so the first
// render already knows and the map does not flash past.
//
// Phase B deletes this: `branches.location_confirmed_at` is the real answer.
const SAVED_LOCATION = 'cw.mock.location';
type SavedLocation = { lat: number; lng: number; at: string };
function savedLocation(): SavedLocation | null {
  try {
    const raw = SecureStore.getItem(SAVED_LOCATION);
    return raw ? JSON.parse(raw) as SavedLocation : null;
  } catch { return null; }
}

function useBranchState() {
  // Two pieces of chrome that outlive the page under them, so they live here rather than in a
  // screen: the toast (a cancel confirmed on the details screen is still being announced while the
  // list redraws) and the contact sheet (four screens open the same one).
  const [toast, setToast] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactTarget | null>(null);
  const [branch, setBranch] = useState(() => {
    const saved = savedLocation();
    return saved ? { ...mock.branch, lat: saved.lat, lng: saved.lng, location_confirmed_at: saved.at } : mock.branch;
  });
  const [requests, setRequests] = useState(mock.requestList);
  const [events, setEvents] = useState(mock.events);
  const [notifications, setNotifications] = useState(mock.notifications);
  const [page, setPage] = useState<Page>(branch.location_confirmed_at ? 'home' : 'loc');
  const [tab, setTab] = useState<Tab>('home');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [initialMaterial, setInitialMaterial] = useState<string | null>(null);
  const [initialSubtype, setInitialSubtype] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [past, setPast] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const selected = requests.find(r => r.id === selectedId);
  function navigate(next: Tab) { setTab(next); setPage(next); }
  function openRequest(requestId: string) {
    setSelectedId(requestId);
    setNotifications(rows => rows.map(n => n.request_id === requestId ? { ...n, read_at: mock.mockNow } : n));
    setPage('details');
  }
  function startCreate(materialId: string | null = null, subtypeId: string | null = null, editing: string | null = null) {
    setEditId(editing); setInitialMaterial(materialId); setInitialSubtype(subtypeId);
    setCreateKey(n => n + 1); setPage('create');
  }
  function addEvent(requestId: string, from: mock.EventRow['from_status'], to: mock.EventRow['to_status']) {
    setEvents(rows => [...rows, { id: Math.max(...rows.map(e => e.id)) + 1, request_id: requestId,
      actor_id: branch.user_id, actor_kind: 'branch', from_status: from, to_status: to,
      note: null, created_at: mock.mockNow }]);
  }
  return {
    branch, requests, events, notifications, page, tab, selected, editId, initialMaterial, initialSubtype,
    filter, setFilter, past, setPast, createKey, navigate, openRequest, startCreate,
    toast, contact,
    /**
     * Announce something that has already happened. The text comes from the caller because this
     * file has no language — it holds rows, not copy.
     */
    showToast: (text: string) => setToast(text),
    /** The `Toast`'s own 3200ms timer calls this; nothing else should. */
    dismissToast: () => setToast(null),
    openContact: (target: ContactTarget) => setContact(target),
    closeContact: () => setContact(null),
    /**
     * Cancel an open request. Phase B is `branch_cancel_request`; here it is the two local effects
     * that RPC has — the row goes to `cancelled`, which `isOpen` excludes, so it leaves the active
     * list for the past one by itself, and the history gains a `waiting → cancelled` event. The
     * caller announces it with `showToast(t.cancelledT)`.
     *
     * No fake delay. The canvas spins for 700ms because it is standing in for a network, and the
     * confirm sheet's spinner is already built (`Button busy`) for phase B to switch on — but
     * mocking latency now would only teach us how a mock feels.
     */
    cancelRequest: (requestId: string) => {
      setRequests(rows => rows.map(row => row.id === requestId ? { ...row, status: 'cancelled',
        cancelled_by: branch.user_id, updated_at: mock.mockNow } : row));
      addEvent(requestId, 'waiting', 'cancelled');
    },
    materials: mock.materials, subtypes: mock.subtypes, attempts: mock.attempts, reasons: mock.reasons,
    chain: mock.chain, city: mock.city, district: mock.district, opsPhone: mock.opsPhone.value,
    today: mock.mockToday, photoPath: mock.photoPath,
    back: () => setPage(tab),
    confirmLocation: (lat: number, lng: number) => {
      setBranch(row => ({ ...row, lat, lng, location_confirmed_at: mock.mockNow }));
      void SecureStore.setItemAsync(SAVED_LOCATION,
        JSON.stringify({ lat, lng, at: mock.mockNow } satisfies SavedLocation)).catch(() => {});
      navigate('home');
    },
    create: (args: mock.CreateRequestArgs) => {
      const row = mock.newRequest(args, Math.max(...requests.map(r => r.number ?? 0)) + 1);
      setRequests(rows => [mock.requestView(row), ...rows]); addEvent(row.id, null, 'waiting');
      setSelectedId(row.id); setPage('success');
    },
    edit: (args: EditArgs) => {
      setRequests(rows => rows.map(row => row.id === args.p_request_id ? { ...row,
        kg: args.p_kg, note: args.p_note ?? null, contact_name: args.p_contact_name ?? null,
        contact_phone: args.p_contact_phone ?? null, branch_photo_path: args.p_photo_path ?? null,
        updated_at: mock.mockNow } : row));
      addEvent(args.p_request_id, 'waiting', 'waiting'); setPage('details');
    },
    markAllRead: () => setNotifications(rows => rows.map(n => ({ ...n, read_at: mock.mockNow }))),
  };
}
type BranchState = ReturnType<typeof useBranchState>;
const BranchContext = createContext<BranchState | null>(null);
export function BranchProvider({ children }: PropsWithChildren) {
  return <BranchContext.Provider value={useBranchState()}>{children}</BranchContext.Provider>;
}
export function useBranch() {
  const state = useContext(BranchContext);
  if (!state) throw new Error('BranchProvider');
  return state;
}
