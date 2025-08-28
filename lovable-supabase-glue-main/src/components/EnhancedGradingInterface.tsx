import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, User, Calendar, Download, Save, Eye } from 'lucide-react';

interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
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

interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  points: number;
  order_index: number;
}

interface RubricGrade {
  criterion_id: string;
  points_earned: number;
  feedback?: string;
}

interface EnhancedGradingInterfaceProps {
  submission: Submission;
  assignmentTitle: string;
  maxPoints: number;
  rubricCriteria: RubricCriterion[];
  onGradeSubmitted: (submissionId: string, grade: number, feedback: string, rubricGrades?: RubricGrade[]) => void;
  className?: string;
}

export const EnhancedGradingInterface: React.FC<EnhancedGradingInterfaceProps> = ({
  submission,
  assignmentTitle,
  maxPoints,
  rubricCriteria,
  onGradeSubmitted,
  className,
}) => {
  const { toast } = useToast();
  const [grade, setGrade] = useState<string>(submission.grade?.toString() || '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [rubricGrades, setRubricGrades] = useState<Record<string, RubricGrade>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Initialize rubric grades
  useEffect(() => {
    const fetchRubricGrades = async () => {
      if (rubricCriteria.length === 0) return;

      try {
        const { data: existingGrades } = await supabase
          .from('rubric_grades')
          .select('*')
          .eq('submission_id', submission.id);

        const gradesMap: Record<string, RubricGrade> = {};
        rubricCriteria.forEach(criterion => {
          const existingGrade = existingGrades?.find(g => g.criterion_id === criterion.id);
          gradesMap[criterion.id] = {
            criterion_id: criterion.id,
            points_earned: existingGrade?.points_earned || 0,
            feedback: existingGrade?.feedback || '',
          };
        });

        setRubricGrades(gradesMap);
      } catch (error) {
        console.error('Error fetching rubric grades:', error);
      }
    };

    fetchRubricGrades();
  }, [submission.id, rubricCriteria]);

  const updateRubricGrade = (criterionId: string, field: keyof RubricGrade, value: string | number) => {
    setRubricGrades(prev => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        [field]: value,
      },
    }));
  };

  const calculateRubricTotal = () => {
    return Object.values(rubricGrades).reduce((total, grade) => total + grade.points_earned, 0);
  };

  const handleSubmit = async () => {
    const finalGrade = rubricCriteria.length > 0 ? calculateRubricTotal() : parseFloat(grade);
    
    if (isNaN(finalGrade) || finalGrade < 0 || finalGrade > maxPoints) {
      toast({
        title: "Invalid Grade",
        description: `Grade must be between 0 and ${maxPoints}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save rubric grades if applicable
      if (rubricCriteria.length > 0) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const rubricGradesToSave = Object.values(rubricGrades).map(grade => ({
          submission_id: submission.id,
          criterion_id: grade.criterion_id,
          points_earned: grade.points_earned,
          feedback: grade.feedback || null,
          graded_by: currentUser?.id,
        }));

        // Delete existing rubric grades
        await supabase
          .from('rubric_grades')
          .delete()
          .eq('submission_id', submission.id);

        // Insert new rubric grades
        const { error: rubricError } = await supabase
          .from('rubric_grades')
          .insert(rubricGradesToSave);

        if (rubricError) {
          console.error('Error saving rubric grades:', rubricError);
          toast({
            title: "Error",
            description: "Failed to save rubric grades",
            variant: "destructive",
          });
          return;
        }
      }

      onGradeSubmitted(
        submission.id,
        finalGrade,
        feedback,
        rubricCriteria.length > 0 ? Object.values(rubricGrades) : undefined
      );

      toast({
        title: "Success",
        description: "Grade submitted successfully",
      });
    } catch (error) {
      console.error('Error submitting grade:', error);
      toast({
        title: "Error",
        description: "Failed to submit grade",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = async (file: FileAttachment) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Grading: {submission.student?.first_name} {submission.student?.last_name}
        </CardTitle>
        <CardDescription>
          Assignment: {assignmentTitle} • 
          Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Submission</TabsTrigger>
            <TabsTrigger value="grading">Grading</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Student Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {submission.student?.first_name} {submission.student?.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{submission.student?.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Submitted</div>
                    <div className="font-medium">
                      {new Date(submission.submitted_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Grade */}
            {submission.grade !== null && submission.grade !== undefined && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Current Grade</h3>
                      <p className="text-2xl font-bold text-primary">
                        {submission.grade}/{maxPoints}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={submission.grade >= maxPoints * 0.8 ? 'default' : 'secondary'}>
                        {Math.round((submission.grade / maxPoints) * 100)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={(submission.grade / maxPoints) * 100} className="mt-2" />
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveTab('content')}>
                <Eye className="h-4 w-4 mr-2" />
                View Submission
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('grading')}>
                <FileText className="h-4 w-4 mr-2" />
                {submission.grade !== null ? 'Update Grade' : 'Grade Submission'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            {/* Written Content */}
            {submission.content && (
              <Card>
                <CardHeader>
                  <CardTitle>Written Response</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap p-4 bg-muted rounded-lg">
                    {submission.content}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* File Attachments */}
            {submission.file_attachments && submission.file_attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    File Attachments ({submission.file_attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {submission.file_attachments.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{file.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadFile(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="grading" className="space-y-4">
            {rubricCriteria.length > 0 ? (
              // Rubric-based grading
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Rubric Grading</CardTitle>
                    <CardDescription>
                      Grade each criterion individually
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {rubricCriteria.map((criterion) => (
                      <Card key={criterion.id}>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{criterion.title}</h4>
                                <p className="text-sm text-muted-foreground">{criterion.description}</p>
                              </div>
                              <Badge variant="outline">{criterion.points} pts</Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`points-${criterion.id}`}>Points Earned</Label>
                                <Input
                                  id={`points-${criterion.id}`}
                                  type="number"
                                  min="0"
                                  max={criterion.points}
                                  value={rubricGrades[criterion.id]?.points_earned || 0}
                                  onChange={(e) => updateRubricGrade(criterion.id, 'points_earned', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`feedback-${criterion.id}`}>Feedback</Label>
                                <Textarea
                                  id={`feedback-${criterion.id}`}
                                  value={rubricGrades[criterion.id]?.feedback || ''}
                                  onChange={(e) => updateRubricGrade(criterion.id, 'feedback', e.target.value)}
                                  placeholder="Optional feedback for this criterion"
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold">Total Score</h4>
                          <div className="text-xl font-bold">
                            {calculateRubricTotal()}/{rubricCriteria.reduce((sum, c) => sum + c.points, 0)}
                          </div>
                        </div>
                        <Progress value={(calculateRubricTotal() / rubricCriteria.reduce((sum, c) => sum + c.points, 0)) * 100} className="mt-2" />
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Traditional grading
              <Card>
                <CardHeader>
                  <CardTitle>Grade Assignment</CardTitle>
                  <CardDescription>
                    Enter the grade and feedback for this submission
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="grade">Grade (out of {maxPoints})</Label>
                    <Input
                      id="grade"
                      type="number"
                      min="0"
                      max={maxPoints}
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder={`Enter grade (0-${maxPoints})`}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* General Feedback */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide overall feedback for the student..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Submit Grade */}
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Submit Grade'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};