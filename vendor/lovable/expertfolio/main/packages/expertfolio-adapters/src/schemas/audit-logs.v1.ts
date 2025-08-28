// Admin audit logs schema v1
// [pkg-03-audit-logs]

import { z } from 'zod';
import { idField, timestampField, relaxed, PaginationQuerySchema, SortQuerySchema } from './common';

// Base audit log entry schema
const BaseAuditLogEntrySchema = z.object({
  id: idField(),
  actor_id: z.string(),
  action: z.string(),
  entity_type: z.string().nullable(),
  entity_id: z.string().nullable(),
  created_at: timestampField()
});

// Relaxed schema for test mode
export const AuditLogEntrySchema = relaxed(BaseAuditLogEntrySchema, {
  entity_type: z.string().optional(),
  entity_id: z.string().optional()
});

// Query parameters for audit logs
export const AuditLogsQuerySchema = PaginationQuerySchema
  .merge(SortQuerySchema)
  .extend({
    actor_id: z.string().optional(),
    action: z.string().optional(),
    entity_type: z.string().optional(),
    from_date: timestampField().optional(),
    to_date: timestampField().optional()
  });

// Response schemas
export const AuditLogsResponseSchema = z.object({
  logs: z.array(AuditLogEntrySchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number()
});

// Export types
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
export type AuditLogsQuery = z.infer<typeof AuditLogsQuerySchema>;
export type AuditLogsResponse = z.infer<typeof AuditLogsResponseSchema>;

// Schema exports for contract testing
export const schemas = {
  AuditLogEntry: AuditLogEntrySchema,
  AuditLogsQuery: AuditLogsQuerySchema,
  AuditLogsResponse: AuditLogsResponseSchema
};