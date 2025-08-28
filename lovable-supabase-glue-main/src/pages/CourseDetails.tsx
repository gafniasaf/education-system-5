import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, BookOpen } from "lucide-react";
import { CreateAssignmentDialog } from "@/components/CreateAssignmentDialog";

interface Course {
  id: string;
  title: string;
  description?: string;
  teacher_id: string;
  created_at: string;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  points_possible?: number;
  created_at: string;
}

interface Enrollment {
  id: string;
  student_id: string;
  enrolled_at: string;
  student?: {
    first_name?: string;
    last_name?: string;
    email: string;
    role: string;
  };
}

const CourseDetails = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  const fetchCourseData = async () => {
    if (!user || !courseId) return;

    try {
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) {
        console.error('Error fetching course:', courseError);
        toast({
          title: "Error",
          description: "Failed to load course",
          variant: "destructive",
        });
        navigate("/courses");
        return;
      }

      setCourse(courseData);

      // Fetch assignments for this course
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
      } else {
        setAssignments(assignmentsData || []);
      }

      // Fetch enrollments for this course with profiles
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId);

      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError);
      } else {
        // Fetch profiles separately for enrolled students
        if (enrollmentsData && enrollmentsData.length > 0) {
          const studentIds = enrollmentsData.map(e => e.student_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, role')
            .in('id', studentIds);

          // Combine enrollment and profile data
          const enrollmentsWithProfiles = enrollmentsData.map(enrollment => ({
            ...enrollment,
            student: profilesData?.find(profile => profile.id === enrollment.student_id) || {
              first_name: '',
              last_name: '',
              email: 'Unknown',
              role: 'student'
            }
          }));

          setEnrollments(enrollmentsWithProfiles);
        } else {
          setEnrollments([]);
        }
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load course data",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [user, courseId, toast, navigate]);

  if (loading || !user || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-foreground mb-4">Course not found</h1>
            <Button onClick={() => navigate("/courses")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate("/courses")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{course.title}</h1>
              <p className="text-muted-foreground mb-4">{course.description || "No description available"}</p>
              <div className="flex gap-4">
                <Badge variant="secondary">
                  <Users className="mr-1 h-3 w-3" />
                  {enrollments.length} students
                </Badge>
                <Badge variant="secondary">
                  <BookOpen className="mr-1 h-3 w-3" />
                  {assignments.length} assignments
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Students Enrolled</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{enrollments.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Total Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{assignments.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Course Created</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {new Date(course.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Assignments</h2>
              <CreateAssignmentDialog courseId={courseId!} onAssignmentCreated={fetchCourseData} />
            </div>
            
            {assignments.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No assignments created yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Create your first assignment to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {assignments.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{assignment.title}</CardTitle>
                          <CardDescription>{assignment.description || "No description"}</CardDescription>
                        </div>
                        <Badge>{assignment.points_possible || 0} points</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(assignment.created_at).toLocaleDateString()}
                          {assignment.due_date && (
                            <span className="ml-4">
                              Due: {new Date(assignment.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/assignments/${assignment.id}`)}
                        >
                          Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Enrolled Students</h2>
              <Button variant="outline">Export List</Button>
            </div>
            
            {enrollments.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No students enrolled yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Students can enroll themselves in this course</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {enrollments.map((enrollment) => (
                  <Card key={enrollment.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">
                            {enrollment.student?.first_name || enrollment.student?.last_name 
                              ? `${enrollment.student.first_name || ''} ${enrollment.student.last_name || ''}`.trim()
                              : enrollment.student?.email || 'Unknown Student'
                            }
                          </h3>
                          <p className="text-sm text-muted-foreground">{enrollment.student?.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">View Progress</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CourseDetails;