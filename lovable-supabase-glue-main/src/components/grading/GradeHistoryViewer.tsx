import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useGradeAnalytics } from '@/hooks/useGradeAnalytics';
import { formatDistanceToNow } from 'date-fns';
import { 
  History, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Clock,
  User
} from 'lucide-react';

interface GradeHistoryViewerProps {
  submissionId: string;
  maxPoints?: number;
  className?: string;
}

export const GradeHistoryViewer: React.FC<GradeHistoryViewerProps> = ({
  submissionId,
  maxPoints = 100,
  className,
}) => {
  const { history, loading } = useGradeAnalytics({ submissionId });

  const getChangeIcon = (oldGrade: number | null, newGrade: number | null) => {
    if (oldGrade === null) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (newGrade === null) return <TrendingDown className="h-4 w-4 text-red-500" />;
    if (newGrade > oldGrade) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (newGrade < oldGrade) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getChangeType = (reason: string) => {
    switch (reason) {
      case 'Initial Grade':
        return { variant: 'default' as const, label: 'Initial' };
      case 'Grade Updated':
        return { variant: 'secondary' as const, label: 'Updated' };
      case 'Grade Removed':
        return { variant: 'destructive' as const, label: 'Removed' };
      default:
        return { variant: 'outline' as const, label: reason };
    }
  };

  const formatGrade = (grade: number | null) => {
    if (grade === null) return 'No grade';
    const percentage = (grade / maxPoints) * 100;
    return `${grade}/${maxPoints} (${percentage.toFixed(1)}%)`;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-y-4">
            <div className="text-muted-foreground">Loading grade history...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Grade History
        </CardTitle>
        <CardDescription>
          Track all changes made to this submission's grade
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No grade history</h3>
            <p className="text-muted-foreground">
              Grade changes will appear here once grading begins
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => {
              const changeType = getChangeType(entry.change_reason);
              const isLast = index === history.length - 1;
              
              return (
                <div key={entry.id} className="relative">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getChangeIcon(entry.previous_grade, entry.new_grade)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={changeType.variant}>
                            {changeType.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">From:</span>
                            <span className="font-medium">
                              {formatGrade(entry.previous_grade)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">To:</span>
                            <span className="font-medium">
                              {formatGrade(entry.new_grade)}
                            </span>
                          </div>
                        </div>
                        
                        {entry.previous_feedback !== entry.new_feedback && (
                          <div className="space-y-1">
                            {entry.previous_feedback && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Previous feedback:</span>
                                <p className="mt-1 p-2 bg-muted/50 rounded text-xs">
                                  {entry.previous_feedback}
                                </p>
                              </div>
                            )}
                            {entry.new_feedback && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">
                                  {entry.previous_feedback ? 'New feedback:' : 'Feedback:'}
                                </span>
                                <p className="mt-1 p-2 bg-primary/5 border border-primary/20 rounded text-xs">
                                  {entry.new_feedback}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>Changed by: {entry.changed_by}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {!isLast && (
                    <div className="mt-4">
                      <Separator />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};