/**
 * Route timing wrapper
 *
 * Decorates a Route Handler to:
 * - generate/propagate a request id
 * - log success or error with elapsed time
 * - echo the `x-request-id` header on the response
 */
import { getRequestLogger } from "@/lib/logger";
import { loadServerEnv } from "@education/shared";
import { recordTiming, recordError, incrCounter, incrInFlight, decrInFlight } from "@/lib/metrics";
import { checkRateLimit } from "@/lib/rateLimit";

export function withRouteTiming<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  // Fail-fast on invalid env at module import/first use
  loadServerEnv();
  return (async (...args: any[]) => {
    const start = Date.now();
    // Try to reuse upstream request id from headers if available
    const req: Request | undefined = (args[0] instanceof Request) ? (args[0] as Request) : undefined;
    const upstreamId = req?.headers?.get?.("x-request-id") || undefined;
    const requestId = upstreamId || crypto.randomUUID();
    // Basic CSRF: validate Origin/Referer on non-GET/HEAD similar to createApiHandler
    try {
      const method = (req as any)?.method || "GET";
      if (req && method !== 'GET' && method !== 'HEAD') {
        const origin = req.headers.get('origin') || '';
        const referer = req.headers.get('referer') || '';
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const path = (() => { try { return new URL((req as any).url).pathname; } catch { return ''; } })();
        const isRuntimePath = path.startsWith('/api/runtime');
        const sameOrigin = (val: string) => {
          try {
            const u = new URL(val);
            return base ? [new URL(base).origin].includes(u.origin) : (u.origin === (new URL(`${(req as any).url}`)).origin);
          } catch { return false; }
        };
        // Skip CSRF same-origin enforcement for runtime v2 endpoints which are designed for cross-origin provider calls.
        if (!isRuntimePath) {
          if ((origin && !sameOrigin(origin)) || (referer && !sameOrigin(referer))) {
            try { incrCounter('csrf.fail'); } catch {}
            return Response.json({ error: { code: 'FORBIDDEN', message: 'CSRF check failed' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
          }
        }
        // Optional double-submit CSRF token enforcement (skip for runtime paths)
        if (process.env.CSRF_DOUBLE_SUBMIT === '1' && !isRuntimePath) {
          const headerToken = req.headers.get('x-csrf-token') || '';
          const cookieHeader = req.headers.get('cookie') || '';
          const cookiesMap: Record<string, string> = {};
          for (const part of cookieHeader.split(';')) {
            const [k, ...v] = part.trim().split('=');
            if (!k) continue;
            cookiesMap[k] = decodeURIComponent(v.join('='));
          }
          const cookieToken = cookiesMap['csrf_token'] || '';
          if (!headerToken || !cookieToken || headerToken !== cookieToken) {
            try { incrCounter('csrf.double_submit.fail'); } catch {}
            return Response.json({ error: { code: 'FORBIDDEN', message: 'Invalid CSRF token' }, requestId }, { status: 403, headers: { 'x-request-id': requestId } });
          }
        }
        // Optional global per-IP mutation rate limit
        // Tests will explicitly set GLOBAL_MUTATION_RATE_LIMIT when needed
        const limit = Number(process.env.GLOBAL_MUTATION_RATE_LIMIT || 0);
        if (limit > 0) {
          const windowMs = Number(process.env.GLOBAL_MUTATION_RATE_WINDOW_MS || 60000);
          const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || 'unknown';
          const rl = checkRateLimit(`ip:${ip}`, limit, windowMs);
          if (!rl.allowed) {
            try { incrCounter('rate_limit.hit'); } catch {}
            const retryMs = Math.max(0, rl.resetAt - Date.now());
            const headers: Record<string, string> = {
              'x-request-id': requestId,
              'retry-after': String(Math.ceil(retryMs / 1000)),
              'x-rate-limit-remaining': String(rl.remaining),
              'x-rate-limit-reset': String(Math.ceil(rl.resetAt / 1000))
            };
            return Response.json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' }, requestId }, { status: 429, headers });
          }
        }
      }
    } catch { /* ignore */ }
    const log = getRequestLogger(requestId);
    try {
      // Record saturation (in-flight) per route path
      try {
        const url = (req as any)?.url as string | undefined;
        const path = url ? new URL(url).pathname : 'unknown';
        incrInFlight(path);
      } catch {}
      const res = await handler(...args);
      if (res && typeof res.headers?.set === 'function') {
        res.headers.set("x-request-id", requestId);
        try {
          const url = (req as any)?.url as string | undefined;
          const path = url ? new URL(url).pathname : 'unknown';
          if (path.startsWith('/api/runtime')) {
            // Help caches differentiate per-origin for runtime endpoints
            res.headers.set('vary', 'Origin');
          }
        } catch {}
      }
      const ms = Date.now() - start;
      try {
        const url = (req as any)?.url as string | undefined;
        const path = url ? new URL(url).pathname : 'unknown';
        decrInFlight(path);
      } catch {}
      log.info({ ms }, "route_success");
      try {
        const url = (req as any)?.url as string | undefined;
        const path = url ? new URL(url).pathname : 'unknown';
        recordTiming(path, ms);
      } catch {}
      return res;
    } catch (err: any) {
      const ms = Date.now() - start;
      try {
        const url = (req as any)?.url as string | undefined;
        const path = url ? new URL(url).pathname : 'unknown';
        decrInFlight(path);
      } catch {}
      log.error({ ms, err: err?.message }, "route_error");
      try {
        const url = (req as any)?.url as string | undefined;
        const path = url ? new URL(url).pathname : 'unknown';
        recordTiming(path, ms);
        recordError(path);
      } catch {}
      throw err;
    }
  }) as T;
}


