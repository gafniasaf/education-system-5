import { middleware } from '../../apps/web/middleware';

describe('middleware CSP and headers', () => {
  const origEnv = { ...process.env } as any;
  beforeEach(() => { process.env = { ...origEnv, TEST_MODE: '1', RUNTIME_CORS_ALLOW: 'https://api.example.com, https://cdn.example.com' } as any; });
  afterAll(() => { process.env = origEnv; });

  test('sets x-request-id and CSP with nonce; connect-src includes allowed origins', async () => {
    const req = new Request('http://localhost/some', { headers: new Headers([['x-request-id', 'rid-mw']]) });
    const res = await middleware(req as any);
    expect(res.headers.get('x-request-id')).toBe('rid-mw');
    const csp = res.headers.get('content-security-policy') || res.headers.get('Content-Security-Policy');
    expect(csp).toBeTruthy();
    expect(csp).toMatch(/script-src 'self' 'nonce-/);
    expect(csp).toMatch(/connect-src 'self' https:\/\/api\.example\.com https:\/\/cdn\.example\.com/);
    const nonce = res.headers.get('x-csp-nonce');
    expect(nonce).toBeTruthy();
  });
});


