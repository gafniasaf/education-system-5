// Shim @lovable/expertfolio-adapters for unit tests to avoid ESM/import.meta usage
export const adminAuditLogsAdapter = {
  getLogs: async () => ({ logs: [], total: 0 }),
  getLogById: async (id: string) => ({ id, actor_id: 'u', action: 'x', entity_type: null, entity_id: null, created_at: new Date().toISOString() })
};

export const filesAdapter = {
  finalizeUpload: async () => ({ ok: true }),
  getDownloadUrl: async () => ({ url: '/file', filename: 'readme.txt', content_type: 'text/plain' })
};

export default {} as any;


