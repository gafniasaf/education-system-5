import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  Award, 
  Target,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download
} from 'lucide-react';

interface AnalyticsData {
  coursePerformance: any[];
  studentProgress: any[];
  submissionTrends: any[];
  gradeDistribution: any[];
  engagementMetrics: any[];
  timeSpentData: any[];
}

interface CourseAnalytics {
  course_id: string;
  course_title: string;
  total_students: number;
  total_assignments: number;
  average_grade: number;
  completion_rate: number;
  engagement_score: number;
}

export const AdvancedAnalytics: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [courses, setCourses] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    coursePerformance: [],
    studentProgress: [],
    submissionTrends: [],
    gradeDistribution: [],
    engagementMetrics: [],
    timeSpentData: [],
  });
  const [summaryStats, setSummaryStats] = useState({
    totalStudents: 0,
    averageGrade: 0,
    completionRate: 0,
    activeAssignments: 0,
  });

  useEffect(() => {
    if (user && profile) {
      fetchCourses();
      fetchAnalyticsData();
    }
  }, [user, profile, selectedTimeRange, selectedCourse]);

  const fetchCourses = async () => {
    if (!user || !profile) return;

    try {
      let query = supabase.from('courses').select('id, title');

      if (profile.role === 'teacher') {
        query = query.eq('teacher_id', user.id);
      } else if (profile.role === 'student') {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('student_id', user.id);
        
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
    if (!user || !profile) return;

    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(selectedTimeRange));

      // Fetch course performance data
      const coursePerformance = await fetchCoursePerformance();
      
      // Fetch student progress data
      const studentProgress = await fetchStudentProgress();
      
      // Fetch submission trends
      const submissionTrends = await fetchSubmissionTrends(startDate, endDate);
      
      // Fetch grade distribution
      const gradeDistribution = await fetchGradeDistribution();
      
      // Fetch engagement metrics
      const engagementMetrics = await fetchEngagementMetrics();

      setAnalyticsData({
        coursePerformance,
        studentProgress,
        submissionTrends,
        gradeDistribution,
        engagementMetrics,
        timeSpentData: [], // Placeholder for future implementation
      });

      // Calculate summary statistics
      calculateSummaryStats(coursePerformance, studentProgress);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCoursePerformance = async (): Promise<CourseAnalytics[]> => {
    const { data: coursesData } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        assignments(id, points_possible),
        enrollments(student_id)
      `);

    if (!coursesData) return [];

    const courseAnalytics: CourseAnalytics[] = [];

    for (const course of coursesData) {
      const studentCount = course.enrollments?.length || 0;
      const assignmentCount = course.assignments?.length || 0;

      // Calculate average grade for course
      const { data: submissions } = await supabase
        .from('submissions')
        .select('grade, assignment_id')
        .in('assignment_id', course.assignments?.map((a: any) => a.id) || [])
        .not('grade', 'is', null);

      const grades = submissions?.map(s => s.grade || 0) || [];
      const averageGrade = grades.length > 0 ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : 0;

      // Calculate completion rate
      const totalPossibleSubmissions = studentCount * assignmentCount;
      const actualSubmissions = submissions?.length || 0;
      const completionRate = totalPossibleSubmissions > 0 ? (actualSubmissions / totalPossibleSubmissions) * 100 : 0;

      courseAnalytics.push({
        course_id: course.id,
        course_title: course.title,
        total_students: studentCount,
        total_assignments: assignmentCount,
        average_grade: Math.round(averageGrade * 100) / 100,
        completion_rate: Math.round(completionRate * 100) / 100,
        engagement_score: Math.min(100, (completionRate + (averageGrade / 100 * 100)) / 2),
      });
    }

    return courseAnalytics;
  };

  const fetchStudentProgress = async () => {
    if (profile?.role !== 'teacher') return [];

    const { data: students } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        email
      `)
      .eq('role', 'student');

    if (!students) return [];

    const progressData = [];

    for (const student of students.slice(0, 10)) { // Limit to 10 for performance
      const { data: submissions } = await supabase
        .from('submissions')
        .select('grade, submitted_at')
        .eq('student_id', student.id)
        .not('grade', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(5);

      const grades = submissions?.map(s => s.grade || 0) || [];
      const averageGrade = grades.length > 0 ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : 0;

      progressData.push({
        student_name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email,
        average_grade: Math.round(averageGrade * 100) / 100,
        submissions_count: submissions?.length || 0,
        last_activity: submissions?.[0]?.submitted_at || null,
      });
    }

    return progressData.sort((a, b) => b.average_grade - a.average_grade);
  };

  const fetchSubmissionTrends = async (startDate: Date, endDate: Date) => {
    const { data: submissions } = await supabase
      .from('submissions')
      .select('submitted_at, grade')
      .gte('submitted_at', startDate.toISOString())
      .lte('submitted_at', endDate.toISOString())
      .order('submitted_at');

    if (!submissions) return [];

    // Group submissions by day
    const dailySubmissions: { [key: string]: { count: number; grades: number[] } } = {};

    submissions.forEach(submission => {
      const date = new Date(submission.submitted_at).toISOString().split('T')[0];
      if (!dailySubmissions[date]) {
        dailySubmissions[date] = { count: 0, grades: [] };
      }
      dailySubmissions[date].count++;
      if (submission.grade !== null) {
        dailySubmissions[date].grades.push(submission.grade);
      }
    });

    return Object.entries(dailySubmissions).map(([date, data]) => ({
      date,
      submissions: data.count,
      averageGrade: data.grades.length > 0 
        ? Math.round((data.grades.reduce((sum, grade) => sum + grade, 0) / data.grades.length) * 100) / 100
        : 0,
    }));
  };

  const fetchGradeDistribution = async () => {
    const { data: submissions } = await supabase
      .from('submissions')
      .select('grade')
      .not('grade', 'is', null);

    if (!submissions) return [];

    const gradeRanges = {
      'A (90-100)': 0,
      'B (80-89)': 0,
      'C (70-79)': 0,
      'D (60-69)': 0,
      'F (0-59)': 0,
    };

    submissions.forEach(submission => {
      const grade = submission.grade || 0;
      if (grade >= 90) gradeRanges['A (90-100)']++;
      else if (grade >= 80) gradeRanges['B (80-89)']++;
      else if (grade >= 70) gradeRanges['C (70-79)']++;
      else if (grade >= 60) gradeRanges['D (60-69)']++;
      else gradeRanges['F (0-59)']++;
    });

    return Object.entries(gradeRanges).map(([range, count]) => ({
      range,
      count,
      percentage: submissions.length > 0 ? Math.round((count / submissions.length) * 100) : 0,
    }));
  };

  const fetchEngagementMetrics = async () => {
    // Placeholder for engagement metrics
    // This could include forum posts, assignment views, time spent, etc.
    return [
      { metric: 'Forum Posts', value: 45, trend: '+12%' },
      { metric: 'Assignment Views', value: 234, trend: '+8%' },
      { metric: 'Messages Sent', value: 67, trend: '+15%' },
      { metric: 'Login Frequency', value: 89, trend: '+5%' },
    ];
  };

  const calculateSummaryStats = (coursePerformance: CourseAnalytics[], studentProgress: any[]) => {
    const totalStudents = coursePerformance.reduce((sum, course) => sum + course.total_students, 0);
    const averageGrade = coursePerformance.length > 0 
      ? coursePerformance.reduce((sum, course) => sum + course.average_grade, 0) / coursePerformance.length
      : 0;
    const completionRate = coursePerformance.length > 0
      ? coursePerformance.reduce((sum, course) => sum + course.completion_rate, 0) / coursePerformance.length
      : 0;
    const activeAssignments = coursePerformance.reduce((sum, course) => sum + course.total_assignments, 0);

    setSummaryStats({
      totalStudents,
      averageGrade: Math.round(averageGrade * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      activeAssignments,
    });
  };

  const exportData = () => {
    const dataToExport = {
      summary: summaryStats,
      coursePerformance: analyticsData.coursePerformance,
      studentProgress: analyticsData.studentProgress,
      submissionTrends: analyticsData.submissionTrends,
      gradeDistribution: analyticsData.gradeDistribution,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Analytics data has been exported successfully",
    });
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#d084d0'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Advanced Analytics</h2>
          <p className="text-muted-foreground">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Courses" />
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
          <Button onClick={exportData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Active learners</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.averageGrade}%</div>
            <p className="text-xs text-muted-foreground">Across all courses</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">Assignment completion</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.activeAssignments}</div>
            <p className="text-xs text-muted-foreground">Total assignments</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Course Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Course Performance</CardTitle>
                <CardDescription>Average grades by course</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.coursePerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="course_title" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="average_grade" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Grade Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
                <CardDescription>Overall grade breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.gradeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ range, percentage }) => `${range}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.gradeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Student Progress Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Students</CardTitle>
              <CardDescription>Student progress and achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.studentProgress.map((student, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{student.student_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.submissions_count} submissions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={student.average_grade >= 80 ? 'default' : 'secondary'}>
                        {student.average_grade}% avg
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Submission Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Trends</CardTitle>
              <CardDescription>Daily submission activity and average grades</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={analyticsData.submissionTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="submissions"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="averageGrade"
                    stroke="#82ca9d"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          {/* Engagement Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analyticsData.engagementMetrics.map((metric, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.metric}</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">{metric.trend}</span> from last period
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};