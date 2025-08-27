import { NextResponse, type NextRequest } from "next/server";

function generateId() {
  try {
    return (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function applySecurityHeaders(res: any, requestId: string, nonce: string) {
  try {
    const allowConnect = (process.env.RUNTIME_CORS_ALLOW || '').split(',').map(s => s.trim()).filter(Boolean);
    const connectSrc = [`'self'`, ...allowConnect].join(' ');
    let csp = process.env.NEXT_PUBLIC_CSP || `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src ${connectSrc}; frame-ancestors 'none'; frame-src 'self';`;
    res.headers.set('x-request-id', requestId);
    res.headers.set('Content-Security-Policy', csp);
    if (process.env.NODE_ENV === 'production') {
      res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Permissions-Policy', "geolocation=(), microphone=(), camera=()");
    res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    res.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  } catch {}
  return res;
}

export function middleware(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? generateId();
  // Preserve all incoming headers (including cookies) and add x-request-id
  const headers = new Headers(req.headers);
  headers.set('x-request-id', requestId);
  // Reject test-mode header in non-test environments
  try {
    const testHeader = req.headers.get('x-test-auth');
    const isTestMode = process.env.TEST_MODE === '1' || !!process.env.PLAYWRIGHT;
    if (testHeader && !isTestMode) {
      const res = NextResponse.json({ error: { code: 'FORBIDDEN', message: 'x-test-auth not allowed in production' }, requestId }, { status: 403 });
      const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
      return applySecurityHeaders(res, requestId, nonce);
    }
    // Assert prod builds run with TEST_MODE unset
    if (process.env.NODE_ENV === 'production' && process.env.TEST_MODE === '1') {
      const res = NextResponse.json({ error: { code: 'INTERNAL', message: 'TEST_MODE must be unset in production' }, requestId }, { status: 500 });
      const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
      return applySecurityHeaders(res, requestId, nonce);
    }
    // If runtime v2 is enabled in prod, require RS256 keys and key id
    if (process.env.NODE_ENV === 'production' && process.env.RUNTIME_API_V2 === '1' && (!process.env.NEXT_RUNTIME_PUBLIC_KEY || !process.env.NEXT_RUNTIME_PRIVATE_KEY || !process.env.NEXT_RUNTIME_KEY_ID)) {
      const res = NextResponse.json({ error: { code: 'INTERNAL', message: 'Runtime v2 requires RS256 keys: NEXT_RUNTIME_PUBLIC_KEY, NEXT_RUNTIME_PRIVATE_KEY, NEXT_RUNTIME_KEY_ID' }, requestId }, { status: 500 });
      const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
      return applySecurityHeaders(res, requestId, nonce);
    }
    // Require Supabase envs in production
    if (process.env.NODE_ENV === 'production') {
      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      if (!supaUrl || !supaKey) {
        const res = NextResponse.json({ error: { code: 'INTERNAL', message: 'Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required' }, requestId }, { status: 500 });
        const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
        return applySecurityHeaders(res, requestId, nonce);
      }
      try {
        const u = new URL(supaUrl);
        if (u.protocol !== 'https:') {
          const res = NextResponse.json({ error: { code: 'INTERNAL', message: 'Supabase URL must use https in production' }, requestId }, { status: 500 });
          const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
          return applySecurityHeaders(res, requestId, nonce);
        }
      } catch {
        const res = NextResponse.json({ error: { code: 'INTERNAL', message: 'Invalid NEXT_PUBLIC_SUPABASE_URL' }, requestId }, { status: 500 });
        const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
        return applySecurityHeaders(res, requestId, nonce);
      }
    }
  } catch {}
  // Security headers: CSP (with nonce), HSTS, Referrer-Policy, Permissions-Policy, COOP
  // Allow overrides via NEXT_PUBLIC_CSP; optionally extend frame-src via RUNTIME_FRAME_SRC_ALLOW (comma-separated origins)
  // Generate a nonce per request for inline scripts
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  headers.set('x-csp-nonce', nonce);
  const allowConnect = (process.env.RUNTIME_CORS_ALLOW || '').split(',').map(s => s.trim()).filter(Boolean);
  const connectSrc = [`'self'`, ...allowConnect].join(' ');
  // Start with conservative defaults; extend frame-src below
  let csp = process.env.NEXT_PUBLIC_CSP || `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src ${connectSrc}; frame-ancestors 'none'; frame-src 'self';`;
  try {
    const allowFrameEnv = (process.env.RUNTIME_FRAME_SRC_ALLOW || '').split(',').map(s => s.trim()).filter(Boolean);
    // Also include CORS allowlist (providers often use the same origin for frame + API)
    const allow = Array.from(new Set([ ...allowFrameEnv, ...allowConnect ]));
    if (!process.env.NEXT_PUBLIC_CSP && allow.length) {
      const parts = csp.split(';').map(s => s.trim());
      const idx = parts.findIndex(p => p.startsWith('frame-src '));
      const ext = allow.join(' ');
      if (idx >= 0) parts[idx] = `${parts[idx]} ${ext}`; else parts.push(`frame-src ${ext}`);
      csp = parts.filter(Boolean).join('; ');
    }
  } catch {}
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("x-request-id", requestId);
  res.headers.set("Content-Security-Policy", csp);
  // Always set HSTS in this middleware when NODE_ENV=production (unit test stubs rely on header presence)
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Permissions-Policy', "geolocation=(), microphone=(), camera=()");
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  // Optional COEP header behind flag to avoid breaking embeds by default
  if (process.env.COEP === '1') {
    res.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  }

  // CSRF double-submit: set a csrf_token cookie when flag enabled (ensure compatibility with unit test mocks)
  try {
    if (process.env.CSRF_DOUBLE_SUBMIT === '1') {
      const cookieHeader = req.headers.get('cookie') || '';
      const has = cookieHeader.split(';').some(p => p.trim().startsWith('csrf_token='));
      // NextResponse.next mock in tests provides a cookies Map-like API
      const hasCookieApi = !!(res as any)?.cookies;
      const existing = hasCookieApi && typeof (res as any).cookies.get === 'function' ? (res as any).cookies.get('csrf_token') : null;
      if (!has && !existing) {
        const token = Buffer.from(crypto.randomUUID()).toString('base64');
        if (hasCookieApi && typeof (res as any).cookies.set === 'function') {
          (res as any).cookies.set('csrf_token', token, { path: '/', httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
        }
      }
    }
  } catch {}
  return res;
}

export const config = {
  matcher: "/:path*"
};
