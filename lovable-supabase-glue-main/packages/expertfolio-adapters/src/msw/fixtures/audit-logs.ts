// Audit logs test fixtures
// [pkg-05-audit-logs-fixtures]

import type { AuditLogEntry } from '../../schemas/audit-logs.v1';

export const auditLogFixtures: AuditLogEntry[] = [
  {
    id: 'audit_001',
    actor_id: 'user_123',
    action: 'create_assignment',
    entity_type: 'assignment',
    entity_id: 'assign_456',
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 'audit_002',
    actor_id: 'user_456',
    action: 'update_profile',
    entity_type: 'profile',
    entity_id: 'profile_789',
    created_at: '2024-01-15T11:45:00Z'
  },
  {
    id: 'audit_003',
    actor_id: 'user_123',
    action: 'delete_submission',
    entity_type: 'submission',
    entity_id: 'sub_321',
    created_at: '2024-01-15T14:20:00Z'
  },
  {
    id: 'audit_004',
    actor_id: 'user_789',
    action: 'login',
    entity_type: null,
    entity_id: null,
    created_at: '2024-01-15T16:15:00Z'
  },
  {
    id: 'audit_005',
    actor_id: 'user_456',
    action: 'create_course',
    entity_type: 'course',
    entity_id: 'course_654',
    created_at: '2024-01-16T09:10:00Z'
  }
];