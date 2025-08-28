import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PageLoading } from "@/components/LoadingSpinner";
import { Users, BookOpen, UserPlus, GraduationCap } from "lucide-react";

interface Student {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  enrolled_courses?: number;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  teacher_id: string;
  created_at: string;
  isEnrolled?: boolean;
  enrolledCount?: number;
}

interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  course: {
    title: string;
    description?: string;
  };
}

const Students = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    if (!user || profile?.role !== 'teacher') return;

    try {
      // Get all student profiles
      const { data: studentProfiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student');

      if (error) {
        console.error('Error fetching students:', error);
        return;
      }

      // Get enrollment counts for each student
      const studentsWithCounts = await Promise.all(
        (studentProfiles || []).map(async (student) => {
          const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.id);

          return {
            ...student,
            enrolled_courses: count || 0,
          };
        })
      );

      setStudents(studentsWithCounts);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
    }
  };

  const fetchAvailableCourses = async () => {
    if (!user || profile?.role !== 'student') return;

    try {
      // Get all courses
      const { data: allCourses, error } = await supabase
        .from('courses')
        .select('*')
        .order('title');

      if (error) {
        console.error('Error fetching courses:', error);
        return;
      }

      // Get user's enrollments
      const { data: userEnrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id);

      const enrolledCourseIds = new Set(userEnrollments?.map(e => e.course_id) || []);

      // Mark courses as enrolled and get enrollment counts
      const coursesWithStatus = await Promise.all(
        (allCourses || []).map(async (course) => {
          const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          return {
            ...course,
            isEnrolled: enrolledCourseIds.has(course.id),
            enrolledCount: count || 0,
          };
        })
      );

      setAvailableCourses(coursesWithStatus);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    }
  };

  const fetchMyEnrollments = async () => {
    if (!user || profile?.role !== 'student') return;

    try {
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses(title, description)
        `)
        .eq('student_id', user.id)
        .order('enrolled_at', { ascending: false });

      if (error) {
        console.error('Error fetching enrollments:', error);
        return;
      }

      // Transform the data to handle the join
      const transformedEnrollments = (enrollments || []).map(enrollment => ({
        ...enrollment,
        course: enrollment.courses,
      }));

      setMyEnrollments(transformedEnrollments);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load enrollments",
        variant: "destructive",
      });
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({
          student_id: user.id,
          course_id: courseId,
        });

      if (error) {
        console.error('Error enrolling:', error);
        toast({
          title: "Error",
          description: "Failed to enroll in course",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Successfully enrolled in course",
      });

      // Refresh data
      fetchAvailableCourses();
      fetchMyEnrollments();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to enroll in course",
        variant: "destructive",
      });
    }
  };

  const handleUnenroll = async (enrollmentId: string) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollmentId);

      if (error) {
        console.error('Error unenrolling:', error);
        toast({
          title: "Error",
          description: "Failed to unenroll from course",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Successfully unenrolled from course",
      });

      // Refresh data
      fetchAvailableCourses();
      fetchMyEnrollments();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to unenroll from course",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!user || !profile) return;

    const fetchData = async () => {
      setLoading(true);
      if (profile.role === 'teacher') {
        await fetchStudents();
      } else if (profile.role === 'student') {
        await Promise.all([fetchAvailableCourses(), fetchMyEnrollments()]);
      }
      setLoading(false);
    };

    fetchData();
  }, [user, profile]);

  if (loading) {
    return <PageLoading text="Loading..." />;
  }

  // Teacher View
  if (profile?.role === 'teacher') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Students</h1>
            <p className="text-muted-foreground">Manage student accounts and enrollments</p>
          </div>
          
          {students.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No students found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {students.map((student) => (
                <Card key={student.id}>
                  <CardHeader>
                    <CardTitle>
                      {student.first_name && student.last_name 
                        ? `${student.first_name} ${student.last_name}`
                        : student.email}
                    </CardTitle>
                    <CardDescription>{student.email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-4">
                      <Badge variant="secondary">
                        <GraduationCap className="w-3 h-3 mr-1" />
                        Student
                      </Badge>
                      <Badge variant="outline">
                        {student.enrolled_courses} courses
                      </Badge>
                    </div>
                    <Button className="w-full" variant="outline">
                      View Progress
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <div className="flex gap-4 justify-center">
            <Button asChild variant="outline">
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Student View
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Courses</h1>
          <p className="text-muted-foreground">Manage your course enrollments</p>
        </div>

        <Tabs defaultValue="enrolled" className="space-y-6">
          <TabsList>
            <TabsTrigger value="enrolled">My Courses ({myEnrollments.length})</TabsTrigger>
            <TabsTrigger value="available">Available Courses ({availableCourses.filter(c => !c.isEnrolled).length})</TabsTrigger>
          </TabsList>

          <TabsContent value="enrolled" className="space-y-6">
            {myEnrollments.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">You're not enrolled in any courses yet</p>
                  <p className="text-sm text-muted-foreground">Browse available courses to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myEnrollments.map((enrollment) => (
                  <Card key={enrollment.id}>
                    <CardHeader>
                      <CardTitle>{enrollment.course.title}</CardTitle>
                      <CardDescription>
                        {enrollment.course.description || "No description available"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-4">
                        <Badge>Enrolled</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(enrollment.enrolled_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Button className="w-full" asChild>
                          <Link to={`/courses/${enrollment.course_id}`}>
                            View Course
                          </Link>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => handleUnenroll(enrollment.id)}
                        >
                          Unenroll
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="available" className="space-y-6">
            {availableCourses.filter(course => !course.isEnrolled).length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No available courses to enroll in</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCourses
                  .filter(course => !course.isEnrolled)
                  .map((course) => (
                    <Card key={course.id}>
                      <CardHeader>
                        <CardTitle>{course.title}</CardTitle>
                        <CardDescription>
                          {course.description || "No description available"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mb-4">
                          <Badge variant="secondary">
                            <Users className="w-3 h-3 mr-1" />
                            {course.enrolledCount} students
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(course.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <Button 
                          className="w-full"
                          onClick={() => handleEnroll(course.id)}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Enroll
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-4 justify-center mt-8">
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Students;