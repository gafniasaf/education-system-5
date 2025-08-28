// Admin audit logs adapter
// [pkg-04-admin-audit-logs]

import { api } from '../fetch-wrapper';
import { config } from '../config';
import { 
  AuditLogEntry, 
  AuditLogsQuery, 
  AuditLogsResponse,
  AuditLogEntrySchema,
  AuditLogsResponseSchema
} from '../schemas/audit-logs.v1';

export class AdminAuditLogsAdapter {
  private getBaseUrl(): string {
    return config.baseUrl || '/api';
  }

  /**
   * Fetch audit logs with optional filtering and pagination
   */
  async getLogs(query: AuditLogsQuery = {}): Promise<AuditLogsResponse> {
    const params = new URLSearchParams();
    
    // Add pagination
    if (query.limit) params.set('limit', query.limit.toString());
    if (query.offset) params.set('offset', query.offset.toString());
    
    // Add sorting
    if (query.sortBy) params.set('sortBy', query.sortBy);
    if (query.sortOrder) params.set('sortOrder', query.sortOrder);
    
    // Add filters
    if (query.actor_id) params.set('actor_id', query.actor_id);
    if (query.action) params.set('action', query.action);
    if (query.entity_type) params.set('entity_type', query.entity_type);
    if (query.from_date) params.set('from_date', query.from_date);
    if (query.to_date) params.set('to_date', query.to_date);
    
    const url = `${this.getBaseUrl()}/admin/audit-logs${params.toString() ? `?${params.toString()}` : ''}`;
    
    const result = await api.get(url);
    
    if (result.error) {
      throw new Error(`Failed to fetch audit logs: ${result.error.message}`);
    }
    
    // Validate response with Zod
    const validated = AuditLogsResponseSchema.safeParse(result.data);
    if (!validated.success) {
      console.error('Invalid audit logs response:', validated.error);
      throw new Error('Invalid response format from audit logs API');
    }
    
    return validated.data;
  }

  /**
   * Fetch a single audit log by ID
   */
  async getLogById(id: string): Promise<AuditLogEntry> {
    const url = `${this.getBaseUrl()}/admin/audit-logs/${id}`;
    
    const result = await api.get(url);
    
    if (result.error) {
      throw new Error(`Failed to fetch audit log: ${result.error.message}`);
    }
    
    // Validate response with Zod
    const validated = AuditLogEntrySchema.safeParse(result.data);
    if (!validated.success) {
      console.error('Invalid audit log response:', validated.error);
      throw new Error('Invalid response format from audit log API');
    }
    
    return validated.data;
  }
}

// Export singleton instance
export const adminAuditLogsAdapter = new AdminAuditLogsAdapter();