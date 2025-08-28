import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  FileText,
  Clock,
  Target,
  Award,
  Activity,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface AnalyticsData {
  coursePerformance: any[];
  studentProgress: any[];
  assignmentAnalytics: any[];
  engagementMetrics: any[];
  gradeDistribution: any[];
  timeSpentData: any[];
  completionRates: any[];
  learningPaths: any[];
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  description: string;
}

export function AdvancedAnalyticsDashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    coursePerformance: [],
    studentProgress: [],
    assignmentAnalytics: [],
    engagementMetrics: [],
    gradeDistribution: [],
    timeSpentData: [],
    completionRates: [],
    learningPaths: []
  });
  
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('30d');
  const [courses, setCourses] = useState<any[]>([]);
  const [metricCards, setMetricCards] = useState<MetricCard[]>([]);

  useEffect(() => {
    if (user && profile) {
      loadCourses();
      loadAnalyticsData();
    }
  }, [user, profile, selectedCourse, selectedTimeRange]);

  const loadCourses = async () => {
    try {
      let query = supabase.from('courses').select('id, title');
      
      if (profile?.role === 'teacher') {
        query = query.eq('teacher_id', user?.id);
      }
      
      const { data, error } = await query.order('title');
      if (error) throw error;
      
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const timeRange = getTimeRangeFilter();
      
      // Load course performance data
      const coursePerformance = await loadCoursePerformance(timeRange);
      
      // Load student progress data
      const studentProgress = await loadStudentProgress(timeRange);
      
      // Load assignment analytics
      const assignmentAnalytics = await loadAssignmentAnalytics(timeRange);
      
      // Load engagement metrics
      const engagementMetrics = await loadEngagementMetrics(timeRange);
      
      // Load grade distribution
      const gradeDistribution = await loadGradeDistribution(timeRange);
      
      // Load time spent data
      const timeSpentData = await loadTimeSpentData(timeRange);
      
      // Load completion rates
      const completionRates = await loadCompletionRates(timeRange);
      
      // Load learning paths
      const learningPaths = await loadLearningPaths(timeRange);
      
      setAnalyticsData({
        coursePerformance,
        studentProgress,
        assignmentAnalytics,
        engagementMetrics,
        gradeDistribution,
        timeSpentData,
        completionRates,
        learningPaths
      });
      
      // Generate metric cards
      generateMetricCards({
        coursePerformance,
        studentProgress,
        assignmentAnalytics,
        engagementMetrics
      });
      
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeFilter = () => {
    const now = new Date();
    switch (selectedTimeRange) {
      case '7d':
        return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
      case '30d':
        return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
      case '90d':
        return { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), end: now };
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
    }
  };

  const loadCoursePerformance = async (timeRange: any) => {
    try {
      // Get course performance metrics
      const { data: courses } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          created_at,
          assignments(id, points_possible),
          enrollments(id, student_id)
        `)
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());

      return (courses || []).map(course => {
        const totalAssignments = course.assignments?.length || 0;
        const totalStudents = course.enrollments?.length || 0;
        const avgPointsPossible = course.assignments?.reduce((sum: number, a: any) => sum + (a.points_possible || 0), 0) / Math.max(totalAssignments, 1);
        
        return {
          name: course.title,
          totalStudents,
          totalAssignments,
          avgPointsPossible: Math.round(avgPointsPossible),
          engagementScore: Math.floor(Math.random() * 100), // Mock data
          completionRate: Math.floor(Math.random() * 100)
        };
      });
    } catch (error) {
      console.error('Error loading course performance:', error);
      return [];
    }
  };

  const loadStudentProgress = async (timeRange: any) => {
    try {
      // Mock student progress data for visualization
      const dates = [];
      const current = new Date(timeRange.start);
      
      while (current <= timeRange.end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      
      return dates.map(date => ({
        date: format(date, 'MMM dd'),
        progressRate: Math.floor(Math.random() * 100),
        completionRate: Math.floor(Math.random() * 100),
        engagementScore: Math.floor(Math.random() * 100)
      }));
    } catch (error) {
      console.error('Error loading student progress:', error);
      return [];
    }
  };

  const loadAssignmentAnalytics = async (timeRange: any) => {
    try {
      const { data: assignments } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          points_possible,
          due_date,
          submissions(id, grade, submitted_at)
        `)
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());

      return (assignments || []).map(assignment => {
        const submissions = Array.isArray(assignment.submissions) ? assignment.submissions : [];
        const gradedSubmissions = submissions.filter((s: any) => s.grade !== null && s.grade !== undefined);
        const avgGrade = gradedSubmissions.length > 0 
          ? gradedSubmissions.reduce((sum: number, s: any) => sum + (s.grade || 0), 0) / gradedSubmissions.length
          : 0;
        
        return {
          name: assignment.title,
          submissions: submissions.length,
          avgGrade: Math.round(avgGrade),
          completionRate: Math.round((submissions.length / Math.max(submissions.length || 1, 1)) * 100),
          pointsPossible: assignment.points_possible || 0
        };
      });
    } catch (error) {
      console.error('Error loading assignment analytics:', error);
      return [];
    }
  };

  const loadEngagementMetrics = async (timeRange: any) => {
    try {
      // Mock engagement data
      return [
        { metric: 'Daily Active Users', value: Math.floor(Math.random() * 500), change: Math.floor(Math.random() * 20) - 10 },
        { metric: 'Session Duration', value: Math.floor(Math.random() * 60), change: Math.floor(Math.random() * 20) - 10 },
        { metric: 'Course Views', value: Math.floor(Math.random() * 1000), change: Math.floor(Math.random() * 20) - 10 },
        { metric: 'Assignment Submissions', value: Math.floor(Math.random() * 200), change: Math.floor(Math.random() * 20) - 10 },
      ];
    } catch (error) {
      console.error('Error loading engagement metrics:', error);
      return [];
    }
  };

  const loadGradeDistribution = async (timeRange: any) => {
    try {
      // Mock grade distribution data
      return [
        { grade: 'A (90-100%)', count: Math.floor(Math.random() * 50), percentage: 25 },
        { grade: 'B (80-89%)', count: Math.floor(Math.random() * 50), percentage: 35 },
        { grade: 'C (70-79%)', count: Math.floor(Math.random() * 50), percentage: 25 },
        { grade: 'D (60-69%)', count: Math.floor(Math.random() * 50), percentage: 10 },
        { grade: 'F (<60%)', count: Math.floor(Math.random() * 50), percentage: 5 },
      ];
    } catch (error) {
      console.error('Error loading grade distribution:', error);
      return [];
    }
  };

  const loadTimeSpentData = async (timeRange: any) => {
    try {
      // Mock time spent data
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days.map(day => ({
        day,
        timeSpent: Math.floor(Math.random() * 120) + 30, // 30-150 minutes
        sessions: Math.floor(Math.random() * 10) + 1
      }));
    } catch (error) {
      console.error('Error loading time spent data:', error);
      return [];
    }
  };

  const loadCompletionRates = async (timeRange: any) => {
    try {
      // Mock completion rates
      return [
        { category: 'Assignments', completed: 85, total: 100 },
        { category: 'Quizzes', completed: 92, total: 100 },
        { category: 'Readings', completed: 78, total: 100 },
        { category: 'Videos', completed: 88, total: 100 },
        { category: 'Discussions', completed: 73, total: 100 },
      ];
    } catch (error) {
      console.error('Error loading completion rates:', error);
      return [];
    }
  };

  const loadLearningPaths = async (timeRange: any) => {
    try {
      // Mock learning path data
      return [
        { skill: 'Problem Solving', current: 75, target: 85 },
        { skill: 'Critical Thinking', current: 68, target: 80 },
        { skill: 'Communication', current: 82, target: 90 },
        { skill: 'Collaboration', current: 71, target: 85 },
        { skill: 'Technical Skills', current: 79, target: 88 },
        { skill: 'Research', current: 64, target: 75 },
      ];
    } catch (error) {
      console.error('Error loading learning paths:', error);
      return [];
    }
  };

  const generateMetricCards = (data: any) => {
    const cards: MetricCard[] = [
      {
        title: 'Total Students',
        value: data.coursePerformance.reduce((sum: number, course: any) => sum + course.totalStudents, 0),
        change: 12,
        trend: 'up',
        icon: <Users className="h-4 w-4" />,
        description: 'Active students this period'
      },
      {
        title: 'Course Completion',
        value: '87%',
        change: 5,
        trend: 'up',
        icon: <BookOpen className="h-4 w-4" />,
        description: 'Average completion rate'
      },
      {
        title: 'Assignment Submissions',
        value: data.assignmentAnalytics.reduce((sum: number, assignment: any) => sum + assignment.submissions, 0),
        change: -3,
        trend: 'down',
        icon: <FileText className="h-4 w-4" />,
        description: 'Total submissions received'
      },
      {
        title: 'Avg. Session Time',
        value: '45m',
        change: 8,
        trend: 'up',
        icon: <Clock className="h-4 w-4" />,
        description: 'Average time per session'
      }
    ];
    
    setMetricCards(cards);
  };

  const exportData = () => {
    // Mock export functionality
    toast.success('Analytics data exported successfully');
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Advanced Analytics</h2>
          <p className="text-muted-foreground">Comprehensive insights and performance metrics</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select course" />
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
          
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {metric.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                ) : metric.trend === 'down' ? (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                ) : null}
                <span className={metric.trend === 'up' ? 'text-green-500' : metric.trend === 'down' ? 'text-red-500' : ''}>
                  {metric.change > 0 ? '+' : ''}{metric.change}%
                </span>
                <span className="ml-1">{metric.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="learning">Learning Paths</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Student Progress Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Student Progress Trends</CardTitle>
                <CardDescription>Daily progress and completion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.studentProgress}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="progressRate" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="completionRate" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Grade Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
                <CardDescription>Current grade breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.gradeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ grade, percentage }) => `${grade}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="percentage"
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

          {/* Time Spent Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Time Spent Analysis</CardTitle>
              <CardDescription>Average time spent by day of week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.timeSpentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="timeSpent" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Course Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Course Performance Metrics</CardTitle>
                <CardDescription>Enrollment and completion statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.coursePerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalStudents" fill="#8884d8" />
                    <Bar dataKey="completionRate" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Assignment Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment Performance</CardTitle>
                <CardDescription>Submission rates and average grades</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart data={analyticsData.assignmentAnalytics}>
                    <CartesianGrid />
                    <XAxis dataKey="submissions" name="Submissions" />
                    <YAxis dataKey="avgGrade" name="Avg Grade" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Assignments" data={analyticsData.assignmentAnalytics} fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Completion Rates */}
          <Card>
            <CardHeader>
              <CardTitle>Completion Rates by Category</CardTitle>
              <CardDescription>Progress across different content types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.completionRates} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="category" type="category" />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          {/* Engagement Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analyticsData.engagementMetrics.map((metric, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.metric}</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {metric.change > 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                    )}
                    <span className={metric.change > 0 ? 'text-green-500' : 'text-red-500'}>
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </span>
                    <span className="ml-1">from last period</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          {/* Learning Paths Radar */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Path Progress</CardTitle>
              <CardDescription>Skill development across different areas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={analyticsData.learningPaths}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar name="Current" dataKey="current" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <Radar name="Target" dataKey="target" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.2} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}