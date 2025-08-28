// Adapters index
// [pkg-04-adapters-index]

export { AdminAuditLogsAdapter, adminAuditLogsAdapter } from './admin-audit-logs';
export { FilesAdapter, filesAdapter } from './files';

// Re-export all adapter types
export type { 
  AuditLogEntry, 
  AuditLogsQuery, 
  AuditLogsResponse 
} from '../schemas/audit-logs.v1';

export type { 
  FileFinalizeRequest,
  FileFinalizeResponse,
  FileDownloadRequest,
  FileDownloadResponse
} from '../schemas/files.v1';