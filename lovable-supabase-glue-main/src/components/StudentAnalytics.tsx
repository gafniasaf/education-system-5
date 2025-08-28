import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Award, Target, Calendar, Users } from 'lucide-react';

interface AnalyticsData {
  overallGPA: number;
  assignmentsCompleted: number;
  totalAssignments: number;
  averageGrade: number;
  gradeDistribution: { grade: string; count: number }[];
  performanceTrend: { week: string; average: number }[];
  courseProgress: { course: string; completed: number; total: number; average: number }[];
  recentGrades: { assignment: string; grade: number; date: string }[];
}

interface StudentAnalyticsProps {
  studentId?: string; // If provided, shows analytics for specific student (teacher view)
}

export const StudentAnalytics: React.FC<StudentAnalyticsProps> = ({ studentId }) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const targetUserId = studentId || user?.id;
  const isTeacherView = !!studentId;

  useEffect(() => {
    if (targetUserId) {
      fetchAnalyticsData();
      fetchCourses();
    }
  }, [targetUserId, selectedCourse]);

  const fetchCourses = async () => {
    if (!targetUserId) return;

    try {
      let query = supabase.from('courses').select('id, title');
      
      if (profile?.role === 'student' || isTeacherView) {
        // For students or when viewing a specific student, get enrolled courses
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('student_id', targetUserId);
        
        if (enrollments && enrollments.length > 0) {
          const courseIds = enrollments.map(e => e.course_id);
          query = query.in('id', courseIds);
        }
      }

      const { data } = await query.order('title');
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    if (!targetUserId) return;

    try {
      setLoading(true);

      // Base query for submissions with proper joins
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select(`
          id,
          grade,
          submitted_at,
          assignment_id
        `)
        .eq('student_id', targetUserId)
        .not('grade', 'is', null);

      if (error) {
        console.error('Error fetching submissions:', error);
        return;
      }

      // Fetch assignment details separately to avoid join issues
      const submissionIds = (submissions || []).map(s => s.assignment_id);
      let assignmentsData: any[] = [];
      
      if (submissionIds.length > 0) {
        const { data: assignments } = await supabase
          .from('assignments')
          .select('id, title, points_possible, course_id, due_date')
          .in('id', submissionIds);
        assignmentsData = assignments || [];
      }

      // Fetch course details
      const courseIds = [...new Set(assignmentsData.map(a => a.course_id))];
      let coursesData: any[] = [];
      
      if (courseIds.length > 0) {
        const { data: courses } = await supabase
          .from('courses')
          .select('id, title')
          .in('id', courseIds);
        coursesData = courses || [];
      }

      // Combine the data
      const enrichedSubmissions = (submissions || []).map(submission => {
        const assignment = assignmentsData.find(a => a.id === submission.assignment_id);
        const course = assignment ? coursesData.find(c => c.id === assignment.course_id) : null;
        
        return {
          ...submission,
          assignment: assignment ? {
            title: assignment.title,
            points_possible: assignment.points_possible,
            course_id: assignment.course_id,
            due_date: assignment.due_date,
            course: course ? { title: course.title } : { title: 'Unknown Course' }
          } : null
        };
      });

      // Filter by course if selected
      const filteredSubmissions = selectedCourse !== "all" 
        ? enrichedSubmissions.filter(sub => sub.assignment?.course_id === selectedCourse)
        : enrichedSubmissions;

      const gradedSubmissions = filteredSubmissions.filter(sub => sub.assignment !== null);
      
      if (gradedSubmissions.length === 0) {
        setAnalytics({
          overallGPA: 0,
          assignmentsCompleted: 0,
          totalAssignments: 0,
          averageGrade: 0,
          gradeDistribution: [],
          performanceTrend: [],
          courseProgress: [],
          recentGrades: [],
        });
        return;
      }

      // Overall metrics
      const totalGradePoints = gradedSubmissions.reduce((sum, sub) => sum + (sub.grade || 0), 0);
      const averageGrade = Math.round(totalGradePoints / gradedSubmissions.length);
      const overallGPA = (averageGrade / 100) * 4.0; // Convert to 4.0 scale

      // Grade distribution
      const gradeRanges = [
        { range: 'A (90-100)', min: 90, max: 100 },
        { range: 'B (80-89)', min: 80, max: 89 },
        { range: 'C (70-79)', min: 70, max: 79 },
        { range: 'D (60-69)', min: 60, max: 69 },
        { range: 'F (0-59)', min: 0, max: 59 },
      ];

      const gradeDistribution = gradeRanges.map(range => ({
        grade: range.range,
        count: gradedSubmissions.filter(sub => 
          (sub.grade || 0) >= range.min && (sub.grade || 0) <= range.max
        ).length,
      }));

      // Performance trend (last 8 weeks)
      const weeks = [];
      const now = new Date();
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7));
        weeks.push({
          start: weekStart,
          label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }

      const performanceTrend = weeks.map(week => {
        const weekSubmissions = gradedSubmissions.filter(sub => {
          const submissionDate = new Date(sub.submitted_at);
          const weekEnd = new Date(week.start);
          weekEnd.setDate(week.start.getDate() + 7);
          return submissionDate >= week.start && submissionDate < weekEnd;
        });

        const weekAverage = weekSubmissions.length > 0
          ? Math.round(weekSubmissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) / weekSubmissions.length)
          : 0;

        return {
          week: week.label,
          average: weekAverage,
        };
      });

      // Course progress - move before courseProgress calculation
      const courseGroups = gradedSubmissions.reduce((acc, sub) => {
        const courseTitle = sub.assignment?.course?.title || 'Unknown Course';
        if (!acc[courseTitle]) {
          acc[courseTitle] = [];
        }
        acc[courseTitle].push(sub);
        return acc;
      }, {} as Record<string, any[]>);

      const courseProgress = await Promise.all(
        Object.entries(courseGroups).map(async ([courseTitle, submissions]) => {
          // Get total assignments for this course
          const courseId = submissions[0]?.assignment?.course_id;
          if (!courseId) return null;
          
          const { count: totalAssignments } = await supabase
            .from('assignments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', courseId);

          const average = Math.round(
            submissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) / submissions.length
          );

          return {
            course: courseTitle,
            completed: submissions.length,
            total: totalAssignments || 0,
            average,
          };
        }).filter(Boolean)
      );

      // Recent grades (last 5)
      const recentGrades = gradedSubmissions
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
        .slice(0, 5)
        .map(sub => ({
          assignment: sub.assignment?.title || 'Unknown Assignment',
          grade: sub.grade || 0,
          date: new Date(sub.submitted_at).toLocaleDateString(),
        }));

      // Get total assignments count
      let totalAssignmentsQuery = supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true });

      if (selectedCourse !== "all") {
        totalAssignmentsQuery = totalAssignmentsQuery.eq('course_id', selectedCourse);
      } else if (courses.length > 0) {
        totalAssignmentsQuery = totalAssignmentsQuery.in('course_id', courses.map(c => c.id));
      }

      const { count: totalAssignments } = await totalAssignmentsQuery;

      setAnalytics({
        overallGPA: Math.round(overallGPA * 100) / 100,
        assignmentsCompleted: gradedSubmissions.length,
        totalAssignments: totalAssignments || 0,
        averageGrade,
        gradeDistribution,
        performanceTrend: performanceTrend.filter(p => p.average > 0),
        courseProgress,
        recentGrades,
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600';
    if (grade >= 80) return 'text-blue-600';
    if (grade >= 70) return 'text-yellow-600';
    if (grade >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.5) return 'text-green-600';
    if (gpa >= 3.0) return 'text-blue-600';
    if (gpa >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-8 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  const completionRate = analytics.totalAssignments > 0 
    ? Math.round((analytics.assignmentsCompleted / analytics.totalAssignments) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Course Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by course:</label>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall GPA</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getGPAColor(analytics.overallGPA)}`}>
              {analytics.overallGPA.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              4.0 scale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getGradeColor(analytics.averageGrade)}`}>
              {analytics.averageGrade}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <div className="mt-2">
              <Progress value={completionRate} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.assignmentsCompleted}/{analytics.totalAssignments} assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
            {analytics.performanceTrend.length >= 2 && (
              analytics.performanceTrend[analytics.performanceTrend.length - 1].average >= 
              analytics.performanceTrend[analytics.performanceTrend.length - 2].average
                ? <TrendingUp className="h-4 w-4 text-green-600" />
                : <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.performanceTrend.length > 0 
                ? analytics.performanceTrend[analytics.performanceTrend.length - 1]?.average || 0
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Recent performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance Trend</TabsTrigger>
          <TabsTrigger value="distribution">Grade Distribution</TabsTrigger>
          <TabsTrigger value="courses">Course Progress</TabsTrigger>
          <TabsTrigger value="recent">Recent Grades</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trend</CardTitle>
              <CardDescription>Grade averages over the last 8 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.performanceTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.performanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="average" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No performance data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
                <CardDescription>Distribution of grades across all assignments</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.gradeDistribution.some(d => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.gradeDistribution.filter(d => d.count > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ grade, count }) => `${grade}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analytics.gradeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No grade data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grade Breakdown</CardTitle>
                <CardDescription>Number of assignments in each grade range</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.gradeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="grade" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Course Progress</CardTitle>
              <CardDescription>Progress and performance by course</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.courseProgress.map((course, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{course.course}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getGradeColor(course.average)}>
                          {course.average}% avg
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {course.completed}/{course.total}
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={course.total > 0 ? (course.completed / course.total) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                ))}
                {analytics.courseProgress.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No course progress data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Grades</CardTitle>
              <CardDescription>Your latest assignment grades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.recentGrades.map((grade, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{grade.assignment}</p>
                      <p className="text-sm text-muted-foreground">{grade.date}</p>
                    </div>
                    <Badge variant="outline" className={getGradeColor(grade.grade)}>
                      {grade.grade}%
                    </Badge>
                  </div>
                ))}
                {analytics.recentGrades.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No recent grades available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};