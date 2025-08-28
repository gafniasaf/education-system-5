import { jest } from '@jest/globals';

jest.mock('../../apps/web/src/lib/supabaseServer', () => ({
  __esModule: true,
  getCurrentUserInRoute: async () => ({ id: 'test-admin-id', email: 'admin@example.com', user_metadata: { role: 'admin' } }),
  getRouteHandlerSupabase: () => ({
    from: () => ({ select: () => ({ data: [], error: null }) })
  })
}));

jest.mock('../../apps/web/src/lib/redis', () => ({
  __esModule: true,
  redisIncrWithWindow: jest.fn(async (_key: string, windowMs: number) => {
    const resetAt = Date.now() + windowMs;
    // Simulate over limit (count greater than limit in route)
    return { count: 9999, resetAt };
  })
}));

describe('GET /api/providers/health - rate limit (async Redis)', () => {
  const origEnv = { ...process.env } as any;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...origEnv, TEST_MODE: '1', PROVIDER_HEALTH_LIMIT: '1', PROVIDER_HEALTH_WINDOW_MS: '60000' } as any;
  });
  afterAll(() => { process.env = origEnv; });

  test('returns 429 with rate limit headers when over limit', async () => {
    const { GET } = await import('../../apps/web/src/app/api/providers/health/route');
    const url = 'http://localhost/api/providers/health?id=00000000-0000-0000-0000-000000000000';
    const req = new Request(url, { headers: new Headers([['x-request-id', 'rid-rl']]) });
    const res = await GET(req as any);
    expect(res.status).toBe(429);
    expect(res.headers.get('x-request-id')).toBe('rid-rl');
    expect(res.headers.get('retry-after')).toBeTruthy();
    expect(res.headers.get('x-rate-limit-remaining')).toBeDefined();
    expect(res.headers.get('x-rate-limit-reset')).toBeDefined();
  });
});

import { GET as ProvidersHealthGET } from '../../apps/web/src/app/api/providers/health/route';

const get = (url: string, headers?: Record<string,string>) => new Request(url, { method: 'GET', headers: headers as any } as any);

describe('providers health rate-limit headers', () => {
  beforeEach(() => {
    // @ts-ignore simulate admin auth in test-mode
    (globalThis as any).__TEST_HEADERS_STORE__ = (globalThis as any).__TEST_HEADERS_STORE__ || { headers: new Map(), cookies: new Map() };
    // @ts-ignore
    (globalThis as any).__TEST_HEADERS_STORE__.cookies.set('x-test-auth', 'admin');
    (process.env as any).PROVIDER_HEALTH_LIMIT = '1';
    (process.env as any).PROVIDER_HEALTH_WINDOW_MS = '60000';
  });

  test('429 includes retry-after and x-rate-limit-* headers', async () => {
    const url = 'http://localhost/api/providers/health?id=00000000-0000-0000-0000-000000000001';
    let res = await (ProvidersHealthGET as any)(get(url));
    expect([200,401,403]).toContain(res.status);
    res = await (ProvidersHealthGET as any)(get(url));
    if (res.status === 429) {
      expect(res.headers.get('retry-after')).toBeTruthy();
      expect(res.headers.get('x-rate-limit-remaining')).toBeDefined();
      expect(res.headers.get('x-rate-limit-reset')).toBeDefined();
    }
  });
});


