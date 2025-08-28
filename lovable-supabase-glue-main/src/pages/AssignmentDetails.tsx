import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/FileUpload";
import { CreateRubricDialog } from "@/components/CreateRubricDialog";
import { RubricGrading } from "@/components/RubricGrading";
import { SubmissionTracking } from "@/components/SubmissionTracking";
import { AssignmentAnalytics } from "@/components/AssignmentAnalytics";
import { EnhancedGradingInterface } from "@/components/EnhancedGradingInterface";
import { StudentSubmissionInterface } from "@/components/assignments/StudentSubmissionInterface";
import { GradeAnalyticsDashboard } from "@/components/grading/GradeAnalyticsDashboard";
import { EnhancedGradingForm } from "@/components/grading/EnhancedGradingForm";
import { ArrowLeft, Calendar, FileText, Users, CheckCircle, Clock, AlertCircle, Paperclip, BarChart3 } from "lucide-react";

interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  points_possible?: number;
  created_at: string;
  course_id: string;
  resource_files?: FileAttachment[];
  course?: {
    title: string;
    teacher_id: string;
  };
}

interface Submission {
  id: string;
  student_id: string;
  assignment_id: string;
  content?: string;
  grade?: number;
  feedback?: string;
  submitted_at: string;
  graded_at?: string;
  graded_by?: string;
  file_attachments?: FileAttachment[];
  student?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

const AssignmentDetails = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userSubmission, setUserSubmission] = useState<Submission | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [submissionFiles, setSubmissionFiles] = useState<FileAttachment[]>([]);
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [selectedRubric, setSelectedRubric] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showEnhancedGrading, setShowEnhancedGrading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const fetchRubrics = async () => {
    if (!assignmentId) return;

    try {
      const { data: rubricsData, error } = await supabase
        .from('rubrics')
        .select('*')
        .eq('assignment_id', assignmentId);

      if (error) {
        console.error('Error fetching rubrics:', error);
      } else {
        setRubrics(rubricsData || []);
        if (rubricsData && rubricsData.length > 0) {
          setSelectedRubric(rubricsData[0].id);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchAssignmentData = async () => {
    if (!assignmentId || !user) return;

    try {
      // Fetch assignment details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (assignmentError) {
        console.error('Error fetching assignment:', assignmentError);
        toast({
          title: "Error",
          description: "Failed to load assignment",
          variant: "destructive",
        });
        return;
      }

      // Fetch course details separately
      const { data: courseData } = await supabase
        .from('courses')
        .select('title, teacher_id')
        .eq('id', assignmentData.course_id)
        .single();

      setAssignment({
        ...assignmentData,
        course: courseData || { title: "Unknown Course", teacher_id: "" },
        resource_files: Array.isArray(assignmentData.resource_files) ? (assignmentData.resource_files as unknown as FileAttachment[]) : [],
      });

      // If user is a teacher, fetch all submissions
      if (profile?.role === 'teacher') {
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false });

        if (submissionsError) {
          console.error('Error fetching submissions:', submissionsError);
        } else {
          // Fetch student profiles for each submission
          const submissionsWithStudents = await Promise.all(
            (submissionsData || []).map(async (submission) => {
              const { data: studentData } = await supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', submission.student_id)
                .single();

              return {
                ...submission,
                student: studentData || { first_name: "", last_name: "", email: "Unknown" },
                file_attachments: Array.isArray(submission.file_attachments) ? (submission.file_attachments as unknown as FileAttachment[]) : [],
              };
            })
          );
          setSubmissions(submissionsWithStudents);
        }
      }

      // If user is a student, fetch their submission
      if (profile?.role === 'student') {
        const { data: userSubmissionData, error: userSubmissionError } = await supabase
          .from('submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('student_id', user.id)
          .not('submitted_at', 'is', null)
          .maybeSingle();

        if (userSubmissionError) {
          console.error('Error fetching user submission:', userSubmissionError);
        } else if (userSubmissionData) {
          setUserSubmission({
            ...userSubmissionData,
            file_attachments: Array.isArray(userSubmissionData.file_attachments) ? (userSubmissionData.file_attachments as unknown as FileAttachment[]) : [],
          });
          setSubmissionContent(userSubmissionData.content || "");
          
          // Parse file attachments from JSONB
          if (userSubmissionData.file_attachments && Array.isArray(userSubmissionData.file_attachments)) {
            setSubmissionFiles(userSubmissionData.file_attachments as unknown as FileAttachment[]);
          }
        }
      }

      // Fetch rubrics
      await fetchRubrics();
      
      // Fetch analytics data for teachers
      if (profile?.role === 'teacher') {
        await fetchAnalyticsData();
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load assignment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!user || !assignmentId || (!submissionContent.trim() && submissionFiles.length === 0)) {
      toast({
        title: "Error",
        description: "Please provide content or upload files",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const submissionData = {
        content: submissionContent || null,
        file_attachments: JSON.parse(JSON.stringify(submissionFiles)),
        submitted_at: new Date().toISOString(),
      };

      if (userSubmission) {
        // Update existing submission
        const { error } = await supabase
          .from('submissions')
          .update(submissionData)
          .eq('id', userSubmission.id);

        if (error) {
          console.error('Error updating submission:', error);
          toast({
            title: "Error",
            description: "Failed to update submission",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Success",
          description: "Assignment updated successfully",
        });
      } else {
        // Create new submission
        const { error } = await supabase
          .from('submissions')
          .insert({
            student_id: user.id,
            assignment_id: assignmentId,
            content: submissionContent || null,
            file_attachments: JSON.parse(JSON.stringify(submissionFiles)),
          });

        if (error) {
          console.error('Error creating submission:', error);
          toast({
            title: "Error",
            description: "Failed to submit assignment",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Success",
          description: "Assignment submitted successfully",
        });
      }

      // Refresh data
      await fetchAssignmentData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to submit assignment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          grade,
          feedback,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (error) {
        console.error('Error grading submission:', error);
        toast({
          title: "Error",
          description: "Failed to grade submission",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Submission graded successfully",
      });

      // Refresh data
      await fetchAssignmentData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to grade submission",
        variant: "destructive",
      });
    }
  };

  const getSubmissionStatus = (submission: Submission | null, dueDate?: string) => {
    if (!submission) return { status: "not-submitted", label: "Not Submitted", icon: Clock, variant: "secondary" as const };
    
    if (submission.grade !== null && submission.grade !== undefined) {
      return { status: "graded", label: "Graded", icon: CheckCircle, variant: "default" as const };
    }
    
    if (dueDate && new Date(submission.submitted_at) > new Date(dueDate)) {
      return { status: "late", label: "Submitted Late", icon: AlertCircle, variant: "destructive" as const };
    }
    
    return { status: "submitted", label: "Submitted", icon: CheckCircle, variant: "default" as const };
  };

  const fetchAnalyticsData = async () => {
    if (!assignmentId || !assignment) return;

    try {
      // Calculate submission stats
      const totalStudents = await getTotalStudentsCount();
      const submissionStats = {
        totalStudents,
        submitted: submissions.length,
        graded: submissions.filter(s => s.grade !== null && s.grade !== undefined).length,
        pending: submissions.filter(s => s.grade === null || s.grade === undefined).length,
        overdue: submissions.filter(s => 
          assignment.due_date && new Date(s.submitted_at) > new Date(assignment.due_date)
        ).length,
      };

      // Calculate grade distribution
      const gradedSubmissions = submissions.filter(s => s.grade !== null && s.grade !== undefined);
      const gradeDistribution = calculateGradeDistribution(gradedSubmissions, assignment.points_possible || 100);
      
      // Calculate averages
      const averageGrade = gradedSubmissions.length > 0 
        ? gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length
        : 0;
      
      const averageSubmissionTime = calculateAverageSubmissionTime(submissions, assignment.due_date);

      setAnalyticsData({
        averageGrade,
        maxPossiblePoints: assignment.points_possible || 100,
        submissionCount: submissions.length,
        gradeDistribution,
        completionRate: totalStudents > 0 ? (submissions.length / totalStudents) * 100 : 0,
        averageSubmissionTime,
        totalStudents,
        submissionStats,
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  };

  const getTotalStudentsCount = async () => {
    if (!assignment?.course_id) return 0;
    
    const { count } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', assignment.course_id);
    
    return count || 0;
  };

  const calculateGradeDistribution = (gradedSubmissions: Submission[], maxPoints: number) => {
    const ranges = [
      { range: '90-100', min: 90, max: 100 },
      { range: '80-89', min: 80, max: 89 },
      { range: '70-79', min: 70, max: 79 },
      { range: '60-69', min: 60, max: 69 },
      { range: '<60', min: 0, max: 59 },
    ];

    return ranges.map(({ range, min, max }) => {
      const count = gradedSubmissions.filter(s => {
        const percentage = ((s.grade || 0) / maxPoints) * 100;
        return percentage >= min && percentage <= max;
      }).length;
      
      const percentage = gradedSubmissions.length > 0 ? (count / gradedSubmissions.length) * 100 : 0;
      
      return { range, count, percentage };
    });
  };

  const calculateAverageSubmissionTime = (submissions: Submission[], dueDate?: string) => {
    if (!dueDate || submissions.length === 0) return 0;
    
    const dueDateObj = new Date(dueDate);
    const validSubmissions = submissions.filter(s => new Date(s.submitted_at) <= dueDateObj);
    
    if (validSubmissions.length === 0) return 0;
    
    const totalHours = validSubmissions.reduce((sum, s) => {
      const submissionDate = new Date(s.submitted_at);
      const hoursEarly = (dueDateObj.getTime() - submissionDate.getTime()) / (1000 * 60 * 60);
      return sum + Math.max(0, hoursEarly);
    }, 0);
    
    return totalHours / validSubmissions.length;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    fetchAssignmentData();
  }, [assignmentId, user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading assignment...</div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Assignment not found</h2>
          <Button onClick={() => navigate('/assignments')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assignments
          </Button>
        </div>
      </div>
    );
  }

  const submissionStatus = getSubmissionStatus(userSubmission, assignment.due_date);
  const isOverdue = assignment.due_date && new Date() > new Date(assignment.due_date);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/assignments')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assignments
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">{assignment.title}</h1>
              <p className="text-muted-foreground mb-4">
                {assignment.description || "No description provided"}
              </p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>{assignment.course?.title}</span>
                </div>
                {assignment.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Due: {formatDate(assignment.due_date)}</span>
                  </div>
                )}
                {assignment.points_possible && (
                  <span>{assignment.points_possible} points</span>
                )}
              </div>
            </div>
            
            {profile?.role === 'student' && (
              <div className="ml-4">
                <Badge variant={submissionStatus.variant} className="flex items-center gap-1">
                  <submissionStatus.icon className="w-3 h-3" />
                  {submissionStatus.label}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Assignment Resources */}
        {assignment.resource_files && assignment.resource_files.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="w-5 h-5" />
                Assignment Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                bucketName="course-resources"
                folder={assignment.course_id}
                existingFiles={assignment.resource_files}
                onFilesChange={() => {}} // Read-only
                disabled={true}
                maxFiles={5}
              />
            </CardContent>
          </Card>
        )}

        {profile?.role === 'student' ? (
          // Student View - Enhanced Submission Interface
          <StudentSubmissionInterface 
            assignment={assignment}
            onSubmissionComplete={() => fetchAssignmentData()}
          />
        ) : (
          // Teacher View - Submissions Management
          <Tabs defaultValue="submissions" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="submissions">
                Submissions ({submissions.length})
              </TabsTrigger>
              <TabsTrigger value="grading">Enhanced Grading</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="rubrics">Rubrics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {analyticsData && (
                <SubmissionTracking 
                  stats={analyticsData.submissionStats}
                  dueDate={assignment.due_date}
                />
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>Assignment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Course:</Label>
                      <p>{assignment.course?.title}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Created:</Label>
                      <p>{formatDate(assignment.created_at)}</p>
                    </div>
                    {assignment.due_date && (
                      <div>
                        <Label className="text-sm font-medium">Due Date:</Label>
                        <p>{formatDate(assignment.due_date)}</p>
                      </div>
                    )}
                    {assignment.points_possible && (
                      <div>
                        <Label className="text-sm font-medium">Points Possible:</Label>
                        <p>{assignment.points_possible}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="submissions" className="space-y-4">
              {submissions.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No submissions yet</p>
                  </CardContent>
                </Card>
              ) : (
                submissions.map((submission) => (
                  <Card key={submission.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {submission.student?.first_name && submission.student?.last_name
                              ? `${submission.student.first_name} ${submission.student.last_name}`
                              : submission.student?.email || 'Unknown Student'
                            }
                          </CardTitle>
                          <CardDescription>
                            Submitted: {formatDate(submission.submitted_at)}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          {submission.grade !== null && submission.grade !== undefined ? (
                            <Badge variant="default">
                              {submission.grade}/{assignment.points_possible} pts
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending Grade</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Submission:</Label>
                          <div className="mt-1 space-y-3">
                            {submission.content && (
                              <div className="p-3 bg-muted rounded-md">
                                <p className="text-sm whitespace-pre-wrap">
                                  {submission.content}
                                </p>
                              </div>
                            )}
                            
                            {submission.file_attachments && Array.isArray(submission.file_attachments) && submission.file_attachments.length > 0 && (
                              <div>
                                <Label className="text-xs font-medium text-muted-foreground">File Attachments:</Label>
                                <FileUpload
                                  bucketName="assignment-files"
                                  folder={`${submission.student_id}/${assignmentId}`}
                                  existingFiles={submission.file_attachments}
                                  onFilesChange={() => {}} // Read-only for teacher view
                                  disabled={true}
                                  maxFiles={3}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {submission.feedback && (
                          <div>
                            <Label className="text-sm font-medium">Previous Feedback:</Label>
                            <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md">
                              <p className="text-sm">{submission.feedback}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setShowEnhancedGrading(true);
                            }}
                          >
                            {submission.grade !== null && submission.grade !== undefined ? "Update Grade" : "Grade"}
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const grade = prompt("Enter grade (0-" + assignment.points_possible + "):");
                              const feedback = prompt("Enter feedback:");
                              if (grade !== null && feedback !== null) {
                                handleGradeSubmission(submission.id, parseInt(grade), feedback);
                              }
                            }}
                          >
                            Quick Grade
                          </Button>
                        </div>

                        {/* Rubric Grading */}
                        {selectedRubric && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="text-sm font-medium mb-3">Rubric Grading</h4>
                            <RubricGrading 
                              submissionId={submission.id}
                              rubricId={selectedRubric}
                              readOnly={false}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="grading" className="space-y-4">
              {selectedSubmission ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Enhanced Grading Interface</h3>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedSubmission(null);
                        setShowEnhancedGrading(false);
                      }}
                    >
                      Back to Submissions
                    </Button>
                  </div>
                  <EnhancedGradingForm
                    submissionId={selectedSubmission.id}
                    assignmentTitle={assignment.title}
                    studentName={selectedSubmission.student?.first_name && selectedSubmission.student?.last_name
                      ? `${selectedSubmission.student.first_name} ${selectedSubmission.student.last_name}`
                      : selectedSubmission.student?.email || 'Unknown Student'
                    }
                    maxPoints={assignment.points_possible || 100}
                    currentGrade={selectedSubmission.grade}
                    currentFeedback={selectedSubmission.feedback}
                    onGradeSubmitted={async (submissionId, grade, feedback) => {
                      await handleGradeSubmission(submissionId, grade, feedback);
                      setSelectedSubmission(null);
                      setShowEnhancedGrading(false);
                    }}
                  />
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select a Submission to Grade</h3>
                    <p className="text-muted-foreground">
                      Choose a submission from the Submissions tab to use the enhanced grading interface
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <GradeAnalyticsDashboard 
                assignmentId={assignmentId}
                maxPoints={assignment.points_possible || 100}
              />
            </TabsContent>

            <TabsContent value="rubrics" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Grading Rubrics</h3>
                <CreateRubricDialog 
                  assignmentId={assignmentId!}
                  onRubricCreated={fetchRubrics}
                />
              </div>

              {rubrics.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="space-y-3">
                      <div className="mx-auto h-12 w-12 bg-muted rounded-full flex items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">No rubrics yet</h3>
                        <p className="text-muted-foreground">
                          Create a rubric to standardize grading for this assignment
                        </p>
                      </div>
                      <CreateRubricDialog 
                        assignmentId={assignmentId!}
                        onRubricCreated={fetchRubrics}
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {rubrics.map((rubric) => (
                    <Card key={rubric.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{rubric.title}</CardTitle>
                            <CardDescription>
                              {rubric.description || "No description provided"}
                            </CardDescription>
                          </div>
                          <Badge variant="outline">
                            {rubric.total_points} points
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          variant={selectedRubric === rubric.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedRubric(rubric.id)}
                        >
                          {selectedRubric === rubric.id ? "Active" : "Use for Grading"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default AssignmentDetails;