// Admin page with audit logs UI
// [lov-04-admin-audit-logs-gateway-ui]

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { adminAuditLogsGateway, type AuditLogEntry, type AuditLogsQuery } from '@/lib/gateways/admin-audit-logs';
import { RateLimitError } from '@/lib/fetch-wrapper';

const ITEMS_PER_PAGE = 20;

export default function Admin() {
  const { role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  // Filters
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [actorIdFilter, setActorIdFilter] = useState<string>('');

  // Redirect if not admin
  if (!authLoading && role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchLogs = async (page = 1, filters: Partial<AuditLogsQuery> = {}) => {
    try {
      setLoading(true);
      
      const query: AuditLogsQuery = {
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
        ...filters
      };

      const response = await adminAuditLogsGateway.getLogs(query);
      
      setLogs(response.logs);
      setTotal(response.total);
      setHasMore(response.hasMore);
      setCurrentPage(page);
      
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      
      if (error instanceof RateLimitError) {
        toast({
          title: "Rate Limit Exceeded",
          description: `Too many requests. Try again in ${Math.ceil((error.rateLimitInfo.reset * 1000 - Date.now()) / 1000)} seconds.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch audit logs. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const filters: Partial<AuditLogsQuery> = {};
    if (actionFilter) filters.action = actionFilter;
    if (entityTypeFilter) filters.entity_type = entityTypeFilter;
    if (actorIdFilter) filters.actor_id = actorIdFilter;
    
    fetchLogs(1, filters);
  };

  const clearFilters = () => {
    setActionFilter('');
    setEntityTypeFilter('');
    setActorIdFilter('');
    fetchLogs(1);
  };

  useEffect(() => {
    if (role === 'admin') {
      fetchLogs();
    }
  }, [role]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDetails = (details: Record<string, any>) => {
    if (!details || Object.keys(details).length === 0) return 'No details';
    return JSON.stringify(details, null, 2);
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">System audit logs and administrative tools</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>
              System activity and user actions. Total: {total} entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex-1 min-w-48">
                <Input
                  placeholder="Filter by action..."
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-48">
                <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Entity type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="course">Course</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="submission">Submission</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-48">
                <Input
                  placeholder="Filter by actor ID..."
                  value={actorIdFilter}
                  onChange={(e) => setActorIdFilter(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={applyFilters} variant="default">
                  Apply Filters
                </Button>
                <Button onClick={clearFilters} variant="outline">
                  Clear
                </Button>
              </div>
            </div>

            {/* Logs Table */}
            <div className="space-y-4">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </div>
              ) : (
                logs.map((log) => (
                  <Card key={log.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Action</div>
                          <Badge variant="secondary">{log.action}</Badge>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Entity</div>
                          <div className="text-sm">
                            {log.entity_type ? (
                              <Badge variant="outline">
                                {log.entity_type}: {log.entity_id || 'N/A'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Actor</div>
                          <div className="text-sm font-mono">{log.actor_id}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Timestamp</div>
                          <div className="text-sm">{formatDate(log.created_at)}</div>
                        </div>
                      </div>
                      
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-4">
                          <div className="text-sm font-medium text-muted-foreground mb-2">Details</div>
                          <pre className="text-xs bg-muted p-2 rounded max-h-32 overflow-auto">
                            {formatDetails(log.details)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Pagination */}
            {total > ITEMS_PER_PAGE && (
              <div className="flex justify-between items-center mt-6">
                <Button
                  onClick={() => fetchLogs(currentPage - 1)}
                  disabled={currentPage <= 1}
                  variant="outline"
                >
                  Previous
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(total / ITEMS_PER_PAGE)}
                </span>
                
                <Button
                  onClick={() => fetchLogs(currentPage + 1)}
                  disabled={!hasMore}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}