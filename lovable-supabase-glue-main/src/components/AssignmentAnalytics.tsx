import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Award, Clock, Users } from 'lucide-react';

interface GradeDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface AssignmentAnalyticsData {
  averageGrade: number;
  maxPossiblePoints: number;
  submissionCount: number;
  gradeDistribution: GradeDistribution[];
  completionRate: number;
  averageSubmissionTime: number; // hours before due date
  totalStudents: number;
}

interface AssignmentAnalyticsProps {
  data: AssignmentAnalyticsData;
  className?: string;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

export const AssignmentAnalytics: React.FC<AssignmentAnalyticsProps> = ({
  data,
  className,
}) => {
  const gradePercentage = data.maxPossiblePoints > 0 ? (data.averageGrade / data.maxPossiblePoints) * 100 : 0;
  
  const performanceLevels = [
    { name: 'Excellent (90-100%)', value: data.gradeDistribution.find(g => g.range === '90-100')?.count || 0 },
    { name: 'Good (80-89%)', value: data.gradeDistribution.find(g => g.range === '80-89')?.count || 0 },
    { name: 'Satisfactory (70-79%)', value: data.gradeDistribution.find(g => g.range === '70-79')?.count || 0 },
    { name: 'Needs Improvement (60-69%)', value: data.gradeDistribution.find(g => g.range === '60-69')?.count || 0 },
    { name: 'Below Standard (<60%)', value: data.gradeDistribution.find(g => g.range === '<60')?.count || 0 },
  ];

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getCompletionBadge = (rate: number) => {
    if (rate >= 90) return { variant: 'default' as const, label: 'Excellent' };
    if (rate >= 75) return { variant: 'secondary' as const, label: 'Good' };
    if (rate >= 60) return { variant: 'outline' as const, label: 'Fair' };
    return { variant: 'destructive' as const, label: 'Needs Attention' };
  };

  const completionBadge = getCompletionBadge(data.completionRate);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <div>
                <div className={`text-2xl font-bold ${getPerformanceColor(gradePercentage)}`}>
                  {Math.round(gradePercentage)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg. Grade</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{data.submissionCount}</div>
                <div className="text-sm text-muted-foreground">Submissions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{Math.round(data.completionRate)}%</div>
                <div className="text-sm text-muted-foreground">Completion</div>
              </div>
            </div>
            <Badge variant={completionBadge.variant} className="mt-1 text-xs">
              {completionBadge.label}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{Math.round(data.averageSubmissionTime)}h</div>
                <div className="text-sm text-muted-foreground">Avg. Early</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution Chart - Simplified */}
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
            <CardDescription>
              Distribution of student grades across performance levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.gradeDistribution.map((item, index) => (
                <div key={item.range} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{item.range}%</span>
                    <span>{item.count} students</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Overview - Simplified */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>
              Student performance breakdown by achievement level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceLevels.filter(level => level.value > 0).map((level, index) => (
                <div key={level.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{level.name}</span>
                  </div>
                  <Badge variant="outline">{level.value} students</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Insights</CardTitle>
          <CardDescription>
            Key observations and recommendations based on submission data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Completion Analysis</h4>
              <Progress value={data.completionRate} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {data.submissionCount} of {data.totalStudents} students have submitted
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Grade Performance</h4>
              <Progress value={gradePercentage} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Average: {data.averageGrade.toFixed(1)}/{data.maxPossiblePoints} points
              </p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <h4 className="font-medium">Recommendations</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              {data.completionRate < 75 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  Consider sending reminders to students who haven't submitted
                </div>
              )}
              {gradePercentage < 70 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Review assignment difficulty - consider providing additional resources
                </div>
              )}
              {data.averageSubmissionTime < 12 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  Many students are submitting close to the deadline
                </div>
              )}
              {gradePercentage >= 85 && data.completionRate >= 90 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Excellent assignment performance! Students are engaged
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};