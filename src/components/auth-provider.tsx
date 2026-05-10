"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Auth Context Provider (Admin Dashboard)
// Provides auth state (user) to the entire app.
// Routes: /login (public), everything else (auth + role=ADMIN).
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  getToken,
  removeToken,
  refreshAccessToken,
  TOKEN_REMOVED_EVENT,
} from "@/lib/api";
import { login as apiLogin, logout as apiLogout } from "@/lib/auth-api";
import type { AuthUser, LoginRequest } from "@/lib/types";

// ── Context types ────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | null>(null);

// ── Helper: decode JWT payload (without verification — just for reading) ─────

function decodeTokenPayload(token: string): AuthUser | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    if (!payload.id || !payload.role) return null;
    return {
      id: payload.id,
      email: payload.email ?? "",
      role: payload.role,
    };
  } catch {
    return null;
  }
}

// ── Route classification ─────────────────────────────────────────────────────

/** Routes that don't require any authentication */
const PUBLIC_ROUTES = ["/login"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

// ── Provider component ───────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // ── Initialize: check token on mount ─────────────────────────────────────

  useEffect(() => {
    async function init() {
      // After page refresh, in-memory token is empty.
      // On public routes (e.g. /login after logout), skip refresh entirely —
      // avoids a wasted 401 call.
      let token = getToken();
      if (!token) {
        if (isPublicRoute(window.location.pathname)) {
          setIsLoading(false);
          return;
        }
        token = await refreshAccessToken();
        if (!token) {
          // No valid session — hard-redirect so the page runs fresh.
          window.location.href = "/login";
          return;
        }
      }

      // Decode user from token
      const decoded = decodeTokenPayload(token);
      if (!decoded) {
        removeToken();
        if (!isPublicRoute(window.location.pathname)) {
          window.location.href = "/login";
        } else {
          setIsLoading(false);
        }
        return;
      }

      // Role guard: only admin allowed
      if (decoded.role !== "ADMIN") {
        removeToken();
        setIsLoading(false);
        if (!isPublicRoute(window.location.pathname)) {
          router.replace("/login");
        }
        return;
      }

      setUser(decoded);
      setIsLoading(false);

      // Redirect authenticated admin away from login
      if (isPublicRoute(window.location.pathname)) {
        router.replace("/");
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Force-logout on token removal (e.g. 401 + refresh failure) ──────────

  useEffect(() => {
    const handleTokenRemoved = () => {
      setUser(null);
      // isAuthenticated becomes false → route protection effect redirects to /login
    };

    window.addEventListener(TOKEN_REMOVED_EVENT, handleTokenRemoved);
    return () =>
      window.removeEventListener(TOKEN_REMOVED_EVENT, handleTokenRemoved);
  }, []);

  // ── Route protection on navigation ───────────────────────────────────────

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isPublicRoute(pathname)) {
      router.replace("/login");
    }

    if (isAuthenticated && isPublicRoute(pathname)) {
      router.replace("/");
    }
  }, [pathname, isAuthenticated, isLoading, router]);

  // ── Login ────────────────────────────────────────────────────────────────

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const { user: loggedInUser } = await apiLogin(credentials);

      // Role guard: reject non-admin
      if (loggedInUser.role !== "ADMIN") {
        removeToken();
        throw new Error("Akses tidak diizinkan. Hanya admin yang bisa login.");
      }

      setUser(loggedInUser);
      router.replace("/");
    },
    [router],
  );

  // ── Logout ───────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    // 1. Show loading spinner (prevents dashboard crash with null state)
    setIsLoading(true);
    // 2. Clear cookie + delete token from DB via Next.js route handler
    try {
      await apiLogout();
    } catch {
      // Same-origin call — failure extremely unlikely
    }
    // 3. Clear in-memory token so no API calls can be made
    removeToken();
    // 4. Full page reload to /login — resets all in-memory state, query cache
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
