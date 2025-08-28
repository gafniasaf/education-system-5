import { describe, expect, test, beforeEach, afterAll, jest } from '@jest/globals';

// Mock the vendored config module to avoid import.meta usage during Jest
jest.mock('../../vendor/lovable/expertfolio/main/packages/expertfolio-adapters/src/config.ts', () => ({
  __esModule: true,
  config: {
    baseUrl: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
    get testMode() { return true; },
    environment: 'test'
  }
}));

// Import the real fetch-wrapper after mocking config
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fetchWrapper } = require('../../vendor/lovable/expertfolio/main/packages/expertfolio-adapters/src/fetch-wrapper');

describe('Expertfolio fetchWrapper', () => {
  const originalFetch = global.fetch as any;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('maps x-total-count into meta.totalCount', async () => {
    global.fetch = jest.fn(async () => new Response(JSON.stringify([{ id: '1' }]), {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-total-count': '42' }
    })) as any;

    const res = await fetchWrapper<any[]>('/api/test');
    expect(res.data?.length).toBe(1);
    expect(res.meta?.totalCount).toBe(42);
  });

  test('retries on 429 honoring Retry-After seconds', async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls++;
      if (calls === 1) {
        return new Response(JSON.stringify({ error: 'rate' }), {
          status: 429,
          headers: { 'content-type': 'application/json', 'retry-after': '0' }
        });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as any;

    const res = await fetchWrapper<any>('/api/rate', { retries: 1 });
    expect(res.data?.ok).toBe(true);
  });

  test('aborts via timeout and returns TIMEOUT error when exhausted', async () => {
    // Simulate a fetch that rejects with AbortError shortly after, like a timed-out request
    global.fetch = jest.fn(async () => new Promise((_, reject) => {
      setTimeout(() => {
        const err: any = new Error('Aborted');
        err.name = 'AbortError';
        reject(err);
      }, 5);
    })) as any;
    const res = await fetchWrapper<any>('/api/slow', { timeout: 10, retries: 0 });
    expect(res.error?.code).toBe('TIMEOUT');
  });

  afterAll(() => { global.fetch = originalFetch; });
});


