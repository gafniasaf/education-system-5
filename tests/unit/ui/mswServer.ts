// Use shimmed msw mappings to avoid ESM issues under Jest
import { setupServer } from '../../shims/msw-node';
import { http, HttpResponse } from '../../shims/msw';

export const handlers = [
	// Default safe handlers; specs can override with server.use(...)
	http.get('/api/health', () => HttpResponse.json({ ok: true })),
	http.get('/api/courses', () => HttpResponse.json([{ id: 'c-1', title: 'Course 1' }])),
	http.get('/api/lessons', () => HttpResponse.json([])),
	http.get('/api/parent-links', () => HttpResponse.json([{ id: 'pl-1', parent_id: 'p-1', student_id: 's-1', created_at: new Date().toISOString() }])),
];

export const server = setupServer(...handlers);

// Utilities for tests to simulate latency and varying payloads
export function delayedJson<T>(data: T, delayMs = 0, init?: ResponseInit) {
	return new Promise<Response>((resolve) => {
		setTimeout(() => resolve(new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' }, ...init })), delayMs);
	});
}

export function jitter(minMs: number, maxMs: number) {
	const min = Math.max(0, Math.min(minMs, maxMs));
	const span = Math.max(0, Math.max(minMs, maxMs) - min);
	return Math.floor(min + Math.random() * span);
}

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());


