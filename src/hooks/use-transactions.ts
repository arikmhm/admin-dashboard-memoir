"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Transaction Monitoring Hooks
// TanStack Query hook for admin transaction list (read-only)
// Endpoint: GET /admin/transactions
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiPaginatedResponse } from "@/lib/api";
import type { Transaction, TxStatus, PaymentMethod } from "@/lib/types";

// ── Query keys ───────────────────────────────────────────────────────────────

const TX_KEY = ["/admin/transactions"] as const;

// ── Transaction List Hook ────────────────────────────────────────────────────

export interface UseTransactionsOptions {
  ownerId?: string;
  kioskId?: string;
  status?: TxStatus;
  paymentMethod?: PaymentMethod;
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
  search?: string; // orderId
  page?: number;
  limit?: number;
}

export function useTransactions(options?: UseTransactionsOptions) {
  const queryClient = useQueryClient();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;

  const query = useQuery({
    queryKey: [
      ...TX_KEY,
      {
        ownerId: options?.ownerId,
        kioskId: options?.kioskId,
        status: options?.status,
        paymentMethod: options?.paymentMethod,
        startDate: options?.startDate,
        endDate: options?.endDate,
        search: options?.search,
        page,
        limit,
      },
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options?.ownerId) params.set("ownerId", options.ownerId);
      if (options?.kioskId) params.set("kioskId", options.kioskId);
      if (options?.status) params.set("status", options.status);
      if (options?.paymentMethod)
        params.set("paymentMethod", options.paymentMethod);
      if (options?.startDate) params.set("startDate", options.startDate);
      if (options?.endDate) params.set("endDate", options.endDate);
      if (options?.search) params.set("search", options.search);
      params.set("page", String(page));
      params.set("limit", String(limit));
      return api.get<ApiPaginatedResponse<Transaction>>(
        `/admin/transactions?${params.toString()}`,
      );
    },
    staleTime: 30_000,
  });

  const transactions = query.data?.data ?? [];
  const meta = query.data?.meta ?? { page: 1, limit: 20, total: 0 };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: TX_KEY });
  };

  return {
    transactions,
    meta,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error as Error | null,
    refresh,
  };
}
