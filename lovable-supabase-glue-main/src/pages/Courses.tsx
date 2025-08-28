import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PageLoading } from "@/components/LoadingSpinner";
import { CreateCourseDialog } from "@/components/CreateCourseDialog";

interface Course {
  id: string;
  title: string;
  description?: string;
  teacher_id: string;
  created_at: string;
  enrolled_count?: number;
}

const Courses = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  const fetchCourses = async () => {
    if (!user) return;

    try {
      // Fetch courses first without enrollment counts to avoid RLS recursion
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select('*');

      if (error) {
        console.error('Error fetching courses:', error);
        toast({
          title: "Error",
          description: "Failed to load courses",
          variant: "destructive",
        });
        return;
      }

      // For each course, fetch enrollment count separately if user is a teacher
      const coursesWithCount = await Promise.all(
        (coursesData || []).map(async (course) => {
          let enrolled_count = 0;
          
          // Only fetch enrollment count if user is the teacher of this course
          if (course.teacher_id === user.id) {
            const { count } = await supabase
              .from('enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id);
            enrolled_count = count || 0;
          }
          
          return {
            ...course,
            enrolled_count,
          };
        })
      );

      setCourses(coursesWithCount);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
      if (!user) return;

    fetchCourses();
  }, [user, toast]);

  if (loading || !user) {
    return <PageLoading text="Loading courses..." />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Courses</h1>
          <p className="text-muted-foreground">Manage your course content and curriculum</p>
        </div>
        
        {loadingCourses ? (
          <div className="text-center py-8">Loading courses...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {courses.length === 0 ? (
                <Card className="col-span-full">
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No courses found</p>
                  <p className="text-sm text-muted-foreground mt-2">Create your first course to get started</p>
                </CardContent>
              </Card>
            ) : (
              courses.map((course) => (
                <Card key={course.id}>
                  <CardHeader>
                    <CardTitle>{course.title}</CardTitle>
                    <CardDescription>{course.description || "No description available"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-4">
                      <Badge variant="secondary">{course.enrolled_count || 0} students</Badge>
                      <Badge>Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Created: {new Date(course.created_at).toLocaleDateString()}
                    </p>
                    <Button 
                      className="w-full" 
                      onClick={() => navigate(`/courses/${course.id}`)}
                    >
                      Manage Course
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
        
        <div className="flex gap-4 justify-center">
          <CreateCourseDialog onCourseCreated={fetchCourses} />
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
          <Button onClick={signOut} variant="destructive">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Courses;