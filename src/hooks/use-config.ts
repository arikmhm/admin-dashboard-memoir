"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Platform Config Hooks
// TanStack Query hooks for admin platform config
// Endpoints: GET /admin/platform-config, PATCH /admin/platform-config/:id
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiSuccessResponse } from "@/lib/api";
import type { PlatformConfig, UpdateConfigRequest } from "@/lib/types";

// ── Query keys ───────────────────────────────────────────────────────────────

const CONFIG_KEY = ["/admin/platform-config"] as const;

// ── Config List Hook ─────────────────────────────────────────────────────────

export function useConfig() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CONFIG_KEY,
    queryFn: () =>
      api.get<ApiSuccessResponse<PlatformConfig[]>>("/admin/platform-config"),
    staleTime: 60_000,
  });

  const configs = query.data?.data ?? [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: CONFIG_KEY });
  };

  return {
    configs,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refresh,
  };
}

// ── Update Config Mutation ───────────────────────────────────────────────────

interface UpdateConfigData extends UpdateConfigRequest {
  id: string;
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateConfigData) =>
      api.patch<ApiSuccessResponse<PlatformConfig>>(
        `/admin/platform-config/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIG_KEY });
    },
  });
}
