
(function(){
	// Safe in-scope store reference for next/headers shim
	const __cookies = new Map();
	const __headers = new Map();
	Object.assign(globalThis, { __TEST_HEADERS_STORE__: { cookies: __cookies, headers: __headers } });
	// Provide a lightweight mock compatible with codepaths that import next/headers directly
	jest.mock('next/headers', () => ({
		headers: () => ({ get: (k) => (__headers.get(k) || null) }),
		cookies: () => ({
			get: (k) => { const v = __cookies.get(k); return v ? { name: k, value: v } : undefined; },
			getAll: () => Array.from(__cookies.entries()).map(([name, value]) => ({ name, value }))
		})
	}), { virtual: true });
	const { TextEncoder, TextDecoder } = require('util');
	if (!global.TextEncoder) global.TextEncoder = TextEncoder;
	if (!global.TextDecoder) global.TextDecoder = TextDecoder;
	// Ensure fetch/Request/Response exist in node environment for serverFetch unit tests
	try {
		const undici = require('undici');
		if (!global.fetch) global.fetch = undici.fetch;
		if (!global.Headers) global.Headers = undici.Headers;
		if (!global.Request) global.Request = undici.Request;
		if (!global.Response) global.Response = undici.Response;
	} catch {}

	// MSW-like dispatch wrapper: consult registered handlers first, then fall back to original fetch
	(function(){
		const G = globalThis;
		const ORIGINAL_FETCH = global.fetch ? global.fetch.bind(global) : undefined;
		const Res = (global.Response) || class {
			constructor(body, init) { this._body = body; this.status = init?.status || 200; this.headers = new Map(Object.entries(init?.headers || {})); this.ok = this.status >= 200 && this.status < 300; }
			async json() { try { return JSON.parse(this._body); } catch { return this._body; } }
			async text() { return String(this._body); }
			get body() { return this._body; }
		};
		if (!global.Response) global.Response = Res;
		if (!global.Headers) global.Headers = class { constructor(init) { this._m = new Map(Object.entries(init || {})); } get(k){ return this._m.get(k) || null; } set(k,v){ this._m.set(k,v); } };
		if (!global.Request) global.Request = class { constructor(input, init){ this.url = typeof input === 'string' ? input : (input?.url || ''); this.method = (init?.method || 'GET').toUpperCase(); this.headers = new Map(Object.entries(init?.headers || {})); this.body = init?.body; } };
		function toPath(u){ try { return new URL(u, 'http://localhost').pathname; } catch { return String(u || ''); } }
		function findHandler(method, url){
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
		global.fetch = async function(input, init){
			const url = typeof input === 'string' ? input : (input?.url || '');
			const method = String((init?.method || 'GET')).toUpperCase();
			const handler = findHandler(method, url);
			if (handler) {
				const maybe = handler.resolver({ request: new global.Request(url, init) });
				return (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
			}
			if (ORIGINAL_FETCH) return ORIGINAL_FETCH(input, init);
			// Safe defaults if no original fetch exists
			if (toPath(url) === '/api/health') {
				return new Res(JSON.stringify({ ok: true, ts: Date.now(), testMode: true, testRole: 'teacher' }), { status: 200, headers: { 'content-type': 'application/json', 'x-request-id': 'req-123' } });
			}
			if (toPath(url) === '/api/user/profile') {
				return new Res(JSON.stringify({ id: 'u1', email: 't@example.com', role: 'teacher' }), { status: 200, headers: { 'content-type': 'application/json' } });
			}
			return new Res(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } });
		};
	})();
	if (typeof beforeEach === 'function') {
		beforeEach(() => { try { __cookies.clear(); __headers.clear(); } catch {};
			// Do not set default auth for Node unit tests; individual specs set auth explicitly
		});
	}
	try {
		const jobs = require('../apps/web/src/lib/jobs');
		if (jobs && typeof jobs.stopAllJobs === 'function') {
			afterEach(() => { try { jobs.stopAllJobs(); } catch {} });
		}
	} catch {}

	// Provide a polyfill for dynamic import spying in unit tests
	try {
		// Provide a minimal global import function for tests that spy on dynamic import
		if (!("import" in globalThis)) {
			Object.defineProperty(globalThis, 'import', {
				configurable: true,
				writable: true,
				value: (p) => Promise.resolve((jest.requireActual)(p))
			});
		}
	} catch {}

	// Default Supabase server helper to an in-memory mock for tests that don't install their own
	try {
		const supaMod = require('./unit/helpers/supabaseMock');
		const real = require('../apps/web/src/lib/supabaseServer');
		const make = (res) => supaMod.makeSupabaseMock(res || {});
		if (real && typeof real.getRouteHandlerSupabase !== 'function') {
			real.getRouteHandlerSupabase = () => make();
		}
	} catch {}

})();
