// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Edge Proxy (Admin Dashboard)
// Optimistic route protection: checks cookie presence at the edge.
// Full JWT validation + role check happens client-side in AuthProvider.
// Next.js 16+ uses "proxy" instead of "middleware".
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("refresh_token");
  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );

  // Unauthenticated user trying to access protected route → redirect to /login
  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated user trying to access login → redirect to dashboard
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Only run proxy on app routes (skip API proxy, static assets, images)
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)",
  ],
};
