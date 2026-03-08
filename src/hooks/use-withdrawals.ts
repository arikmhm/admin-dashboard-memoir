"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Withdrawal Processing Hooks
// TanStack Query hooks for admin withdrawal list, approve & reject
// Endpoints: GET /admin/withdrawals, POST .../approve, POST .../reject
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiPaginatedResponse, ApiSuccessResponse } from "@/lib/api";
import type {
  Withdrawal,
  WithdrawalStatus,
  RejectWithdrawalRequest,
} from "@/lib/types";

// ── Query keys ───────────────────────────────────────────────────────────────

const WITHDRAWALS_KEY = ["/admin/withdrawals"] as const;

// ── Withdrawal List Hook ─────────────────────────────────────────────────────

interface UseWithdrawalsOptions {
  status?: WithdrawalStatus;
  page?: number;
  limit?: number;
}

export function useWithdrawals(options?: UseWithdrawalsOptions) {
  const queryClient = useQueryClient();
  const status = options?.status;
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;

  const query = useQuery({
    queryKey: [...WITHDRAWALS_KEY, { status, page, limit }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("limit", String(limit));
      return api.get<ApiPaginatedResponse<Withdrawal>>(
        `/admin/withdrawals?${params.toString()}`,
      );
    },
    staleTime: 30_000,
  });

  const withdrawals = query.data?.data ?? [];
  const meta = query.data?.meta ?? { page: 1, limit: 20, total: 0 };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: WITHDRAWALS_KEY });
  };

  return {
    withdrawals,
    meta,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refresh,
  };
}

// ── Approve Mutation ─────────────────────────────────────────────────────────

export function useApproveWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApiSuccessResponse<{ withdrawal: Withdrawal }>>(
        `/admin/withdrawals/${id}/approve`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WITHDRAWALS_KEY });
    },
  });
}

// ── Reject Mutation ──────────────────────────────────────────────────────────

interface RejectData extends RejectWithdrawalRequest {
  id: string;
}

export function useRejectWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: RejectData) =>
      api.post<ApiSuccessResponse<{ withdrawal: Withdrawal }>>(
        `/admin/withdrawals/${id}/reject`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WITHDRAWALS_KEY });
    },
  });
}
