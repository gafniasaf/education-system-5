import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { 
  Activity, 
  MessageSquare, 
  FileText, 
  Users, 
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface DashboardMetrics {
  totalAssignments: number;
  pendingSubmissions: number;
  unreadMessages: number;
  recentActivity: any[];
  upcomingDeadlines: any[];
}

export const RealTimeDashboard: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalAssignments: 0,
    pendingSubmissions: 0,
    unreadMessages: 0,
    recentActivity: [],
    upcomingDeadlines: [],
  });
  const [loading, setLoading] = useState(true);

  const handleRealTimeUpdate = (table: string, payload: any) => {
    console.log(`Real-time update received for ${table}:`, payload);
    
    // Refresh metrics when relevant updates occur
    if (['assignments', 'submissions', 'messages'].includes(table)) {
      fetchMetrics();
    }
  };

  useRealTimeUpdates(handleRealTimeUpdate);

  useEffect(() => {
    if (user && profile) {
      fetchMetrics();
    }
  }, [user, profile]);

  const fetchMetrics = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);

      const now = new Date().toISOString();
      let totalAssignments = 0;
      let pendingSubmissions = 0;
      let upcomingDeadlines: any[] = [];

      if (profile.role === 'teacher') {
        // Teacher metrics
        const { data: teacherCourses } = await supabase
          .from('courses')
          .select('id')
          .eq('teacher_id', user.id);

        if (teacherCourses && teacherCourses.length > 0) {
          const courseIds = teacherCourses.map(c => c.id);

          // Total assignments
          const { count: assignmentCount } = await supabase
            .from('assignments')
            .select('*', { count: 'exact', head: true })
            .in('course_id', courseIds);

          totalAssignments = assignmentCount || 0;

          // Pending submissions (assignments without submissions)
          const { data: assignments } = await supabase
            .from('assignments')
            .select('id')
            .in('course_id', courseIds);

          if (assignments) {
            const assignmentIds = assignments.map(a => a.id);
            const { data: submissions } = await supabase
              .from('submissions')
              .select('assignment_id')
              .in('assignment_id', assignmentIds);

            const submittedAssignments = new Set(submissions?.map(s => s.assignment_id) || []);
            pendingSubmissions = assignmentIds.length - submittedAssignments.size;
          }

          // Upcoming deadlines
          const { data: upcomingAssignments } = await supabase
            .from('assignments')
            .select('id, title, due_date')
            .in('course_id', courseIds)
            .gte('due_date', now)
            .order('due_date', { ascending: true })
            .limit(5);

          upcomingDeadlines = upcomingAssignments || [];
        }
      } else if (profile.role === 'student') {
        // Student metrics
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('student_id', user.id);

        if (enrollments && enrollments.length > 0) {
          const courseIds = enrollments.map(e => e.course_id);

          // Total assignments
          const { count: assignmentCount } = await supabase
            .from('assignments')
            .select('*', { count: 'exact', head: true })
            .in('course_id', courseIds);

          totalAssignments = assignmentCount || 0;

          // Pending submissions (assignments not submitted by student)
          const { data: assignments } = await supabase
            .from('assignments')
            .select('id')
            .in('course_id', courseIds);

          if (assignments) {
            const assignmentIds = assignments.map(a => a.id);
            const { data: submissions } = await supabase
              .from('submissions')
              .select('assignment_id')
              .in('assignment_id', assignmentIds)
              .eq('student_id', user.id);

            const submittedAssignments = new Set(submissions?.map(s => s.assignment_id) || []);
            pendingSubmissions = assignmentIds.length - submittedAssignments.size;
          }

          // Upcoming deadlines for student
          const { data: upcomingAssignments } = await supabase
            .from('assignments')
            .select('id, title, due_date')
            .in('course_id', courseIds)
            .gte('due_date', now)
            .order('due_date', { ascending: true })
            .limit(5);

          upcomingDeadlines = upcomingAssignments || [];
        }
      }

      // Unread messages
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .is('read_at', null);

      // Recent activity (last 10 submissions/assignments)
      const { data: recentSubmissions } = await supabase
        .from('submissions')
        .select('id, submitted_at, assignment_id, student_id')
        .order('submitted_at', { ascending: false })
        .limit(5);

      // Get assignment and student details separately
      let submissionsWithDetails: any[] = [];
      if (recentSubmissions && recentSubmissions.length > 0) {
        const assignmentIds = [...new Set(recentSubmissions.map(s => s.assignment_id))];
        const studentIds = [...new Set(recentSubmissions.map(s => s.student_id))];

        const [assignmentDetails, studentDetails] = await Promise.all([
          supabase.from('assignments').select('id, title').in('id', assignmentIds),
          supabase.from('profiles').select('id, first_name, last_name').in('id', studentIds)
        ]);

        submissionsWithDetails = recentSubmissions.map(submission => ({
          ...submission,
          assignment: assignmentDetails.data?.find(a => a.id === submission.assignment_id),
          student: studentDetails.data?.find(s => s.id === submission.student_id)
        }));
      }

      const { data: recentAssignments } = await supabase
        .from('assignments')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const recentActivity = [
        ...(submissionsWithDetails?.map(s => ({
          type: 'submission',
          title: `Submission for ${s.assignment?.title || 'Unknown Assignment'}`,
          timestamp: s.submitted_at,
          author: s.student ? `${s.student.first_name || ''} ${s.student.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
        })) || []),
        ...(recentAssignments?.map(a => ({
          type: 'assignment',
          title: `New assignment: ${a.title}`,
          timestamp: a.created_at,
        })) || []),
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      setMetrics({
        totalAssignments,
        pendingSubmissions,
        unreadMessages: unreadCount || 0,
        recentActivity,
        upcomingDeadlines,
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'submission':
        return <FileText className="h-4 w-4" />;
      case 'assignment':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Real-Time Dashboard</h2>
        <p className="text-muted-foreground">Live updates and metrics for your education platform</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              {profile?.role === 'teacher' ? 'Created by you' : 'Available to you'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              {profile?.role === 'teacher' ? 'Awaiting submissions' : 'Not submitted yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.unreadMessages}</div>
            <p className="text-xs text-muted-foreground">
              New messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recentActivity.length}</div>
            <p className="text-xs text-muted-foreground">
              Latest updates
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Live updates from your courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {metrics.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              ) : (
                metrics.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                    <div className="mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      {activity.author && (
                        <p className="text-xs text-muted-foreground">by {activity.author}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant={activity.type === 'submission' ? 'default' : 'secondary'}>
                      {activity.type}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>Assignment due dates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {metrics.upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming deadlines
                </p>
              ) : (
                metrics.upcomingDeadlines.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {formatDistanceToNow(new Date(assignment.due_date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {new Date(assignment.due_date) < new Date(Date.now() + 24 * 60 * 60 * 1000) 
                        ? 'Urgent' 
                        : 'Upcoming'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Status Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-muted-foreground">Real-time updates active</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchMetrics}>
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};