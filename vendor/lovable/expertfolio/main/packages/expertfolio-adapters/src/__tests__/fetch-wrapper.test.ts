// Fetch wrapper tests
// [pkg-tests-fetch-wrapper]

import { fetchWrapper, api, RateLimitError, TimeoutError } from '../fetch-wrapper';
import { setTestMode } from '../config';

describe('fetchWrapper', () => {
  beforeEach(() => {
    setTestMode(true);
  });

  describe('successful requests', () => {
    it('should handle successful GET request', async () => {
      const result = await api.get('/api/admin/audit-logs');
      
      expect(result.data).toBeDefined();
      expect(result.meta?.requestId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle successful POST request', async () => {
      const body = {
        key: 'test-file',
        size_bytes: 1024
      };
      
      const result = await api.post('/api/files/finalize', body);
      
      expect(result.data).toEqual({ ok: true });
      expect(result.meta?.requestId).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle 404 errors', async () => {
      const result = await api.get('/api/admin/audit-logs/non_existent');
      
      expect(result.error).toBeDefined();
      expect(result.error?.statusCode).toBe(404);
      expect(result.meta?.requestId).toBeDefined();
    });

    it('should handle 500 errors', async () => {
      const result = await api.get('/api/test/error');
      
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('INTERNAL_ERROR');
      expect(result.error?.statusCode).toBe(500);
    });
  });

  describe('rate limiting', () => {
    it('should handle rate limit with retry', async () => {
      const result = await fetchWrapper('/api/test/rate-limit', { retries: 1 });
      
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('RATE_LIMITED');
      expect(result.meta?.rateLimitInfo).toBeDefined();
      expect(result.meta?.retryCount).toBeGreaterThan(0);
    });
  });

  describe('timeout handling', () => {
    it('should handle timeout with retry', async () => {
      const result = await fetchWrapper('/api/test/timeout', { 
        timeout: 100,
        retries: 1 
      });
      
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('TIMEOUT');
      expect(result.meta?.retryCount).toBeGreaterThan(0);
    }, 10000);
  });

  describe('headers', () => {
    it('should add request ID header', async () => {
      const result = await api.get('/api/admin/audit-logs');
      
      expect(result.meta?.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should parse total count header', async () => {
      const result = await api.get('/api/admin/audit-logs');
      
      expect(result.meta?.totalCount).toBeDefined();
      expect(typeof result.meta?.totalCount).toBe('number');
    });
  });
});