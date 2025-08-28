import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { 
  User, 
  BookOpen, 
  GraduationCap, 
  MessageSquare, 
  Calendar, 
  Award,
  TrendingUp,
  Clock,
  FileText,
  Target,
  BarChart3
} from 'lucide-react';

interface StudentProgress {
  student_id: string;
  student_name: string;
  student_email: string;
  courses: CourseProgress[];
  overall_grade: number;
  assignments_completed: number;
  assignments_total: number;
  recent_activity: any[];
}

interface CourseProgress {
  course_id: string;
  course_title: string;
  average_grade: number;
  assignments_completed: number;
  assignments_total: number;
  last_activity: string;
  completion_percentage: number;
}

export const ParentPortal: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);

  useEffect(() => {
    if (user && profile) {
      fetchStudentProgress();
      fetchRecentAnnouncements();
      fetchUpcomingAssignments();
    }
  }, [user, profile]);

  const fetchStudentProgress = async () => {
    if (!user || profile?.role !== 'parent') return;

    try {
      setLoading(true);

      // Get linked students for this parent
      const { data: parentLinks } = await supabase
        .from('parent_links')
        .select('student_id')
        .eq('parent_id', user.id);

      if (!parentLinks || parentLinks.length === 0) {
        setStudentProgress([]);
        return;
      }

      const studentIds = parentLinks.map(link => link.student_id);
      
      // Get student profiles
      const { data: students } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', studentIds);

      if (!students) return;

      const progressData: StudentProgress[] = [];

      for (const student of students) {
        // Get student's enrolled courses
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('student_id', student.id);

        if (!enrollments) continue;

        const courseIds = enrollments.map(e => e.course_id);

        // Get course details
        const { data: courses } = await supabase
          .from('courses')
          .select('id, title')
          .in('id', courseIds);

        if (!courses) continue;

        const courseProgress: CourseProgress[] = [];
        let totalAssignments = 0;
        let completedAssignments = 0;
        let totalGradePoints = 0;
        let totalGradedAssignments = 0;

        for (const course of courses) {
          // Get assignments for this course
          const { data: assignments } = await supabase
            .from('assignments')
            .select('id, title, due_date')
            .eq('course_id', course.id);

          if (!assignments) continue;

          const assignmentIds = assignments.map(a => a.id);
          totalAssignments += assignments.length;

          // Get student's submissions for these assignments
          const { data: submissions } = await supabase
            .from('submissions')
            .select('assignment_id, grade, submitted_at')
            .in('assignment_id', assignmentIds)
            .eq('student_id', student.id);

          const submissionMap = new Map(submissions?.map(s => [s.assignment_id, s]) || []);
          const courseCompletedAssignments = submissions?.length || 0;
          completedAssignments += courseCompletedAssignments;

          // Calculate average grade for this course
          const gradedSubmissions = submissions?.filter(s => s.grade !== null) || [];
          const courseAverageGrade = gradedSubmissions.length > 0
            ? gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length
            : 0;

          if (gradedSubmissions.length > 0) {
            totalGradePoints += courseAverageGrade * gradedSubmissions.length;
            totalGradedAssignments += gradedSubmissions.length;
          }

          // Get last activity
          const lastSubmission = submissions?.sort((a, b) => 
            new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          )[0];

          courseProgress.push({
            course_id: course.id,
            course_title: course.title,
            average_grade: Math.round(courseAverageGrade * 100) / 100,
            assignments_completed: courseCompletedAssignments,
            assignments_total: assignments.length,
            last_activity: lastSubmission?.submitted_at || '',
            completion_percentage: assignments.length > 0 
              ? Math.round((courseCompletedAssignments / assignments.length) * 100)
              : 0,
          });
        }

        // Get recent activity - fetch assignment details separately
        const { data: recentSubmissions } = await supabase
          .from('submissions')
          .select('id, submitted_at, grade, assignment_id')
          .eq('student_id', student.id)
          .order('submitted_at', { ascending: false })
          .limit(5);

        let recentActivity: any[] = [];
        if (recentSubmissions && recentSubmissions.length > 0) {
          const assignmentIds = [...new Set(recentSubmissions.map(s => s.assignment_id))];
          const { data: assignmentDetails } = await supabase
            .from('assignments')
            .select('id, title')
            .in('id', assignmentIds);

          recentActivity = recentSubmissions.map(submission => ({
            type: 'submission',
            title: `Submitted: ${assignmentDetails?.find(a => a.id === submission.assignment_id)?.title || 'Unknown Assignment'}`,
            timestamp: submission.submitted_at,
            grade: submission.grade,
          }));
        }

        const overallGrade = totalGradedAssignments > 0 
          ? Math.round((totalGradePoints / totalGradedAssignments) * 100) / 100
          : 0;

        progressData.push({
          student_id: student.id,
          student_name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email,
          student_email: student.email,
          courses: courseProgress,
          overall_grade: overallGrade,
          assignments_completed: completedAssignments,
          assignments_total: totalAssignments,
          recent_activity: recentActivity,
        });
      }

      setStudentProgress(progressData);
      if (progressData.length > 0 && !selectedStudent) {
        setSelectedStudent(progressData[0].student_id);
      }

    } catch (error) {
      console.error('Error fetching student progress:', error);
      toast({
        title: "Error",
        description: "Failed to load student progress",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentAnnouncements = async () => {
    try {
      const { data: announcements } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          priority,
          created_at,
          course_id,
          courses(title)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentAnnouncements(announcements || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const fetchUpcomingAssignments = async () => {
    if (studentProgress.length === 0) return;

    try {
      const studentIds = studentProgress.map(s => s.student_id);
      const now = new Date().toISOString();

      // Get enrolled courses for all students
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, student_id')
        .in('student_id', studentIds);

      if (!enrollments) return;

      const courseIds = [...new Set(enrollments.map(e => e.course_id))];

      // Get upcoming assignments
      const { data: assignments } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          due_date,
          course_id,
          courses(title)
        `)
        .in('course_id', courseIds)
        .gte('due_date', now)
        .order('due_date', { ascending: true })
        .limit(10);

      setUpcomingAssignments(assignments || []);
    } catch (error) {
      console.error('Error fetching upcoming assignments:', error);
    }
  };

  const selectedStudentData = studentProgress.find(s => s.student_id === selectedStudent);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-green-500';
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600';
    if (grade >= 80) return 'text-blue-600';
    if (grade >= 70) return 'text-yellow-600';
    if (grade >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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

  if (studentProgress.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-medium">No Students Linked</h3>
              <p className="text-muted-foreground">
                Contact your school administrator to link student accounts to your parent portal.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Parent Portal</h2>
        <p className="text-muted-foreground">Track your child's academic progress and performance</p>
      </div>

      {/* Student Selector */}
      {studentProgress.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Student</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {studentProgress.map((student) => (
                <Button
                  key={student.student_id}
                  variant={selectedStudent === student.student_id ? 'default' : 'outline'}
                  onClick={() => setSelectedStudent(student.student_id)}
                >
                  {student.student_name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedStudentData && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Grade</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getGradeColor(selectedStudentData.overall_grade)}`}>
                  {selectedStudentData.overall_grade}%
                </div>
                <p className="text-xs text-muted-foreground">Across all courses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assignments</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedStudentData.assignments_completed}/{selectedStudentData.assignments_total}
                </div>
                <Progress 
                  value={selectedStudentData.assignments_total > 0 
                    ? (selectedStudentData.assignments_completed / selectedStudentData.assignments_total) * 100 
                    : 0
                  } 
                  className="mt-2" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedStudentData.courses.length}</div>
                <p className="text-xs text-muted-foreground">Enrolled courses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedStudentData.assignments_total > 0 
                    ? Math.round((selectedStudentData.assignments_completed / selectedStudentData.assignments_total) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Assignment completion</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Tabs */}
          <Tabs defaultValue="courses" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            </TabsList>

            <TabsContent value="courses" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedStudentData.courses.map((course) => (
                  <Card key={course.course_id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{course.course_title}</CardTitle>
                      <CardDescription>
                        Last activity: {course.last_activity 
                          ? formatDistanceToNow(new Date(course.last_activity), { addSuffix: true })
                          : 'No recent activity'
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Average Grade</span>
                        <Badge variant={course.average_grade >= 80 ? 'default' : 'secondary'}>
                          {course.average_grade}%
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Assignments Completed</span>
                          <span>{course.assignments_completed}/{course.assignments_total}</span>
                        </div>
                        <Progress value={course.completion_percentage} className="h-2" />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Completion</span>
                        <span className="text-sm text-muted-foreground">
                          {course.completion_percentage}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest submissions and achievements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedStudentData.recent_activity.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No recent activity</p>
                    ) : (
                      selectedStudentData.recent_activity.map((activity, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                            </p>
                          </div>
                          {activity.grade && (
                            <Badge variant={activity.grade >= 80 ? 'default' : 'secondary'}>
                              {activity.grade}%
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="announcements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Announcements</CardTitle>
                  <CardDescription>Important updates from teachers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentAnnouncements.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No recent announcements</p>
                    ) : (
                      recentAnnouncements.map((announcement) => (
                        <div key={announcement.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(announcement.priority)}`}></div>
                            <h4 className="font-medium">{announcement.title}</h4>
                            <Badge variant="outline" className="ml-auto">
                              {announcement.courses?.title}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{announcement.content}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Assignments</CardTitle>
                  <CardDescription>Due dates and deadlines</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingAssignments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No upcoming assignments</p>
                    ) : (
                      upcomingAssignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{assignment.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {assignment.courses?.title}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              Due {formatDistanceToNow(new Date(assignment.due_date), { addSuffix: true })}
                            </p>
                            <Badge variant={
                              new Date(assignment.due_date) < new Date(Date.now() + 24 * 60 * 60 * 1000)
                                ? 'destructive'
                                : 'outline'
                            }>
                              {new Date(assignment.due_date) < new Date(Date.now() + 24 * 60 * 60 * 1000)
                                ? 'Due Soon'
                                : 'Upcoming'
                              }
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};