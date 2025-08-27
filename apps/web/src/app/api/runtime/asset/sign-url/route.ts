import { NextRequest, NextResponse } from "next/server";
import { withRouteTiming } from "@/server/withRouteTiming";
import { assetSignUrlRequest } from "@education/shared";
import { presignUploadUrl } from "@/lib/files";
import { getRequestOrigin, isOriginAllowedByEnv, buildCorsHeaders } from "@/lib/cors";
import { isRuntimeV2Enabled } from "@/lib/runtime";
import { verifyRuntimeAuthorization } from "@/lib/runtimeAuth";
import { checkRateLimitAsync } from "@/lib/rateLimit";
import { incrCounter } from "@/lib/metrics";
import { getAllowedUploadMime } from "@/lib/mime";
import { jsonDto } from "@/lib/jsonDto";
import { isTestMode } from "@/lib/testMode";
import { z } from "zod";

// gated via shared helper

export const POST = withRouteTiming(async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  if (!isRuntimeV2Enabled()) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Runtime v2 disabled' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
  const vr = verifyRuntimeAuthorization(req, ['files.write']);
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
  const parsed = assetSignUrlRequest.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: parsed.error.message }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  // Rate limit per alias+course
  try {
    const alias = String((claims as any)?.alias || '');
    const courseId = String((claims as any)?.courseId || '');
    const rl = await checkRateLimitAsync(`rt:asset:${courseId}:${alias}`, Number(process.env.RUNTIME_ASSET_LIMIT || 20), Number(process.env.RUNTIME_ASSET_WINDOW_MS || 60000));
    if (!rl.allowed) {
      try { incrCounter('rt.asset.rate_limit'); } catch {}
      const reqOrigin = getRequestOrigin(req as any);
      const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
      const headers: Record<string, string> = { 'x-request-id': requestId, 'retry-after': String(Math.ceil((rl.resetAt - Date.now()) / 1000)), 'x-rate-limit-remaining': String(rl.remaining), 'x-rate-limit-reset': String(Math.ceil(rl.resetAt / 1000)) };
      if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
      return NextResponse.json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId }, { status: 429, headers });
    }
  } catch {}
  // Content-type allow-list checks
  const allowList = getAllowedUploadMime();
  if (!allowList.includes(parsed.data.content_type)) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Unsupported content type' }, requestId }, { status: 400, headers: { 'x-request-id': requestId } });
  }
  const courseId = String((claims as any)?.courseId || '');
  const bucket = process.env.NEXT_PUBLIC_UPLOAD_BUCKET || 'public';
  const dev = process.env.NODE_ENV !== 'production' ? (process.env.DEV_ID || '') : '';
  const prefix = dev ? `${dev}/` : '';
  const objectKey = `${prefix}runtime/${courseId}/${crypto.randomUUID()}`;
  // In unit tests, avoid depending on Supabase storage and allow relative URLs
  if (isTestMode()) {
    const reqOrigin = getRequestOrigin(req as any);
    const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
    const headers: Record<string, string> = { 'x-request-id': requestId };
    if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
    try { incrCounter('rt.asset.ok'); } catch {}
    const dto = z.object({ url: z.string().min(1), method: z.enum(['PUT','POST','GET']), headers: z.record(z.any()), key: z.string().min(1) });
    const res = jsonDto({ url: `/test-upload/${encodeURIComponent(objectKey)}`, method: 'PUT', headers: { 'content-type': parsed.data.content_type }, key: objectKey } as any, dto as any, { requestId, status: 200 });
    for (const [k, v] of Object.entries(headers)) res.headers.set(k, String(v));
    return res;
  }
  const signed = await presignUploadUrl({ bucket, objectKey, contentType: parsed.data.content_type, expiresIn: 600 });
  const reqOrigin = getRequestOrigin(req as any);
  const allowCors = !!reqOrigin && isOriginAllowedByEnv(reqOrigin);
  const headers: Record<string, string> = { 'x-request-id': requestId };
  if (allowCors) Object.assign(headers, buildCorsHeaders(reqOrigin));
  try { incrCounter('rt.asset.ok'); } catch {}
  const urlSchema = isTestMode() ? z.string().min(1) : z.string().url();
  const dto = z.object({ url: urlSchema, method: z.enum(['PUT','POST','GET']), headers: z.record(z.any()), key: z.string().min(1) });
  const urlOut = (signed as any).url || (signed as any).signedUrl || '';
  const methodOut = (signed as any).method || 'PUT';
  const headersOut = (signed as any).headers || { 'content-type': parsed.data.content_type };
  const res = jsonDto({ url: urlOut, method: methodOut, headers: headersOut, key: objectKey } as any, dto as any, { requestId, status: 200 });
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, String(v));
  return res;
});

export async function OPTIONS(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const origin = getRequestOrigin(req as any);
  const headers: Record<string, string> = { 'x-request-id': requestId, 'vary': 'Origin' };
  if (origin && isOriginAllowedByEnv(origin)) Object.assign(headers, buildCorsHeaders(origin));
  return new Response(null, { status: 204, headers });
}


