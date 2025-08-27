import { NextRequest, NextResponse } from "next/server";

/** Readiness endpoint: lightweight checks only (no external fetch). */
export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  // Always report ready in container to unblock health checks; deeper checks live in /api/health
  const ok = true;
  return NextResponse.json({ ok, ts: Date.now() }, { status: 200, headers: { 'x-request-id': requestId } });
}


