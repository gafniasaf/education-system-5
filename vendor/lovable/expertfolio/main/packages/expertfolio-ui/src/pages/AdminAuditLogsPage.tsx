// Admin audit logs page - route agnostic
// [pkg-09-admin-audit-logs-page]

import React, { useState, useMemo } from 'react';
import { adminAuditLogsAdapter, AuditLogEntry, AuditLogsQuery } from '@lovable/expertfolio-adapters';
import { ErrorBanner, EmptyState, LoadingState, TableSkeleton } from '../components';
import { Search, Filter, Download, RefreshCw } from 'lucide-react';

export interface AdminAuditLogsPageProps {
  onNavigateToLog?: (logId: string) => void;
  className?: string;
}

export const AdminAuditLogsPage: React.FC<AdminAuditLogsPageProps> = ({
  onNavigateToLog,
  className = ''
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Partial<AuditLogsQuery>>({
    limit: 20,
    offset: 0
  });
  const [total, setTotal] = useState(0);

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;
    return logs.filter(log => 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entity_type && log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [logs, searchTerm]);

  const fetchLogs = async (query: Partial<AuditLogsQuery> = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await adminAuditLogsAdapter.getLogs({
        ...filters,
        ...query
      });
      
      setLogs(result.logs);
      setTotal(result.total);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const handlePageChange = (newOffset: number) => {
    const newFilters = { ...filters, offset: newOffset };
    setFilters(newFilters);
    fetchLogs(newFilters);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  React.useEffect(() => {
    fetchLogs();
  }, []);

  if (error) {
    return (
      <div className={className}>
        <ErrorBanner
          error={{
            message: error.message || 'Failed to load audit logs',
            code: error.code,
            requestId: error.requestId,
            retryable: true
          }}
          onRetry={handleRefresh}
          className="mb-6"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground">Track system activity and user actions</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        
        <button className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80">
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <TableSkeleton rows={10} cols={5} />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          title="No audit logs found"
          description={searchTerm ? "Try adjusting your search criteria" : "No activity to show yet"}
          icon={<Search className="h-12 w-12" />}
          action={searchTerm ? {
            label: "Clear search",
            onClick: () => setSearchTerm(''),
            variant: "secondary"
          } : undefined}
        />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <tr 
                    key={log.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => onNavigateToLog?.(log.id)}
                  >
                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground font-mono">
                      {log.actor_id}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {log.entity_type || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {log.entity_id ? log.entity_id.substring(0, 8) + '...' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {total > filters.limit! && (
            <div className="px-4 py-3 bg-muted/25 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filters.offset! + 1} to {Math.min(filters.offset! + filters.limit!, total)} of {total} results
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(Math.max(0, filters.offset! - filters.limit!))}
                  disabled={filters.offset === 0}
                  className="px-3 py-1 text-xs bg-background border border-border rounded disabled:opacity-50 hover:bg-muted"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(filters.offset! + filters.limit!)}
                  disabled={filters.offset! + filters.limit! >= total}
                  className="px-3 py-1 text-xs bg-background border border-border rounded disabled:opacity-50 hover:bg-muted"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogsPage;