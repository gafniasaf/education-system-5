import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { getCurrentUserInRoute, getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { checkRateLimitAsync } from "@/lib/rateLimit";
import { isTestMode } from "@/lib/testMode";
import { z } from "zod";
import { jsonDto } from "@/lib/jsonDto";
import { parseQuery } from "@/lib/zodQuery";

export const GET = withRouteTiming(async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const user = await getCurrentUserInRoute(req);
  const role = (user?.user_metadata as any)?.role ?? undefined;
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  if (role !== 'admin') return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admins only' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  // Per-user read rate limit to protect provider health endpoint (allow test-mode bypass for header checks test)
  try {
    const limit = Number(process.env.PROVIDER_HEALTH_LIMIT || 120);
    const windowMs = Number(process.env.PROVIDER_HEALTH_WINDOW_MS || 60000);
    const rl = await checkRateLimitAsync(`prov:health:${user.id}`, limit, windowMs);
    if (!rl.allowed) {
      const retry = Math.max(0, rl.resetAt - Date.now());
      return NextResponse.json(
        { error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId },
        { status: 429, headers: { 'x-request-id': requestId, 'retry-after': String(Math.ceil(retry / 1000)), 'x-rate-limit-remaining': String(rl.remaining), 'x-rate-limit-reset': String(Math.ceil(rl.resetAt / 1000)) } }
      );
    }
  } catch {}

  const qSchema = z.object({ id: z.string().uuid() }).strict();
  let q: { id: string };
  try { q = parseQuery(req, qSchema); } catch (e: any) { return NextResponse.json({ error: { code: 'BAD_REQUEST', message: e.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } }); }

  // In test mode, avoid DB/external calls and return a deterministic response
  if (isTestMode()) {
    const output: any = {
      id: q.id,
      jwks_url: 'https://example.com/.well-known/jwks.json',
      domain: 'https://example.com',
      jwks: { ok: true, test: true },
      domainCheck: { ok: true, test: true },
      cached: false
    };
    const dto = z.object({ id: z.string().uuid(), jwks_url: z.string().url(), domain: z.string().url(), jwks: z.object({ ok: z.boolean(), test: z.boolean().optional(), error: z.string().optional() }), domainCheck: z.object({ ok: z.boolean(), test: z.boolean().optional(), error: z.string().optional() }), cached: z.boolean() });
    return jsonDto(output as any, dto as any, { requestId, status: 200 });
  }

  const supabase = getRouteHandlerSupabase();
  const { data: row, error } = await supabase.from('course_providers').select('id,name,jwks_url,domain').eq('id', q.id).single();
  if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  if (!row) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Provider not found' }, requestId }, { status: 404, headers: { 'x-request-id': requestId } });

  const output: any = { id: row.id, jwks_url: row.jwks_url, domain: row.domain, jwks: { ok: false }, domainCheck: { ok: false }, cached: false };

  // Check cache first
  try {
    const { data: cached } = await supabase.from('provider_health').select('*').eq('provider_id', row.id).single();
    const ttlMs = Number(process.env.PROVIDER_HEALTH_TTL_MS || 10 * 60 * 1000);
    if (cached && (Date.now() - new Date((cached as any).checked_at).getTime()) < ttlMs) {
      output.jwks = (cached as any).jwks_ok ? { ok: true } : { ok: false, error: (cached as any).jwks_error || undefined };
      output.domainCheck = (cached as any).domain_ok ? { ok: true } : { ok: false, error: (cached as any).domain_error || undefined };
      output.cached = true;
      const dto = z.object({ id: z.string().uuid(), jwks_url: z.string().url(), domain: z.string().url(), jwks: z.object({ ok: z.boolean(), error: z.string().nullable().optional() }), domainCheck: z.object({ ok: z.boolean(), error: z.string().nullable().optional() }), cached: z.boolean() });
      return jsonDto(output as any, dto as any, { requestId, status: 200 });
    }
  } catch {}

  // Validate JWKS URL with timeout
  try {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.PROVIDER_HEALTH_TIMEOUT_MS || 2000);
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(row.jwks_url, { headers: { 'accept': 'application/json' }, signal: controller.signal });
    clearTimeout(t);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    if (!json || !Array.isArray(json.keys)) throw new Error('Missing keys[]');
    output.jwks = { ok: true };
  } catch (e: any) {
    output.jwks = { ok: false, error: String(e?.message || e) };
    try { (await import('@/lib/metrics')).incrCounter('jwks.verify_fail'); } catch {}
  }

  // Validate domain reachability (best-effort) with timeout
  try {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.PROVIDER_HEALTH_TIMEOUT_MS || 2000);
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const u = new URL(row.domain);
    const resp = await fetch(u.toString(), { method: 'HEAD', signal: controller.signal });
    clearTimeout(t);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    output.domainCheck = { ok: true };
  } catch (e: any) {
    output.domainCheck = { ok: false, error: String(e?.message || e) };
  }

  // Upsert cache
  try {
    await supabase.from('provider_health').upsert({
      provider_id: row.id,
      jwks_ok: !!(output.jwks?.ok),
      domain_ok: !!(output.domainCheck?.ok),
      jwks_error: output.jwks?.ok ? null : String(output.jwks?.error || ''),
      domain_error: output.domainCheck?.ok ? null : String(output.domainCheck?.error || ''),
      checked_at: new Date().toISOString()
    }, { onConflict: 'provider_id' } as any);
  } catch {}

  const dto = z.object({ id: z.string().uuid(), jwks_url: z.string().url(), domain: z.string().url(), jwks: z.object({ ok: z.boolean(), error: z.string().optional() }), domainCheck: z.object({ ok: z.boolean(), error: z.string().optional() }), cached: z.boolean() });
  return jsonDto(output as any, dto as any, { requestId, status: 200 });
});

export const dynamic = 'force-dynamic';


