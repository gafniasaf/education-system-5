// Contract tests against live endpoints
// [pkg-06-contract-tests]

import { adminAuditLogsAdapter, filesAdapter } from '../adapters';
import { setTestMode } from '../config';

describe('Contract Tests', () => {
  const LIVE_BASE_URL = process.env.CONTRACT_TEST_BASE_URL;
  
  beforeAll(() => {
    if (!LIVE_BASE_URL) {
      console.warn('Skipping contract tests - CONTRACT_TEST_BASE_URL not set');
    }
    setTestMode(false); // Use strict validation for contract tests
  });

  describe('Admin Audit Logs API Contract', () => {
    it('should match schema for GET /admin/audit-logs', async () => {
      if (!LIVE_BASE_URL) return;
      
      const result = await adminAuditLogsAdapter.getLogs({ limit: 1 });
      
      expect(result).toMatchObject({
        logs: expect.any(Array),
        total: expect.any(Number),
        limit: expect.any(Number),
        offset: expect.any(Number)
      });
      
      if (result.logs.length > 0) {
        expect(result.logs[0]).toMatchObject({
          id: expect.any(String),
          actor_id: expect.any(String),
          action: expect.any(String),
          created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        });
      }
    });

    it('should handle pagination correctly', async () => {
      if (!LIVE_BASE_URL) return;
      
      const result = await adminAuditLogsAdapter.getLogs({ 
        limit: 5, 
        offset: 0 
      });
      
      expect(result.limit).toBe(5);
      expect(result.offset).toBe(0);
      expect(result.logs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Files API Contract', () => {
    it('should validate finalize request schema', async () => {
      if (!LIVE_BASE_URL) return;
      
      await expect(
        filesAdapter.finalizeUpload({
          key: 'test-contract-file',
          size_bytes: 1024
        })
      ).resolves.toMatchObject({
        ok: expect.any(Boolean)
      });
    });

    it('should handle invalid file download requests', async () => {
      if (!LIVE_BASE_URL) return;
      
      await expect(
        filesAdapter.getDownloadUrl({ id: 'non_existent_contract_file' })
      ).rejects.toThrow();
    });
  });
});