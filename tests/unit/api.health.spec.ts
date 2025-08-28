import { GET as healthGet } from '../../apps/web/src/app/api/health/route';

jest.mock('../../apps/web/src/lib/supabaseServer', () => {
  const supa = {
    from: (_table: string) => ({
      select: () => ({ error: null })
    }),
    storage: {
      from: (_bucket: string) => ({
        createSignedUrl: async () => ({ data: { url: 'signed' }, error: null })
      })
    }
  } as any;
  return {
    __esModule: true,
    getRouteHandlerSupabase: () => supa
  };
});

describe('GET /api/health', () => {
  const origEnv = { ...process.env } as any;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...origEnv, TEST_MODE: '1', NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' } as any;
  });
  afterAll(() => {
    process.env = origEnv;
  });

  test('returns ok with requestId, flags, required envs and role from cookie', async () => {
    const req = new Request('http://localhost/api/health', {
      headers: new Headers([
        ['x-request-id', 'rid-123'],
        ['cookie', 'x-test-auth=admin']
      ])
    });
    const res = await healthGet(req as any);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBe('rid-123');
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.testRole).toBe('admin');
    expect(typeof body.testMode).toBe('boolean');
    expect(typeof body.interactive).toBe('boolean');
    expect(typeof body.dbOk).toBe('boolean');
    expect(typeof body.storageOk).toBe('boolean');
    expect(body.flags && typeof body.flags.TEST_MODE === 'boolean').toBe(true);
    expect(body.requiredEnvs && typeof body.requiredEnvs.NEXT_PUBLIC_SUPABASE_URL === 'boolean').toBe(true);
  });

  test('returns error envelope on exception', async () => {
    jest.doMock('../../apps/web/src/lib/supabaseServer', () => ({
      __esModule: true,
      getRouteHandlerSupabase: () => ({ from: () => { throw new Error('boom'); } })
    }));
    const { GET } = await import('../../apps/web/src/app/api/health/route');
    const req = new Request('http://localhost/api/health', { headers: new Headers([['x-request-id', 'rid-err']]) });
    const res = await GET(req as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe('string');
    expect(res.headers.get('x-request-id')).toBe('rid-err');
  });
});

import { GET as HealthGET } from '../../apps/web/src/app/api/health/route';

describe('api.health', () => {
  test('returns ok true and detects role via header', async () => {
    const res = await (HealthGET as any)(new Request('http://localhost/api/health', { headers: { 'x-test-auth': 'teacher' } }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.testRole).toBe('teacher');
  });

  test('returns ok true without auth', async () => {
    const res = await (HealthGET as any)(new Request('http://localhost/api/health') as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

describe('Health API', () => {
  test('returns ok and reflects testMode and role from header/cookie', async () => {
    process.env.TEST_MODE = '1';
    const route = await import('../../apps/web/src/app/api/health/route');
    // no auth
    let res = await (route as any).GET(new Request('http://localhost/api/health') as any);
    let json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.testMode).toBe(true);
    // with role header
    res = await (route as any).GET(new Request('http://localhost/api/health', { headers: { 'x-test-auth': 'teacher' } }) as any);
    json = await res.json();
    expect(json.testRole).toBe('teacher');
  });
});


