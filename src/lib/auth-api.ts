// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Auth API (Admin)
// Authentication-related API calls (login, logout)
// ─────────────────────────────────────────────────────────────────────────────

import { api, setToken, removeToken, getToken } from "./api";
import type { LoginRequest, LoginResponse, AuthUser } from "./types";

/**
 * Login with email & password.
 * Stores accessToken in localStorage on success.
 * Backend also sends refresh_token via Set-Cookie (HttpOnly).
 */
export async function login(
  credentials: LoginRequest,
): Promise<{ accessToken: string; user: AuthUser }> {
  const res = await api.post<LoginResponse>("/auth/login", credentials);
  setToken(res.data.accessToken);
  return res.data;
}

/**
 * Logout: revoke refresh token via API, then clear local token.
 * POST /auth/logout clears the refresh_token cookie server-side.
 */
export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Ignore errors — we're logging out regardless
  } finally {
    removeToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}

/**
 * Check if user has a valid token stored.
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}
