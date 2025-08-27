import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { getCurrentUserInRoute } from "@/lib/supabaseServer";
import { jsonDto } from "@/lib/jsonDto";
import { z } from "zod";
import { isTestMode } from "@/lib/testMode";
import { listTestFeatureFlags, setTestFeatureFlag } from "@/lib/testStore";

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  if (!isTestMode()) return NextResponse.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Prod not implemented' }, requestId }, { status: 501, headers: { 'x-request-id': requestId } });
  const flags = listTestFeatureFlags();
  const dto = z.record(z.boolean());
  return jsonDto(flags as any, dto as any, { requestId, status: 200 });
});

export const PATCH = withRouteTiming(async function PATCH(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  if (!isTestMode()) return NextResponse.json({ error: { code: 'NOT_IMPLEMENTED', message: 'Prod not implemented' }, requestId }, { status: 501, headers: { 'x-request-id': requestId } });
  const body = await req.json().catch(() => ({}));
  const key = String((body as any).key || '').trim();
  const value = typeof (body as any).value === 'boolean' ? (body as any).value : String((body as any).value).toLowerCase() === 'true';
  if (!key) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'key is required' }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  setTestFeatureFlag(key, value);
  const out = listTestFeatureFlags();
  const dto2 = z.record(z.boolean());
  return jsonDto(out as any, dto2 as any, { requestId, status: 200 });
});

export const dynamic = 'force-dynamic';


