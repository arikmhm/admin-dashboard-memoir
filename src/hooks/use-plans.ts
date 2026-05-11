"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Subscription Plan Hooks
// TanStack Query hooks for admin subscription plan CRUD
// Endpoints: GET/POST /admin/subscription-plans, PATCH /admin/subscription-plans/:id
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiSuccessResponse } from "@/lib/api";
import type {
  SubscriptionPlan,
  CreatePlanRequest,
  UpdatePlanRequest,
} from "@/lib/types";

// ── Query keys ───────────────────────────────────────────────────────────────

const PLANS_KEY = ["/admin/subscription-plans"] as const;

// ── Plan List Hook ───────────────────────────────────────────────────────────

export function usePlans() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PLANS_KEY,
    queryFn: () =>
      api.get<ApiSuccessResponse<SubscriptionPlan[]>>(
        "/admin/subscription-plans",
      ),
    staleTime: 60_000,
  });

  const plans = query.data?.data ?? [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: PLANS_KEY });
  };

  return {
    plans,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error as Error | null,
    refresh,
  };
}

// ── Create Plan Mutation ─────────────────────────────────────────────────────

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlanRequest) =>
      api.post<ApiSuccessResponse<SubscriptionPlan>>(
        "/admin/subscription-plans",
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANS_KEY });
    },
  });
}

// ── Update Plan Mutation ─────────────────────────────────────────────────────

interface UpdatePlanData extends UpdatePlanRequest {
  id: string;
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdatePlanData) =>
      api.patch<ApiSuccessResponse<SubscriptionPlan>>(
        `/admin/subscription-plans/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLANS_KEY });
    },
  });
}
