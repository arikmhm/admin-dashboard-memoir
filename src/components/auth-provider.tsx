"use client";

// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Auth Context Provider (Admin Dashboard)
// Provides auth state (user) to the entire app.
// Routes: /login (public), everything else (auth + role=platform_admin).
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
import { getToken, removeToken } from "@/lib/api";
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
    return {
      id: payload.id ?? payload.sub,
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
      const token = getToken();

      if (!token) {
        setIsLoading(false);
        if (!isPublicRoute(pathname)) {
          router.replace("/login");
        }
        return;
      }

      // Decode user from token
      const decoded = decodeTokenPayload(token);
      if (!decoded) {
        removeToken();
        setIsLoading(false);
        if (!isPublicRoute(pathname)) {
          router.replace("/login");
        }
        return;
      }

      // Role guard: only platform_admin allowed
      if (decoded.role !== "platform_admin") {
        removeToken();
        setIsLoading(false);
        if (!isPublicRoute(pathname)) {
          router.replace("/login");
        }
        return;
      }

      setUser(decoded);
      setIsLoading(false);

      // Redirect authenticated admin away from login
      if (isPublicRoute(pathname)) {
        router.replace("/");
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (loggedInUser.role !== "platform_admin") {
        removeToken();
        throw new Error("Akses tidak diizinkan. Hanya admin yang bisa login.");
      }

      setUser(loggedInUser);
      router.replace("/");
    },
    [router],
  );

  // ── Logout ───────────────────────────────────────────────────────────────

  const logout = useCallback(() => {
    setUser(null);
    apiLogout();
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
