import { getBaseUrl, serverFetch } from '../../apps/web/src/lib/serverFetch';

describe('serverFetch base URL and header propagation', () => {
  const origEnv = { ...process.env } as any;
  beforeEach(() => { process.env = { ...origEnv }; });
  afterAll(() => { process.env = origEnv; });

  test('getBaseUrl prefers PLAYWRIGHT_BASE_URL, then NEXT_PUBLIC_BASE_URL, then localhost', () => {
    process.env = { ...origEnv, PLAYWRIGHT_BASE_URL: 'http://e2e.local', NEXT_PUBLIC_BASE_URL: 'http://public.local', PORT: '3030' } as any;
    expect(getBaseUrl()).toBe('http://e2e.local');
    delete (process.env as any).PLAYWRIGHT_BASE_URL;
    expect(getBaseUrl()).toBe('http://public.local');
    delete (process.env as any).NEXT_PUBLIC_BASE_URL;
    (process.env as any).PORT = '3031';
    expect(getBaseUrl()).toBe('http://localhost:3031');
  });

  test('serverFetch builds absolute URL and propagates x-request-id', async () => {
    const origFetch = global.fetch;
    const calls: any[] = [];
    global.fetch = (async (input: any, init?: any) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as any;
    process.env = { ...origEnv, NEXT_PUBLIC_BASE_URL: 'http://public.local' } as any;
    // Simulate server request context by providing upstream header in init
    const res = await serverFetch('/api/x', { headers: new Headers([['x-request-id', 'rid-sf']]) });
    expect(res.status).toBe(200);
    expect(calls[0].input).toBe('http://public.local/api/x');
    expect(calls[0].init.headers.get('x-request-id')).toBe('rid-sf');
    global.fetch = origFetch as any;
  });
});

import { serverFetch, getBaseUrl } from '../../apps/web/src/lib/serverFetch';

describe('serverFetch utils', () => {
  test('getBaseUrl prefers PLAYWRIGHT_BASE_URL then NEXT_PUBLIC_BASE_URL then localhost', () => {
    const old = { ...process.env } as any;
    delete (process.env as any).PLAYWRIGHT_BASE_URL;
    delete (process.env as any).NEXT_PUBLIC_BASE_URL;
    delete (process.env as any).PORT;
    expect(getBaseUrl()).toMatch(/^http:\/\/localhost:3000$/);
    process.env.NEXT_PUBLIC_BASE_URL = 'http://example.com';
    expect(getBaseUrl()).toBe('http://example.com');
    process.env.PLAYWRIGHT_BASE_URL = 'http://e2e-host';
    expect(getBaseUrl()).toBe('http://e2e-host');
    process.env = old;
  });

  test('PLAYWRIGHT_BASE_URL takes precedence when both set', () => {
    const old = { ...process.env } as any;
    process.env.NEXT_PUBLIC_BASE_URL = 'http://example.com';
    process.env.PLAYWRIGHT_BASE_URL = 'http://e2e-host';
    expect(getBaseUrl()).toBe('http://e2e-host');
    process.env = old;
  });

  test('serverFetch builds absolute URL and propagates headers when given path', async () => {
    const old = global.fetch;
    const calls: any[] = [];
    // @ts-ignore
    global.fetch = async (url: any, init?: any) => { calls.push({ url, init }); return new Response('ok'); };
    try {
      delete (process.env as any).NEXT_PUBLIC_BASE_URL;
      delete (process.env as any).PLAYWRIGHT_BASE_URL;
      (process.env as any).PORT = '3333';
      await serverFetch('/api/ping', { headers: { 'x-request-id': 'in' } });
      expect(calls[0].url).toBe('http://localhost:3333/api/ping');
      expect((calls[0].init.headers as Headers).get('x-request-id')).toBe('in');
    } finally {
      global.fetch = old;
    }
  });

  test('serverFetch injects x-test-auth from cookies when header missing', async () => {
    const old = global.fetch;
    const calls: any[] = [];
    // @ts-ignore
    global.fetch = async (url: any, init?: any) => { calls.push({ url, init }); return new Response('ok'); };
    try {
      // simulate cookie via our jest.setup mock store
      // @ts-ignore
      globalThis.__TEST_HEADERS_STORE__.cookies.set('x-test-auth', 'teacher');
      await serverFetch('http://example.com/api/secure');
      expect((calls[0].init.headers as Headers).get('x-test-auth')).toBe('teacher');
    } finally {
      global.fetch = old;
    }
  });

  test('serverFetch forwards upstream x-request-id from Next headers when not provided', async () => {
    const old = global.fetch;
    const calls: any[] = [];
    // @ts-ignore
    global.fetch = async (url: any, init?: any) => { calls.push({ url, init }); return new Response('ok'); };
    try {
      // set upstream header via mocked next/headers store
      // @ts-ignore
      globalThis.__TEST_HEADERS_STORE__.headers.set('x-request-id', 'upstream-1');
      await serverFetch('/api/test');
      const h = calls[0].init.headers as Headers;
      expect(h.get('x-request-id')).toBe('upstream-1');
    } finally {
      global.fetch = old;
    }
  });
});


