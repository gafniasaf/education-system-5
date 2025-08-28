// Admin audit logs adapter tests
// [pkg-tests-audit-logs]

import { adminAuditLogsAdapter } from '../../adapters/admin-audit-logs';
import { auditLogFixtures } from '../../msw/fixtures/audit-logs';
import { setTestMode } from '../../config';

describe('AdminAuditLogsAdapter', () => {
  beforeEach(() => {
    setTestMode(true);
  });

  describe('getLogs', () => {
    it('should fetch audit logs successfully', async () => {
      const result = await adminAuditLogsAdapter.getLogs();
      
      expect(result).toMatchObject({
        logs: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            actor_id: expect.any(String),
            action: expect.any(String),
            created_at: expect.any(String)
          })
        ]),
        total: expect.any(Number),
        limit: expect.any(Number),
        offset: expect.any(Number)
      });
    });

    it('should apply pagination correctly', async () => {
      const result = await adminAuditLogsAdapter.getLogs({
        limit: 2,
        offset: 1
      });
      
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(1);
      expect(result.logs).toHaveLength(2);
    });

    it('should apply actor_id filter', async () => {
      const actorId = 'user_123';
      const result = await adminAuditLogsAdapter.getLogs({
        actor_id: actorId
      });
      
      expect(result.logs.every(log => log.actor_id === actorId)).toBe(true);
    });

    it('should apply action filter', async () => {
      const action = 'create_assignment';
      const result = await adminAuditLogsAdapter.getLogs({
        action
      });
      
      expect(result.logs.every(log => log.action === action)).toBe(true);
    });
  });

  describe('getLogById', () => {
    it('should fetch a single audit log by ID', async () => {
      const logId = auditLogFixtures[0].id;
      const result = await adminAuditLogsAdapter.getLogById(logId);
      
      expect(result).toMatchObject({
        id: logId,
        actor_id: expect.any(String),
        action: expect.any(String),
        created_at: expect.any(String)
      });
    });

    it('should throw error for non-existent log', async () => {
      await expect(
        adminAuditLogsAdapter.getLogById('non_existent_id')
      ).rejects.toThrow('Failed to fetch audit log');
    });
  });
});