import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { progressUpsertRequest } from "@education/shared";
import { getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { getRequestOrigin, isOriginAllowedByEnv, buildCorsHeaders } from "@/lib/cors";
import { isRuntimeV2Enabled } from "@/lib/runtime";
import { verifyRuntimeAuthorization } from "@/lib/runtimeAuth";
import { wasSeenAndRecordAsync } from "@/lib/idempotency";
import { checkRateLimitAsync } from "@/lib/rateLimit";
import { incrCounter } from "@/lib/metrics";
import { jsonDto } from "@/lib/jsonDto";
import { z } from "zod";

// gated via shared helper

export const POST = withRouteTiming(async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  if (!isRuntimeV2Enabled()) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Runtime v2 disabled' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  const vr = verifyRuntimeAuthorization(req, ['progress.write']);
  if ((vr as any)?.then) {
    const out = await (vr as any);
    if (!out.ok) return NextResponse.json({ error: { code: out.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: out.message }, requestId }, { status: out.status, headers: { 'x-request-id': requestId } });
    (global as any).__RT_CLAIMS__ = out.claims;
  } else if (!(vr as any).ok) {
    const out = vr as any;
    return NextResponse.json({ error: { code: out.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: out.message }, requestId }, { status: out.status, headers: { 'x-request-id': requestId } });
  } else {
    (global as any).__RT_CLAIMS__ = (vr as any).claims;
  }
  const claims = (global as any).__RT_CLAIMS__;
  const body = await req.json().catch(() => ({}));
  // Idempotency: if header provided and seen within TTL, short-circuit OK
  try {
    const idem = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key') || '';
    const ttl = Number(process.env.RUNTIME_IDEMPOTENCY_TTL_MS || 5 * 60 * 1000);
    if (idem && await wasSeenAndRecordAsync(`runtime:progress:${idem}`, ttl)) {
      const reqOrigin = getRequestOrigin(req as any);
      const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
      const headers: Record<string, string> = { 'x-request-id': requestId, 'idempotency-replayed': '1' };
      if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
      const res = jsonDto({ ok: true } as any, z.object({ ok: z.boolean() }) as any, { requestId, status: 200 });
      for (const [k, v] of Object.entries(headers)) res.headers.set(k, String(v));
      return res;
    }
  } catch {}
  const parsed = progressUpsertRequest.safeParse(body);
  if (!parsed.success) {
    const reqOrigin = getRequestOrigin(req as any);
    const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
    const headers: Record<string, string> = { 'x-request-id': requestId };
    if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message }, requestId }, { status: 400, headers });
  }
  // Rate limit per alias+course
  try {
    const alias = String((claims as any)?.alias || '');
    const courseId = String((claims as any)?.courseId || '');
    const rl = await checkRateLimitAsync(`rt:prog:${courseId}:${alias}`, Number(process.env.RUNTIME_PROGRESS_LIMIT || 60), Number(process.env.RUNTIME_PROGRESS_WINDOW_MS || 60000));
    if (!rl.allowed) {
      try { incrCounter('rt.progress.rate_limit'); } catch {}
      const reqOrigin = getRequestOrigin(req as any);
      const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
      const headers: Record<string, string> = { 'x-request-id': requestId, 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)), 'x-rate-limit-remaining': String(rl.remaining), 'x-rate-limit-reset': String(Math.ceil(rl.resetAt / 1000)) };
      if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
      return NextResponse.json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId }, { status: 429, headers });
    }
  } catch {}
  const supabase = getRouteHandlerSupabase();
  try {
    await supabase.from('interactive_attempts').insert({ course_id: (claims as any).courseId, user_id: null, pct: Math.round(parsed.data.pct), topic: parsed.data.topic ?? null });
    await supabase.from('course_events').insert({ course_id: (claims as any).courseId, user_id: null, type: 'runtime.progress', payload: { pct: parsed.data.pct, topic: parsed.data.topic ?? null } as any, request_id: requestId });
  } catch {}
  const reqOrigin = getRequestOrigin(req as any);
  const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
  const headers: Record<string, string> = { 'x-request-id': requestId };
  if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
  try { incrCounter('rt.progress.ok'); } catch {}
  const out = jsonDto({ ok: true } as any, z.object({ ok: z.boolean() }) as any, { requestId, status: 201 });
  for (const [k, v] of Object.entries(headers)) out.headers.set(k, String(v));
  return out;
});

export async function OPTIONS(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const origin = getRequestOrigin(req as any);
  const headers: Record<string, string> = { 'x-request-id': requestId, 'vary': 'Origin' };
  if (origin && isOriginAllowedByEnv(origin)) Object.assign(headers, buildCorsHeaders(origin));
  return new Response(null, { status: 204, headers });
}


