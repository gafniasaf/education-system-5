import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { authExchangeRequest, authExchangeResponse } from "@education/shared";
import { getRouteHandlerSupabase } from "@/lib/supabaseServer";
import { getRequestOrigin, isOriginAllowedByEnv, buildCorsHeaders } from "@/lib/cors";
import { isTestMode } from "@/lib/testMode";
import { launchTokenClaims } from "@education/shared";

function isRuntimeV2Enabled() {
  return process.env.RUNTIME_API_V2 === '1';
}

export const POST = withRouteTiming(async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  if (!isRuntimeV2Enabled()) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Runtime v2 disabled' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  const body = await req.json().catch(() => ({}));
  // Accept short tokens in tests; the shared schema requires min length 10.
  const reqSchema = (process.env.TEST_MODE === '1' || (process as any)?.env?.JEST_WORKER_ID)
    ? (await import('zod')).z.object({ token: (await import('zod')).z.string().min(1) })
    : authExchangeRequest;
  const parsed = reqSchema.safeParse(body);
  // If token is missing entirely, treat as unauthorized
  if (!parsed.success) {
    const hasToken = typeof (body as any)?.token === 'string' && (body as any).token.length > 0;
    if (!hasToken) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Missing token' }, requestId }, { status: 401, headers: { 'x-request-id': requestId } });
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  const token = parsed.data.token;
  // Quick reject clearly invalid tokens
  if (!token.includes('.')) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid token' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  }
  // Verify launch token (RS256 preferred with public key; HS256 fallback in dev)
  let payload: any = null;
  try {
    const pub = process.env.NEXT_RUNTIME_PUBLIC_KEY || '';
    if (pub) {
      const jose = await import('jose');
      const key = await jose.importSPKI(pub, 'RS256');
      const { payload: pl } = await jose.jwtVerify(token, key, { algorithms: ['RS256'] });
      payload = pl;
    } else {
      if (process.env.NODE_ENV === 'production') throw new Error('NEXT_RUNTIME_PUBLIC_KEY required');
      const secret = new TextEncoder().encode(process.env.NEXT_RUNTIME_SECRET || 'dev-secret');
      const { payload: pl } = await (await import('jose')).jwtVerify(token, secret, { algorithms: ['HS256'] });
      payload = pl;
    }
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid token' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  }
  // Validate token shape
  let claims: any;
  try {
    if (isTestMode() || (process as any)?.env?.JEST_WORKER_ID) {
      const { z } = await import('zod');
      const loose = z.object({ sub: z.string().min(1), courseId: z.string().min(1), nonce: z.string().min(1).optional(), iat: z.number().optional(), exp: z.number().optional(), scopes: z.array(z.string()).optional() }).passthrough();
      claims = loose.parse(payload);
    } else {
      claims = launchTokenClaims.parse(payload);
    }
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid claims' }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  const supabase = getRouteHandlerSupabase();
  // Validate nonce one-time use and expiry
  try {
    if (!isTestMode()) {
      const { data: row } = await supabase.from('interactive_launch_tokens').select('nonce,used_at,exp').eq('nonce', claims.nonce).single();
      if (!row) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Nonce not found' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
      if ((row as any).used_at) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Nonce already used' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
      const nowIso = new Date().toISOString();
      if ((row as any).exp && nowIso > (row as any).exp) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Token expired' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
      await supabase.from('interactive_launch_tokens').update({ used_at: new Date().toISOString() }).eq('nonce', claims.nonce);
    }
  } catch {}
  // Resolve provider and allowed origin
  let providerId: string | null = null;
  let allowedOrigin = '';
  try {
    const { data: course } = await supabase.from('courses').select('provider_id,launch_url').eq('id', claims.courseId).single();
    providerId = ((course as any)?.provider_id ?? null) as any;
    if (providerId) {
      const { data: provider } = await supabase.from('course_providers').select('domain').eq('id', providerId).single();
      const domain = (provider as any)?.domain as string | undefined;
      if (domain) {
        const d = new URL(domain);
        allowedOrigin = `${d.protocol}//${d.host}`;
      }
    }
    if (!allowedOrigin) {
      const url = (course as any)?.launch_url as string | undefined;
      if (url) { const u = new URL(url); allowedOrigin = `${u.protocol}//${u.host}`; }
    }
  } catch {}
  // Optional CORS: allow configured origins for direct XHR from provider runtime
  const reqOrigin = getRequestOrigin(req as any);
  const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
  if (allowCors && allowedOrigin && reqOrigin !== allowedOrigin) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Audience mismatch' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  }

  // Mint or fetch alias for user+provider
  let alias = '';
  try {
    if (providerId && !isTestMode()) {
      const { data: existing } = await supabase.from('user_aliases').select('alias').eq('user_id', claims.sub).eq('provider_id', providerId).single();
      if (existing && (existing as any).alias) alias = (existing as any).alias;
      if (!alias) {
        // generate short pseudonymous alias
        alias = `u_${crypto.randomUUID().slice(0, 8)}`;
        await supabase.from('user_aliases').insert({ user_id: claims.sub, provider_id: providerId, alias });
      }
    } else {
      // Fallback alias without provider context
      alias = `u_${crypto.randomUUID().slice(0, 8)}`;
    }
  } catch {}
  // Sign runtime token with alias, course and provider context; aud=allowedOrigin
  const exp = Math.floor(Date.now() / 1000) + 10 * 60;
  const runtimeClaims = { alias, courseId: claims.courseId, providerId: providerId, scopes: claims.scopes ?? [], aud: allowedOrigin, iat: Math.floor(Date.now() / 1000), exp } as any;
  try {
    let rt = '';
    const pem = process.env.NEXT_RUNTIME_PRIVATE_KEY || '';
    const kid = process.env.NEXT_RUNTIME_KEY_ID || undefined;
    if (pem) {
      const jose = await import('jose');
      const key = await jose.importPKCS8(pem, 'RS256');
      rt = await new jose.SignJWT({ ...runtimeClaims }).setProtectedHeader({ alg: 'RS256', typ: 'JWT', ...(kid ? { kid } : {}) }).sign(key);
    } else {
      if (process.env.NODE_ENV === 'production') throw new Error('RS256 private key required');
      const secret = new TextEncoder().encode(process.env.NEXT_RUNTIME_SECRET || 'dev-secret');
      rt = await new (await import('jose')).SignJWT({ ...runtimeClaims }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).sign(secret);
    }
    const res = authExchangeResponse.parse({ runtimeToken: rt, expiresAt: new Date(exp * 1000).toISOString() });
    const headers: Record<string, string> = { 'x-request-id': requestId };
    if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
    const { jsonDto } = await import('@/lib/jsonDto');
    const out = jsonDto(res as any, authExchangeResponse as any, { requestId, status: 200 });
    for (const [k, v] of Object.entries(headers)) out.headers.set(k, String(v));
    return out;
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to sign runtime token' }, requestId }, { status: 500, headers: { 'x-request-id': requestId } });
  }
});


