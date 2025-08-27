import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { checkpointSaveRequest } from "@education/shared";
import { getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { getRequestOrigin, isOriginAllowedByEnv, buildCorsHeaders } from "@/lib/cors";
import { isRuntimeV2Enabled } from "@/lib/runtime";
import { verifyRuntimeAuthorization } from "@/lib/runtimeAuth";
import { checkRateLimitAsync } from "@/lib/rateLimit";
import { incrCounter } from "@/lib/metrics";

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
  const parsed = checkpointSaveRequest.safeParse(body);
  if (!parsed.success) {
    const reqOrigin = getRequestOrigin(req as any);
    const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
    const headers: Record<string, string> = { 'x-request-id': requestId };
    if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message }, requestId }, { status: 400, headers });
  }
  // Size limits (e.g., 32KB max)
  const sizeBytes = Buffer.byteLength(JSON.stringify(parsed.data.state));
  const maxBytes = Number(process.env.RUNTIME_CHECKPOINT_MAX_BYTES || 32 * 1024);
  if (sizeBytes > maxBytes) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Checkpoint too large' }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  const alias = String((claims as any)?.alias || '');
  const courseId = String((claims as any)?.courseId || '');
  // Rate limit per alias+course
  try {
    const rl = await checkRateLimitAsync(`rt:ckpt:${courseId}:${alias}`, Number(process.env.RUNTIME_CHECKPOINT_LIMIT || 30), Number(process.env.RUNTIME_CHECKPOINT_WINDOW_MS || 60000));
    if (!rl.allowed) {
      try { incrCounter('rt.ckpt.rate_limit'); } catch {}
      const reqOrigin = getRequestOrigin(req as any);
      const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
      const headers: Record<string, string> = { 'x-request-id': requestId, 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)), 'x-rate-limit-remaining': String(rl.remaining), 'x-rate-limit-reset': String(Math.ceil(rl.resetAt / 1000)) };
      if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
      return NextResponse.json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId }, { status: 429, headers });
    }
  } catch {}
  const supabase = getRouteHandlerSupabase();
  try {
    // Upsert by (course_id, alias, key)
    const { data } = await supabase.from('runtime_checkpoints').select('id').eq('course_id', courseId).eq('alias', alias).eq('key', parsed.data.key).single();
    if (data?.id) {
      await supabase.from('runtime_checkpoints').update({ state: parsed.data.state, updated_at: new Date().toISOString() }).eq('id', (data as any).id);
    } else {
      await supabase.from('runtime_checkpoints').insert({ course_id: courseId, alias, key: parsed.data.key, state: parsed.data.state });
    }
  } catch {}
  const reqOrigin = getRequestOrigin(req as any);
  const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
  const headers: Record<string, string> = { 'x-request-id': requestId };
  if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
  try { incrCounter('rt.ckpt.ok'); } catch {}
  const { jsonDto } = await import('@/lib/jsonDto');
  const { z } = await import('zod');
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


