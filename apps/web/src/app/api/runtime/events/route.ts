import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { getCurrentUserInRoute, getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { runtimeEvent } from "@education/shared";
import { getRequestLogger } from "@/lib/logger";
import { isInteractiveRuntimeEnabled } from "@/lib/testMode";
// Note: rate-limit module is dynamically imported inside the handler to allow
// unit tests to mock it after the route module has been loaded.
import { getRequestOrigin, isOriginAllowedByEnv, buildCorsHeaders } from "@/lib/cors";
import { isRuntimeV2Enabled } from "@/lib/runtime";
import { verifyRuntimeAuthorization } from "@/lib/runtimeAuth";

// gated via shared helper

export const POST = withRouteTiming(async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  // Runtime v2 bearer-auth path (primary when enabled)
  if (isRuntimeV2Enabled()) {
    const vr = verifyRuntimeAuthorization(req, []); // scopes validated after parsing event type
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
    const parsed = runtimeEvent.safeParse(body?.event ?? body);
    if (!parsed.success) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
    const ev = parsed.data;
    const supabase = getRouteHandlerSupabase();
    // Scope enforcement from runtime token claims (scopes array)
    try {
      const scopes: string[] = Array.isArray((claims as any)?.scopes) ? (claims as any).scopes : [];
      const evType = (ev as any).type as string;
      if (evType === 'course.progress' && !scopes.includes('progress.write')) {
        const reqOrigin = getRequestOrigin(req as any);
        const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
        const headers: Record<string, string> = { 'x-request-id': requestId };
        if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Missing scope progress.write' }, requestId }, { status: 403, headers });
      }
      if (evType === 'course.attempt.completed' && !scopes.includes('attempts.write')) {
        const reqOrigin = getRequestOrigin(req as any);
        const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
        const headers: Record<string, string> = { 'x-request-id': requestId };
        if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Missing scope attempts.write' }, requestId }, { status: 403, headers });
      }
    } catch {}
    // Rate limit per alias+course
    const alias = String((claims as any)?.alias || '');
    const courseId = String((claims as any)?.courseId || '');
    const rlKey = `evt:${courseId}:${alias || 'anon'}`;
    // Use a relative path so Jest can mock this module in unit tests
    const { checkRateLimit } = await import("../../../../lib/rateLimit");
    const limit = Number(process.env.RUNTIME_EVENTS_LIMIT || 1000000);
    const rl = checkRateLimit(rlKey, limit, Number(process.env.RUNTIME_EVENTS_WINDOW_MS || 60000));
    if (!rl.allowed) {
      const retry = Math.max(0, rl.resetAt - Date.now());
      const reqOrigin = getRequestOrigin(req as any);
      const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
      const headers: Record<string, string> = {
        'x-request-id': requestId,
        'retry-after': String(Math.ceil(retry / 1000)),
        'x-rate-limit-remaining': String(rl.remaining),
        'x-rate-limit-reset': String(Math.ceil(rl.resetAt / 1000))
      };
      if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
      return NextResponse.json(
        { error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId },
        { status: 429, headers }
      );
    }
    // Persist minimal signals; ignore failures (RLS) as best-effort telemetry
    try {
      if (ev.type === 'course.attempt.completed') {
        await supabase.from('interactive_attempts').insert({ course_id: courseId, user_id: null, runtime_attempt_id: (ev as any).runtimeAttemptId ?? null, score: (ev as any).score, max: (ev as any).max, passed: (ev as any).passed });
      } else if (ev.type === 'course.progress') {
        await supabase.from('interactive_attempts').insert({ course_id: courseId, user_id: null, pct: Math.round((ev as any).pct), topic: (ev as any).topic ?? null });
      }
      await supabase.from('course_events').insert({ course_id: courseId, user_id: null, type: `runtime.${(ev as any).type}`, payload: ev as any, request_id: requestId });
    } catch {}
    const reqOrigin = getRequestOrigin(req as any);
    const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
    const headers: Record<string, string> = { 'x-request-id': requestId };
    if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
    const { jsonDto } = await import('@/lib/jsonDto');
    const { z } = await import('zod');
    const res = jsonDto({ ok: true } as any, z.object({ ok: z.boolean() }) as any, { requestId, status: 201 });
    for (const [k, v] of Object.entries(headers)) res.headers.set(k, String(v));
    return res;
  }

  // Fallback: legacy interactive runtime path (platform-auth, used when v2 disabled)
  const user = await getCurrentUserInRoute(req);
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  const body = await req.json().catch(() => ({}));
  const { courseId, event, token } = body || {};
  if (!courseId) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'courseId required' }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  if (!isInteractiveRuntimeEnabled()) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Interactive runtime disabled' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  const rlKey = `evt:${courseId}:${user?.id ?? 'anon'}`;
  const rl = checkRateLimit(rlKey, Number(process.env.RUNTIME_EVENTS_LIMIT || 60), Number(process.env.RUNTIME_EVENTS_WINDOW_MS || 60000));
  if (!rl.allowed) {
    const retry = Math.max(0, rl.resetAt - Date.now());
    return NextResponse.json(
      { error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId },
      {
        status: 429,
        headers: {
          'x-request-id': requestId,
          'retry-after': String(Math.ceil(retry / 1000)),
          'x-rate-limit-remaining': String(rl.remaining),
          'x-rate-limit-reset': String(Math.ceil(rl.resetAt / 1000))
        }
      }
    );
  }
  const parsed = runtimeEvent.safeParse(event);
  if (!parsed.success) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  const supabase = getRouteHandlerSupabase();
  const log = getRequestLogger(requestId);
  try {
    const { data: courseRow } = await supabase.from('courses').select('scopes').eq('id', courseId).single();
    const scopes: string[] = (courseRow as any)?.scopes ?? [];
    const evType = (parsed.data as any).type as string;
    if (evType === 'course.progress' && !scopes.includes('progress.write')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Missing scope progress.write' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
    }
    if (evType === 'course.attempt.completed' && !scopes.includes('attempts.write')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Missing scope attempts.write' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
    }
  } catch {}
  try {
    if (typeof token === 'string' && token.includes('.')) {
      const payload = token.split('.')[1];
      const raw = JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as any;
      const nonce = raw?.nonce as string | undefined;
      const exp = raw?.exp ? new Date(raw.exp * 1000).toISOString() : undefined;
      if (nonce) {
        const { data: row } = await supabase.from('interactive_launch_tokens').select('nonce,used_at,exp').eq('nonce', nonce).single();
        if (!row) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid token' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
        if ((row as any).used_at) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Token already used' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
        const nowIso = new Date().toISOString();
        if ((row as any).exp && nowIso > (row as any).exp) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Token expired' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
        await supabase.from('interactive_launch_tokens').update({ used_at: new Date().toISOString() }).eq('nonce', nonce);
      }
    }
  } catch {}
  const ev = parsed.data;
  try { log.info({ courseId, type: ev.type }, 'runtime_event_received'); } catch {}
  let row: any = null;
  if (ev.type === 'course.attempt.completed') {
    const { data, error } = await supabase.from('interactive_attempts').insert({ course_id: courseId, user_id: user.id, runtime_attempt_id: (ev as any).runtimeAttemptId ?? null, score: (ev as any).score, max: (ev as any).max, passed: (ev as any).passed }).select().single();
    if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: (error as any).message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    row = data;
  } else if (ev.type === 'course.progress') {
    const { data, error } = await supabase.from('interactive_attempts').insert({ course_id: courseId, user_id: user.id, pct: Math.round((ev as any).pct), topic: (ev as any).topic ?? null }).select().single();
    if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: (error as any).message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
    row = data;
  } else {
    row = { ok: true };
  }
  try {
    const { runtimeAttemptDto } = await import("@education/shared");
    const { jsonDto } = await import('@/lib/jsonDto');
    if ((row as any)?.ok === true) {
      const { z } = await import('zod');
      return jsonDto(row as any, z.object({ ok: z.boolean() }) as any, { requestId, status: 201 });
    }
    return jsonDto(row as any, runtimeAttemptDto as any, { requestId, status: 201 });
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid outcome shape' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  }
});

export async function OPTIONS(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const origin = getRequestOrigin(req as any);
  const headers: Record<string, string> = { 'x-request-id': requestId, 'vary': 'Origin' };
  if (origin && isOriginAllowedByEnv(origin)) Object.assign(headers, buildCorsHeaders(origin));
  return new Response(null, { status: 204, headers });
}


