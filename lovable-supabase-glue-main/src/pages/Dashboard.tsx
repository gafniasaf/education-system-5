import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { PageLoading } from "@/components/LoadingSpinner";
import { BookOpen, Users, FileText, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalCourses: number;
  totalStudents: number;
  totalAssignments: number;
  recentCourses: Array<{
    id: string;
    title: string;
    created_at: string;
  }>;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    totalStudents: 0,
    totalAssignments: 0,
    recentCourses: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !profile) return;

      try {
        let coursesCount = 0;
        let recentCourses = [];
        let assignmentsCount = 0;
        let studentsCount = 0;
        
        if (profile.role === 'teacher') {
          // For teachers, get all their courses
          const { count } = await supabase
            .from('courses')
            .select('*', { count: 'exact', head: true });
          coursesCount = count || 0;
          
          const { data } = await supabase
            .from('courses')
            .select('id, title, created_at')
            .order('created_at', { ascending: false })
            .limit(3);
          recentCourses = data || [];
          
          // Get assignments count
          const { count: assignmentCount } = await supabase
            .from('assignments')
            .select('*', { count: 'exact', head: true });
          assignmentsCount = assignmentCount || 0;
          
          // Get students count
          const { count: studentCount } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true });
          studentsCount = studentCount || 0;
        } else {
          // For students, first get their enrollments
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('course_id')
            .eq('student_id', user.id);
          
          if (enrollments && enrollments.length > 0) {
            const courseIds = enrollments.map(e => e.course_id);
            
            // Get course count and details
            coursesCount = courseIds.length;
            
            const { data } = await supabase
              .from('courses')
              .select('id, title, created_at')
              .in('id', courseIds)
              .order('created_at', { ascending: false })
              .limit(3);
            recentCourses = data || [];
            
            // Get assignments count for enrolled courses
            const { count: assignmentCount } = await supabase
              .from('assignments')
              .select('*', { count: 'exact', head: true })
              .in('course_id', courseIds);
            assignmentsCount = assignmentCount || 0;
          }
        }

        setStats({
          totalCourses: coursesCount,
          totalStudents: studentsCount,
          totalAssignments: assignmentsCount,
          recentCourses: recentCourses,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, profile]);

  if (loading) {
    return <PageLoading text="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile?.first_name || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Here's your education platform overview
          </p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
              <p className="text-xs text-muted-foreground">
                {profile?.role === 'teacher' ? 'Courses you teach' : 'Enrolled courses'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {profile?.role === 'teacher' ? 'Total Students' : 'Assignments'}
              </CardTitle>
              {profile?.role === 'teacher' ? (
                <Users className="h-4 w-4 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profile?.role === 'teacher' ? stats.totalStudents : stats.totalAssignments}
              </div>
              <p className="text-xs text-muted-foreground">
                {profile?.role === 'teacher' ? 'Across all courses' : 'Total assignments'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assignments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssignments}</div>
              <p className="text-xs text-muted-foreground">
                {profile?.role === 'teacher' ? 'Created by you' : 'Available to you'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Courses</CardTitle>
              <CardDescription>Your latest course activity</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentCourses.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No courses yet. Create your first course to get started!
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.recentCourses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{course.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(course.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start">
                <Link to="/courses">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Manage Courses
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/assignments">
                  <FileText className="mr-2 h-4 w-4" />
                  View Assignments
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/students">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Students
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;