// ─────────────────────────────────────────────────────────────────────────────
// memoir. — API Client
// Centralized fetch wrapper with JWT auth, token refresh & error handling
// ─────────────────────────────────────────────────────────────────────────────

// Use relative path so requests go through Next.js rewrite proxy (avoids CORS)
const API_BASE_URL = "/api/v1";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiErrorResponse {
  error: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Token management (in-memory) ─────────────────────────────────────────────

let accessToken: string | null = null;

export function getToken(): string | null {
  return accessToken;
}

export function setToken(token: string): void {
  accessToken = token;
}

/** Event name dispatched when token is forcibly removed (e.g. 401 + refresh fail). */
export const TOKEN_REMOVED_EVENT = "memoir:token-removed";

export function removeToken(): void {
  accessToken = null;
  if (typeof window === "undefined") return;
  // Notify AuthProvider so it can clear React state
  window.dispatchEvent(new Event(TOKEN_REMOVED_EVENT));
}

// ── Token refresh ────────────────────────────────────────────────────────────

let refreshPromise: Promise<string | null> | null = null;

/**
 * Attempt to refresh the access token using the HttpOnly refresh_token cookie.
 * Uses a shared promise to prevent concurrent refresh requests.
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) return null;

    const json = await res.json();
    const newToken: string | undefined = json?.data?.accessToken;

    if (newToken) {
      setToken(newToken);
      return newToken;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Core fetch ───────────────────────────────────────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // Handle 401 → try token refresh, then retry once
  if (res.status === 401) {
    // Auth endpoints: 401 means invalid credentials, not an expired session.
    // Skip token refresh and let the caller handle the error.
    const isAuthEndpoint = endpoint.startsWith("/auth/");

    if (!isAuthEndpoint && !_isRetry) {
      // Use shared promise to deduplicate concurrent refreshes
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;

      if (newToken) {
        // Retry the original request with the new token
        return apiFetch<T>(endpoint, options, true);
      }
    }

    if (!isAuthEndpoint) {
      // Refresh failed or already a retry → clear token.
      // AuthProvider listens for TOKEN_REMOVED_EVENT and handles
      // the SPA redirect to /login (no white-screen full reload).
      removeToken();
    }

    // Parse actual backend error response instead of hardcoding
    let errorData: ApiErrorResponse;
    try {
      errorData = await res.json();
    } catch {
      errorData = {
        error: "UNAUTHORIZED",
        message: "Sesi berakhir, silakan login kembali",
      };
    }

    throw new ApiError(
      res.status,
      errorData.error ?? "UNAUTHORIZED",
      errorData.message ?? "Sesi berakhir, silakan login kembali",
    );
  }

  if (!res.ok) {
    let errorData: ApiErrorResponse;
    try {
      errorData = await res.json();
    } catch {
      errorData = {
        error: "UNKNOWN_ERROR",
        message: "Terjadi kesalahan, coba lagi nanti",
      };
    }

    throw new ApiError(res.status, errorData.error, errorData.message);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// ── HTTP methods ─────────────────────────────────────────────────────────────

export const api = {
  get<T>(endpoint: string): Promise<T> {
    return apiFetch<T>(endpoint, { method: "GET" });
  },

  post<T>(endpoint: string, body?: unknown): Promise<T> {
    return apiFetch<T>(endpoint, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return apiFetch<T>(endpoint, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(endpoint: string): Promise<T> {
    return apiFetch<T>(endpoint, {
      method: "DELETE",
      body: JSON.stringify({}),
    });
  },
};
