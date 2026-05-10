// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Auth API (Admin)
// Authentication-related API calls (login, logout)
// ─────────────────────────────────────────────────────────────────────────────

import { api, setToken } from "./api";
import type { LoginRequest, LoginResponse, AuthUser } from "./types";

/**
 * Login with email & password.
 * Stores accessToken in memory on success.
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
 * Server-side logout via Next.js route handler.
 * Clears HttpOnly cookie at same origin (guaranteed) and deletes token from DB.
 *
 * Always treats as success — logout is best-effort.
 * Any errors are ignored; caller will still clear token and redirect.
 */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/logout", { method: "POST" });
  } catch (err) {
    console.warn("[logout] API call failed:", err);
  }
}

