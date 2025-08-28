import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreateAssignmentDialog } from '@/components/CreateAssignmentDialog';
import { AssignmentAnalytics } from '@/components/AssignmentAnalytics';
import { SubmissionTracking } from '@/components/SubmissionTracking';
import { 
  Search, 
  Filter, 
  Calendar, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Plus,
  Eye,
  Settings
} from 'lucide-react';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  course_id: string;
  due_date?: string;
  points_possible?: number;
  created_at: string;
  course?: {
    title: string;
  };
  submission_count?: number;
  graded_count?: number;
  average_grade?: number;
  completion_rate?: number;
}

interface Course {
  id: string;
  title: string;
}

interface OverallStats {
  totalAssignments: number;
  activeAssignments: number;
  overdueAssignments: number;
  totalSubmissions: number;
  avgCompletionRate: number;
  avgGrade: number;
}

const AssignmentManagement = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);

  const fetchCourses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');

      if (error) {
        console.error('Error fetching courses:', error);
        return;
      }

      setCourses(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchAssignments = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedCourse !== 'all') {
        query = query.eq('course_id', selectedCourse);
      }

      const { data: assignmentsData, error } = await query;

      if (error) {
        console.error('Error fetching assignments:', error);
        toast({
          title: "Error",
          description: "Failed to load assignments",
          variant: "destructive",
        });
        return;
      }

      // Enhance assignments with submission and grading data
      const enhancedAssignments = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          // Fetch course title
          const { data: courseData } = await supabase
            .from('courses')
            .select('title')
            .eq('id', assignment.course_id)
            .single();

          // Fetch submission statistics
          const { data: submissions } = await supabase
            .from('submissions')
            .select('grade, student_id')
            .eq('assignment_id', assignment.id);

          const submissionCount = submissions?.length || 0;
          const gradedCount = submissions?.filter(s => s.grade !== null && s.grade !== undefined).length || 0;
          
          // Calculate average grade
          const gradedSubmissions = submissions?.filter(s => s.grade !== null && s.grade !== undefined) || [];
          const averageGrade = gradedSubmissions.length > 0
            ? gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length
            : 0;

          // Calculate completion rate (submissions vs enrolled students)
          const { count: enrolledCount } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', assignment.course_id);

          const completionRate = enrolledCount > 0 ? (submissionCount / enrolledCount) * 100 : 0;

          return {
            ...assignment,
            course: courseData || { title: "Unknown Course" },
            submission_count: submissionCount,
            graded_count: gradedCount,
            average_grade: averageGrade,
            completion_rate: completionRate,
          };
        })
      );

      setAssignments(enhancedAssignments);
      calculateOverallStats(enhancedAssignments);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallStats = (assignments: Assignment[]) => {
    const now = new Date();
    const activeAssignments = assignments.filter(a => 
      !a.due_date || new Date(a.due_date) > now
    );
    const overdueAssignments = assignments.filter(a => 
      a.due_date && new Date(a.due_date) < now
    );

    const totalSubmissions = assignments.reduce((sum, a) => sum + (a.submission_count || 0), 0);
    const avgCompletionRate = assignments.length > 0
      ? assignments.reduce((sum, a) => sum + (a.completion_rate || 0), 0) / assignments.length
      : 0;
    
    const gradedAssignments = assignments.filter(a => (a.graded_count || 0) > 0);
    const avgGrade = gradedAssignments.length > 0
      ? gradedAssignments.reduce((sum, a) => sum + (a.average_grade || 0), 0) / gradedAssignments.length
      : 0;

    setOverallStats({
      totalAssignments: assignments.length,
      activeAssignments: activeAssignments.length,
      overdueAssignments: overdueAssignments.length,
      totalSubmissions,
      avgCompletionRate,
      avgGrade,
    });
  };

  const getAssignmentStatus = (assignment: Assignment) => {
    if (!assignment.due_date) return { status: 'active', label: 'Active', variant: 'default' as const };
    
    const dueDate = new Date(assignment.due_date);
    const now = new Date();
    
    if (dueDate < now) return { status: 'overdue', label: 'Overdue', variant: 'destructive' as const };
    if (dueDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return { status: 'due-soon', label: 'Due Soon', variant: 'secondary' as const };
    }
    return { status: 'active', label: 'Active', variant: 'default' as const };
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.course?.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || getAssignmentStatus(assignment).status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    if (user && profile) {
      fetchCourses();
      fetchAssignments();
    }
  }, [user, profile, selectedCourse]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading assignment management...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Assignment Management</h1>
              <p className="text-muted-foreground">Comprehensive assignment and submission overview</p>
            </div>
            <CreateAssignmentDialog onAssignmentCreated={fetchAssignments} />
          </div>
        </div>

        {/* Overall Statistics */}
        {overallStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{overallStats.totalAssignments}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{overallStats.activeAssignments}</div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold">{overallStats.overdueAssignments}</div>
                    <div className="text-sm text-muted-foreground">Overdue</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{overallStats.totalSubmissions}</div>
                    <div className="text-sm text-muted-foreground">Submissions</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold">{Math.round(overallStats.avgCompletionRate)}%</div>
                    <div className="text-sm text-muted-foreground">Avg Completion</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold">{Math.round(overallStats.avgGrade)}</div>
                    <div className="text-sm text-muted-foreground">Avg Grade</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="assignments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search assignments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="w-[200px]">
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
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="due-soon">Due Soon</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Assignments Grid */}
            {filteredAssignments.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No assignments found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || selectedCourse !== 'all' || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first assignment to get started'
                    }
                  </p>
                  <CreateAssignmentDialog onAssignmentCreated={fetchAssignments} />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssignments.map((assignment) => {
                  const status = getAssignmentStatus(assignment);
                  return (
                    <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="line-clamp-2">{assignment.title}</CardTitle>
                            <CardDescription className="line-clamp-2 mt-1">
                              {assignment.description || "No description available"}
                            </CardDescription>
                          </div>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>{assignment.course?.title}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Assignment Info */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Due Date</div>
                              <div className="font-medium">
                                {assignment.due_date ? formatDate(assignment.due_date) : 'No due date'}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Points</div>
                              <div className="font-medium">{assignment.points_possible || 'Not set'}</div>
                            </div>
                          </div>

                          {/* Submission Stats */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Submissions</div>
                              <div className="font-medium">{assignment.submission_count || 0}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Graded</div>
                              <div className="font-medium">{assignment.graded_count || 0}</div>
                            </div>
                          </div>

                          {/* Performance Metrics */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Completion Rate</span>
                              <span className="font-medium">{Math.round(assignment.completion_rate || 0)}%</span>
                            </div>
                            {assignment.average_grade > 0 && (
                              <div className="flex justify-between text-sm">
                                <span>Average Grade</span>
                                <span className="font-medium">{Math.round(assignment.average_grade)}/{assignment.points_possible}</span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => navigate(`/assignments/${assignment.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Manage
                            </Button>
                            <Button size="sm" variant="outline">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assignment Performance Analytics</CardTitle>
                <CardDescription>
                  Comprehensive overview of assignment performance across all courses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overallStats ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">{overallStats.totalAssignments}</div>
                        <div className="text-sm text-muted-foreground">Total Assignments</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{Math.round(overallStats.avgCompletionRate)}%</div>
                        <div className="text-sm text-muted-foreground">Avg Completion Rate</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{Math.round(overallStats.avgGrade)}</div>
                        <div className="text-sm text-muted-foreground">Average Grade</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{overallStats.totalSubmissions}</div>
                        <div className="text-sm text-muted-foreground">Total Submissions</div>
                      </div>
                    </div>
                    
                    <div className="text-center py-8">
                      <BarChart3 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Detailed Analytics Coming Soon</h3>
                      <p className="text-muted-foreground">
                        Advanced analytics and visualizations will be available in the next update
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Data Available</h3>
                    <p className="text-muted-foreground">
                      Create some assignments to see analytics data
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AssignmentManagement;