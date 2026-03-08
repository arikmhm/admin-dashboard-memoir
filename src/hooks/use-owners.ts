"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Owner Management Hooks
// TanStack Query hooks for admin owner CRUD operations
// Endpoints: GET /admin/owners, POST /admin/owners, PATCH /admin/owners/:id
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiSuccessResponse } from "@/lib/api";
import type { Owner, CreateOwnerRequest } from "@/lib/types";

// ── Query keys ───────────────────────────────────────────────────────────────

const OWNERS_KEY = ["/admin/owners"] as const;

function ownerDetailKey(id: string) {
  return ["/admin/owners", id] as const;
}

// ── Owner List Hook ──────────────────────────────────────────────────────────

interface UseOwnersOptions {
  includeDeleted?: boolean;
}

export function useOwners(options?: UseOwnersOptions) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...OWNERS_KEY, { includeDeleted: options?.includeDeleted }],
    queryFn: () => {
      const params = options?.includeDeleted ? "?includeDeleted=true" : "";
      return api.get<ApiSuccessResponse<Owner[]>>(`/admin/owners${params}`);
    },
    staleTime: 60_000,
  });

  const owners = query.data?.data ?? [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: OWNERS_KEY });
  };

  return {
    owners,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refresh,
  };
}

// ── Create Owner Mutation ────────────────────────────────────────────────────

export function useCreateOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOwnerRequest) =>
      api.post<ApiSuccessResponse<Owner>>("/admin/owners", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OWNERS_KEY });
    },
  });
}

// ── Update Owner Mutation (soft-delete / restore / email change) ─────────────

interface UpdateOwnerData {
  id: string;
  email?: string;
  isActive?: boolean;
}

export function useUpdateOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateOwnerData) =>
      api.patch<ApiSuccessResponse<Owner>>(`/admin/owners/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OWNERS_KEY });
    },
  });
}

// ── Owner Detail Hook ────────────────────────────────────────────────────────

export function useOwnerDetail(id: string) {
  const query = useQuery({
    queryKey: ownerDetailKey(id),
    queryFn: () => api.get<ApiSuccessResponse<Owner>>(`/admin/owners/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });

  return {
    owner: query.data?.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
