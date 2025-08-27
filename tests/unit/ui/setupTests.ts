import '@testing-library/jest-dom';
// JSDOM lacks crypto.randomUUID; provide a simple polyfill for tests using Toast
if (!(global as any).crypto) {
  (global as any).crypto = { randomUUID: () => `t-${Math.random().toString(16).slice(2)}` } as any;
}

// Provide fetch/Request/Response in jsdom environment so MSW can intercept requests
try {
  const undici = require('undici');
  if (!(global as any).fetch) (global as any).fetch = undici.fetch;
  if (!(global as any).Headers) (global as any).Headers = undici.Headers;
  if (!(global as any).Request) (global as any).Request = undici.Request;
  if (!(global as any).Response) (global as any).Response = undici.Response;
} catch {}

// Final fallback: lightweight fetch stub for common UI endpoints if fetch is still undefined
if (!(global as any).fetch) {
  const Res = (global as any).Response || class {
    body: any; status: number; headers: any; ok: boolean;
    constructor(body: any, init: any) { this.body = body; this.status = init?.status || 200; this.headers = new Map(Object.entries(init?.headers || {})); this.ok = this.status >= 200 && this.status < 300; }
    async json() { try { return JSON.parse(this.body); } catch { return this.body; } }
    async text() { return String(this.body); }
  } as any;
  (global as any).Response = Res;
  (global as any).fetch = async function(input: any, init?: any) {
    const url = typeof input === 'string' ? input : (input?.url || input?.toString?.() || '');
    if (url.includes('/api/health')) {
      const body = JSON.stringify({ ok: true, ts: Date.now(), testRole: 'teacher', testMode: true });
      return new Res(body, { status: 200, headers: { 'content-type': 'application/json', 'x-request-id': 'req-123' } });
    }
    if (url.includes('/api/user/profile')) {
      const body = JSON.stringify({ id: 'u1', email: 't@example.com', role: 'teacher' });
      return new Res(body, { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Res(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}

// Wrap fetch to consult MSW-like handlers first, then fall back to original fetch
(function(){
  const G: any = globalThis as any;
  // Build a safe Request ctor for jsdom; fall back to undici Request or minimal shim
  if (!G.Request) {
    try { const undici = require('undici'); if (undici?.Request) G.Request = undici.Request; } catch {}
  }
  if (!G.Request) {
    G.Request = class { url: string; method: string; headers: any; body: any; constructor(input: any, init?: any){ this.url = typeof input === 'string' ? input : (input?.url || ''); this.method = String((init?.method || 'GET')).toUpperCase(); this.headers = new Map(Object.entries(init?.headers || {})); this.body = init?.body; } };
  }
  const ORIGINAL_FETCH = (G.fetch ? G.fetch.bind(G) : undefined) as any;
  function toPath(u: string){ try { return new URL(u, 'http://localhost').pathname; } catch { return String(u || ''); } }
  function findHandler(method: string, url: string){
    const reg = (G.__MSW_REG__ = G.__MSW_REG__ || { defaults: [], current: [] });
    const handlers = reg.current || [];
    const path = toPath(url);
    for (let i = handlers.length - 1; i >= 0; i--) {
      const h = handlers[i]?.__msw;
      if (!h || h.method !== method) continue;
      const m = h.matcher;
      if (typeof m === 'string' && m === path) return h;
      if (m instanceof RegExp && m.test(path)) return h;
    }
    return null;
  }
  (G as any).fetch = async function(input: any, init?: any){
    const url = typeof input === 'string' ? input : (input?.url || '');
    const method = String((init?.method || 'GET')).toUpperCase();
    const handler = findHandler(method, url);
    if (handler) {
      const req = new (G as any).Request(url, init);
      const maybe = handler.resolver({ request: req });
      return (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
    }
    const Res = (G.Response) || class { _b: any; status: number; headers: any; ok: boolean; constructor(body: any, init?: any){ this._b = body; this.status = init?.status || 200; this.headers = new Map(Object.entries(init?.headers || {})); this.ok = this.status >= 200 && this.status < 300; } async json(){ try { return JSON.parse(this._b); } catch { return this._b; } } async text(){ return String(this._b); } } as any;
    const path = toPath(url);
    if (path === '/api/health') return new Res(JSON.stringify({ ok: true, ts: Date.now(), testMode: true, testRole: 'teacher' }), { status: 200, headers: { 'content-type': 'application/json', 'x-request-id': 'req-123' } });
    if (path === '/api/user/profile') return new Res(JSON.stringify({ id: 'u1', email: 't@example.com', role: 'teacher' }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (path === '/api/courses') return new Res(JSON.stringify([{ id: 'c-1', title: 'Course 1' }]), { status: 200, headers: { 'content-type': 'application/json' } });
    if (path === '/api/lessons') {
      let courseId = '';
      try { const u = new URL(typeof url === 'string' ? url : String(url), 'http://localhost'); courseId = u.searchParams.get('course_id') || ''; } catch {}
      const rows = courseId === 'c-1' ? [ { id: 'l-1', title: 'Start', order_index: 1 }, { id: 'l-2', title: 'End', order_index: 2 } ] : [];
      return new Res(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (ORIGINAL_FETCH) return ORIGINAL_FETCH(input, init);
    return new Res(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } });
  };
})();

// Provide default test-mode headers/cookies for pages that read next/headers
// @ts-ignore
(global as any).__TEST_HEADERS_STORE__ = (global as any).__TEST_HEADERS_STORE__ || { cookies: new Map(), headers: new Map() };
try { (global as any).__TEST_HEADERS_STORE__.cookies.set('x-test-auth', 'teacher'); } catch {}
process.env.TEST_MODE = process.env.TEST_MODE || '1';
process.env.NEXT_PUBLIC_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE || '1';


