// Admin audit logs gateway for /api/admin/audit-logs
// [lov-04-admin-audit-logs-gateway-ui]

import { api } from '../fetch-wrapper';

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  hasMore: boolean;
}

export interface AuditLogsQuery {
  limit?: number;
  offset?: number;
  actor_id?: string;
  action?: string;
  entity_type?: string;
  start_date?: string;
  end_date?: string;
}

export class AdminAuditLogsGateway {
  private baseUrl = '/api/admin/audit-logs';

  async getLogs(query: AuditLogsQuery = {}): Promise<AuditLogsResponse> {
    const searchParams = new URLSearchParams();
    
    // Add query parameters
    if (query.limit) searchParams.set('limit', query.limit.toString());
    if (query.offset) searchParams.set('offset', query.offset.toString());
    if (query.actor_id) searchParams.set('actor_id', query.actor_id);
    if (query.action) searchParams.set('action', query.action);
    if (query.entity_type) searchParams.set('entity_type', query.entity_type);
    if (query.start_date) searchParams.set('start_date', query.start_date);
    if (query.end_date) searchParams.set('end_date', query.end_date);

    const url = `${this.baseUrl}?${searchParams.toString()}`;
    const response = await api.get(url, { includeTestAuth: true });

    if (!response.ok) {
      throw new Error(`Failed to fetch audit logs: ${response.status} ${response.statusText}`);
    }

    const logs = await response.json();
    const total = parseInt(response.headers.get('x-total-count') || '0', 10);
    const hasMore = query.offset !== undefined && query.limit !== undefined 
      ? (query.offset + query.limit) < total 
      : false;

    return {
      logs,
      total,
      hasMore
    };
  }

  async getLogById(id: string): Promise<AuditLogEntry> {
    const response = await api.get(`${this.baseUrl}/${id}`, { includeTestAuth: true });

    if (!response.ok) {
      throw new Error(`Failed to fetch audit log: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

export const adminAuditLogsGateway = new AdminAuditLogsGateway();