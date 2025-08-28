// Schema exports index
// [pkg-03-schemas-index]

export * from './common';
export * from './audit-logs.v1';
export * from './files.v1';

// Collect all schemas for contract testing
import { schemas as auditLogSchemas } from './audit-logs.v1';
import { schemas as fileSchemas } from './files.v1';

export const allSchemas = {
  auditLogs: auditLogSchemas,
  files: fileSchemas
};

// Version manifest
export const schemaVersions = {
  auditLogs: 'v1',
  files: 'v1'
} as const;