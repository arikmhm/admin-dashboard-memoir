import { NextResponse } from "next/server";

/**
 * Health check endpoint — used for readiness/liveness probes.
 * GET /api/health → { status: "ok", timestamp: "..." }
 */
export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
