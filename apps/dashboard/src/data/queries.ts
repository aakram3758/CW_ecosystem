import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approvePlan,
  cancelRequest,
  changePlanDriver,
  createRequest,
  decide,
  fetchApprovals,
  fetchBranches,
  fetchDrivers,
  fetchHistory,
  fetchLateBranches,
  fetchNotifications,
  fetchRequests,
  fetchUsers,
  loadCatalog,
  markAllNotificationsRead,
  undoDecision,
  type ApprovePlanInput,
  type Decision,
  type NewRequestInput,
} from './api';
import type { DashboardUser, DayKey, Reason } from './types';
import { fetchBranchActivity, fetchDriverActivity, fetchReasonUsage, fetchReport, type ReportFilters } from './admin';
import { REF } from './catalog';
import { ApiError } from '../lib/supabase';

/** TanStack Query setup: cached reads, background refresh every minute and on tab focus. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // One quiet retry for network blips; permission / validation errors surface immediately.
      retry: (count, error) => count < 1 && error instanceof ApiError && (error.code === 'NETWORK' || error.code === 'UNKNOWN'),
      staleTime: 30_000,
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    },
  },
});

export const qk = {
  requests: ['requests'] as const,
  drivers: ['drivers'] as const,
  branches: ['branches'] as const,
  users: ['users'] as const,
  approvals: ['approvals'] as const,
  late: ['late-branches'] as const,
  history: (id: string) => ['history', id] as const,
  catalog: ['catalog'] as const,
  branchActivity: ['branch-activity'] as const,
  driverActivity: ['driver-activity'] as const,
  reasonUsage: ['reason-usage'] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
};

export const useRequests = () => useQuery({ queryKey: qk.requests, queryFn: fetchRequests });
export const useDrivers = () => useQuery({ queryKey: qk.drivers, queryFn: fetchDrivers, staleTime: 5 * 60_000, refetchInterval: false });
export const useBranches = () => useQuery({ queryKey: qk.branches, queryFn: fetchBranches, staleTime: 5 * 60_000, refetchInterval: false });
export const useUsers = () => useQuery({ queryKey: qk.users, queryFn: fetchUsers, staleTime: 5 * 60_000, refetchInterval: false });
export const useApprovals = () => useQuery({ queryKey: qk.approvals, queryFn: fetchApprovals });
export const useLateBranches = () => useQuery({ queryKey: qk.late, queryFn: fetchLateBranches });
export const useHistory = (id: string, branchLabel: string, updatedAt: string) =>
  useQuery({ queryKey: [...qk.history(id), updatedAt], queryFn: () => fetchHistory(id, branchLabel), refetchInterval: false });
export const useNotifications = (user: DashboardUser) => useQuery({ queryKey: qk.notifications(user.id), queryFn: fetchNotifications });

/** Every write changes requests; most also change plans, history and notifications. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.requests }),
      qc.invalidateQueries({ queryKey: qk.approvals }),
      qc.invalidateQueries({ queryKey: qk.late }),
      qc.invalidateQueries({ queryKey: ['history'] }),
      qc.invalidateQueries({ queryKey: ['notifications'] }),
    ]);
}

// The userId arguments are kept for call-site compatibility; the database takes the user from the session.

export function useCreateRequest(_userId?: string) {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (input: NewRequestInput) => createRequest(input), onSettled: invalidate });
}

export function useCancelRequest(_userId?: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (v: { id: string; reason: Reason | null; note: string }) => cancelRequest(v.id, v.reason, v.note),
    onSettled: invalidate,
  });
}

export function useApprovePlan() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (input: ApprovePlanInput) => approvePlan(input), onSettled: invalidate });
}

export function useChangePlanDriver(_userId?: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (v: { day: DayKey; from: string; to: string }) => changePlanDriver(v.day, v.from, v.to),
    onSettled: invalidate,
  });
}

export function useDecide(_userId?: string) {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (v: { id: string; decision: Decision }) => decide(v.id, v.decision), onSettled: invalidate });
}

export function useUndoDecision() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => undoDecision(id), onSettled: invalidate });
}

export function useMarkAllRead(_user?: DashboardUser) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ---------------------------------------------------------------- admin screens

/** Reference lists (cities, districts, chains, materials, reasons). Loaded at sign-in; refreshed after admin edits. */
export const useCatalog = () =>
  useQuery({ queryKey: qk.catalog, queryFn: loadCatalog, initialData: REF.rows ?? undefined, staleTime: 5 * 60_000, refetchInterval: false });
export const useBranchActivity = () => useQuery({ queryKey: qk.branchActivity, queryFn: fetchBranchActivity });
export const useDriverActivity = () => useQuery({ queryKey: qk.driverActivity, queryFn: fetchDriverActivity });
export const useReasonUsage = () => useQuery({ queryKey: qk.reasonUsage, queryFn: fetchReasonUsage, refetchInterval: false });
export const useReport = (f: ReportFilters) => useQuery({ queryKey: ['report', f], queryFn: () => fetchReport(f), refetchInterval: false, placeholderData: (prev) => prev });

/** Runs an admin change, then refreshes everything that can depend on it. */
export function useAdminAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: qk.catalog });
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.branches }),
        qc.invalidateQueries({ queryKey: qk.drivers }),
        qc.invalidateQueries({ queryKey: qk.users }),
        qc.invalidateQueries({ queryKey: qk.branchActivity }),
        qc.invalidateQueries({ queryKey: qk.driverActivity }),
        qc.invalidateQueries({ queryKey: qk.reasonUsage }),
        qc.invalidateQueries({ queryKey: qk.requests }),
        qc.invalidateQueries({ queryKey: qk.late }),
      ]);
    },
  });
}
