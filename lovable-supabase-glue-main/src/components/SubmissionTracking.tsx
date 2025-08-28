import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle, Users, FileText } from 'lucide-react';

interface SubmissionStats {
  totalStudents: number;
  submitted: number;
  graded: number;
  pending: number;
  overdue: number;
}

interface SubmissionTrackingProps {
  stats: SubmissionStats;
  dueDate?: string;
  className?: string;
}

export const SubmissionTracking: React.FC<SubmissionTrackingProps> = ({
  stats,
  dueDate,
  className,
}) => {
  const submissionRate = stats.totalStudents > 0 ? (stats.submitted / stats.totalStudents) * 100 : 0;
  const gradingRate = stats.submitted > 0 ? (stats.graded / stats.submitted) * 100 : 0;
  
  const isOverdue = dueDate && new Date() > new Date(dueDate);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Submission Overview
        </CardTitle>
        <CardDescription>
          Track student submissions and grading progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalStudents}</div>
            <div className="text-xs text-muted-foreground">Total Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.submitted}</div>
            <div className="text-xs text-muted-foreground">Submitted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.graded}</div>
            <div className="text-xs text-muted-foreground">Graded</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Submission Progress</span>
              <span>{Math.round(submissionRate)}%</span>
            </div>
            <Progress value={submissionRate} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Grading Progress</span>
              <span>{Math.round(gradingRate)}%</span>
            </div>
            <Progress value={gradingRate} className="h-2" />
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            {stats.submitted} Submitted
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-orange-600" />
            {stats.pending} Pending
          </Badge>
          {stats.overdue > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stats.overdue} Overdue
            </Badge>
          )}
        </div>

        {/* Due Date Alert */}
        {dueDate && (
          <div className={`p-3 rounded-lg ${isOverdue ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
            <div className={`text-sm font-medium ${isOverdue ? 'text-red-800' : 'text-blue-800'}`}>
              {isOverdue ? '⏰ Past Due' : '📅 Due Date'}
            </div>
            <div className={`text-sm ${isOverdue ? 'text-red-700' : 'text-blue-700'}`}>
              {new Date(dueDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};