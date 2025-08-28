import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateAssignmentDialog } from "@/components/CreateAssignmentDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoading } from "@/components/LoadingSpinner";
import { Calendar, FileText, Users } from "lucide-react";

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
}

interface Course {
  id: string;
  title: string;
}

const Assignments = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

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

      // Filter by course if selected
      if (selectedCourseId !== "all") {
        query = query.eq('course_id', selectedCourseId);
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

      // Transform data and fetch submission counts + course titles for each assignment
      const assignmentsWithCounts = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          let submission_count = 0;
          let courseTitle = "Unknown Course";
          
          // Fetch submission count for this assignment
          const { count } = await supabase
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id);
          
          submission_count = count || 0;

          // Fetch course title
          const { data: courseData } = await supabase
            .from('courses')
            .select('title')
            .eq('id', assignment.course_id)
            .single();

          if (courseData) {
            courseTitle = courseData.title;
          }

          return {
            ...assignment,
            course: { title: courseTitle },
            submission_count,
          };
        })
      );

      setAssignments(assignmentsWithCounts);
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

  useEffect(() => {
    if (!user || !profile) return;
    fetchCourses();
    fetchAssignments();
  }, [user, profile, selectedCourseId]);

  // Set up real-time subscription for assignments
  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase
      .channel('assignments-page-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments'
        },
        (payload) => {
          console.log('Assignment change detected:', payload);
          // Refetch assignments when changes occur
          fetchAssignments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile, fetchAssignments]);

  const getAssignmentStatus = (assignment: Assignment) => {
    if (!assignment.due_date) return "active";
    
    const dueDate = new Date(assignment.due_date);
    const now = new Date();
    
    if (dueDate < now) return "overdue";
    if (dueDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) return "due-soon";
    return "active";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "due-soon":
        return <Badge variant="secondary">Due Soon</Badge>;
      default:
        return <Badge>Active</Badge>;
    }
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return "No due date";
    return new Date(dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <PageLoading text="Loading assignments..." />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Assignments</h1>
          <p className="text-muted-foreground">Create and manage student assignments</p>
        </div>

        {/* Course Filter */}
        <div className="mb-6 flex items-center gap-4">
          <label htmlFor="course-filter" className="text-sm font-medium">
            Filter by course:
          </label>
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
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
        
        {assignments.length === 0 ? (
          <Card className="mb-8">
            <CardContent className="pt-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">
                {selectedCourseId === "all" ? "No assignments found" : "No assignments found for this course"}
              </p>
              <p className="text-sm text-muted-foreground">
                Create your first assignment to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {assignments.map((assignment) => {
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
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{assignment.course?.title}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDueDate(assignment.due_date)}</span>
                      </div>
                      {getStatusBadge(status)}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{assignment.submission_count || 0} submissions</span>
                      {assignment.points_possible && (
                        <span className="ml-auto">{assignment.points_possible} pts</span>
                      )}
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={() => navigate(`/assignments/${assignment.id}`)}
                    >
                      Manage Assignment
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        <div className="flex gap-4 justify-center">
          {profile?.role === 'teacher' && (
            <CreateAssignmentDialog 
              onAssignmentCreated={fetchAssignments}
            />
          )}
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Assignments;