// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Edge Proxy (Admin Dashboard)
// Optimistic route protection: checks cookie presence at the edge.
// Full JWT validation + role check happens client-side in AuthProvider.
// Next.js 16+ uses "proxy" instead of "middleware".
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

const TOKEN_COOKIE = "memoir_admin_token";

/** Routes that don't require authentication */
const PUBLIC_ROUTES = ["/login"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has(TOKEN_COOKIE);

  // Unauthenticated user trying to access protected route → redirect to /login
  if (!hasToken && !isPublicRoute(pathname)) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user trying to access login → redirect to dashboard
  if (hasToken && isPublicRoute(pathname)) {
    const dashboardUrl = new URL("/", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Only run middleware on app routes (skip API proxy, static assets, images)
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$|.*\\.ico$).*)"],
};
