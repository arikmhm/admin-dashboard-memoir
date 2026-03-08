"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Admin Dashboard Data Hook
// Parallel TanStack Query fetching for platform-wide summary stats
// Endpoints: /admin/owners, /admin/withdrawals, /admin/transactions
// ─────────────────────────────────────────────────────────────────────────────

import { useQueries, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiSuccessResponse, ApiPaginatedResponse } from "@/lib/api";
import type { Owner, Withdrawal, Transaction } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  /** Owners with no deletedAt */
  activeOwners: number;
  /** Owners with deletedAt set */
  inactiveOwners: number;
  /** Number of PAID transactions created today */
  todayTransactions: number;
  /** Number of withdrawals with status PENDING */
  pendingWithdrawals: number;
  /** Sum of walletBalance across all active owners */
  totalPlatformBalance: number;
}

interface UseAdminDashboardReturn {
  stats: AdminDashboardStats | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build ISO date range for today (local timezone).
 */
function getTodayRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  return {
    startDate: startOfDay.toISOString(),
    endDate: endOfDay.toISOString(),
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Custom hook for Admin Dashboard Home page.
 *
 * Fetches 3 independent API endpoints in parallel using TanStack Query useQueries:
 * - GET /admin/owners               → owner counts + wallet balance sum
 * - GET /admin/withdrawals?status=PENDING&limit=1 → pending count from meta.total
 * - GET /admin/transactions?startDate=...&endDate=...&limit=1 → today count from meta.total
 */
export function useAdminDashboard(): UseAdminDashboardReturn {
  const queryClient = useQueryClient();
  const { startDate, endDate } = getTodayRange();

  const [ownersQuery, withdrawalsQuery, transactionsQuery] = useQueries({
    queries: [
      // 1. All owners (non-paginated — returns full array)
      {
        queryKey: ["/admin/owners"] as const,
        queryFn: () => api.get<ApiSuccessResponse<Owner[]>>("/admin/owners"),
        staleTime: 60_000,
      },
      // 2. Pending withdrawals — only need meta.total, so limit=1
      {
        queryKey: ["admin-withdrawals", "pending-count"] as const,
        queryFn: () =>
          api.get<ApiPaginatedResponse<Withdrawal>>(
            "/admin/withdrawals?status=PENDING&limit=1",
          ),
        staleTime: 30_000,
      },
      // 3. Today's transactions — only need meta.total, so limit=1
      {
        queryKey: ["admin-transactions", "today-count", startDate] as const,
        queryFn: () =>
          api.get<ApiPaginatedResponse<Transaction>>(
            `/admin/transactions?startDate=${startDate}&endDate=${endDate}&limit=1`,
          ),
        staleTime: 30_000,
      },
    ],
  });

  const isLoading =
    ownersQuery.isLoading ||
    withdrawalsQuery.isLoading ||
    transactionsQuery.isLoading;

  const error =
    (ownersQuery.error as Error | null) ??
    (withdrawalsQuery.error as Error | null) ??
    (transactionsQuery.error as Error | null) ??
    null;

  let stats: AdminDashboardStats | null = null;

  if (!isLoading && !error) {
    const owners = ownersQuery.data?.data ?? [];
    const activeOwners = owners.filter((o) => !o.deletedAt);
    const inactiveOwners = owners.filter((o) => !!o.deletedAt);

    const totalPlatformBalance = activeOwners.reduce(
      (sum, o) => sum + (o.walletBalance ?? 0),
      0,
    );

    const pendingWithdrawals = withdrawalsQuery.data?.meta?.total ?? 0;
    const todayTransactions = transactionsQuery.data?.meta?.total ?? 0;

    stats = {
      activeOwners: activeOwners.length,
      inactiveOwners: inactiveOwners.length,
      todayTransactions,
      pendingWithdrawals,
      totalPlatformBalance,
    };
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/admin/owners"] });
    queryClient.invalidateQueries({
      queryKey: ["admin-withdrawals", "pending-count"],
    });
    queryClient.invalidateQueries({
      queryKey: ["admin-transactions", "today-count"],
    });
  };

  return { stats, isLoading, error, refresh };
}
