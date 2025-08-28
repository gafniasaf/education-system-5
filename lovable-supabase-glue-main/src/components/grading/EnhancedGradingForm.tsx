import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GradeHistoryViewer } from './GradeHistoryViewer';
import { AIFeedbackGenerator } from '@/components/ai/AIFeedbackGenerator';
import { PlagiarismDetector } from '@/components/ai/PlagiarismDetector';
import { formatDistanceToNow } from 'date-fns';
import { 
  Save, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Calculator,
  History,
  Timer,
  Brain
} from 'lucide-react';

interface EnhancedGradingFormProps {
  submissionId: string;
  assignmentTitle: string;
  studentName: string;
  maxPoints: number;
  currentGrade?: number | null;
  currentFeedback?: string | null;
  onGradeSubmitted?: (submissionId: string, grade: number, feedback: string) => void;
  className?: string;
}

export const EnhancedGradingForm: React.FC<EnhancedGradingFormProps> = ({
  submissionId,
  assignmentTitle,
  studentName,
  maxPoints,
  currentGrade,
  currentFeedback,
  onGradeSubmitted,
  className,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [grade, setGrade] = useState<string>(currentGrade?.toString() || '');
  const [feedback, setFeedback] = useState(currentFeedback || '');
  const [gradeComments, setGradeComments] = useState('');
  const [latePenalty, setLatePenalty] = useState<string>('0');
  const [extraCredit, setExtraCredit] = useState<string>('0');
  const [gradeOverride, setGradeOverride] = useState(false);
  const [gradeScale, setGradeScale] = useState<'percentage' | 'points'>('percentage');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAITools, setShowAITools] = useState(false);
  const [startTime] = useState(Date.now());

  const numericGrade = parseFloat(grade) || 0;
  const numericLatePenalty = parseFloat(latePenalty) || 0;
  const numericExtraCredit = parseFloat(extraCredit) || 0;
  
  // Calculate final grade with penalties and extra credit
  const finalGrade = Math.max(0, Math.min(maxPoints, numericGrade - numericLatePenalty + numericExtraCredit));
  const percentage = (finalGrade / maxPoints) * 100;

  const getGradeLetter = (percentage: number): string => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const getGradeColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate input
    if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > maxPoints) {
      toast({
        title: "Invalid Grade",
        description: `Grade must be between 0 and ${maxPoints}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const timeSpentGrading = Math.round((Date.now() - startTime) / (1000 * 60)); // in minutes

      const { error } = await supabase
        .from('submissions')
        .update({
          grade: Math.round(finalGrade),
          feedback,
          grade_comments: gradeComments || null,
          late_penalty_applied: numericLatePenalty,
          extra_credit_points: numericExtraCredit,
          grade_override: gradeOverride,
          grade_scale: gradeScale,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
          time_spent_grading: timeSpentGrading,
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Grade and feedback submitted successfully",
      });

      onGradeSubmitted?.(submissionId, Math.round(finalGrade), feedback);
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

  return (
    <div className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grading Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Grade Submission
              </CardTitle>
              <CardDescription>
                {assignmentTitle} - {studentName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Grade Input */}
              <div className="space-y-2">
                <Label htmlFor="grade">Grade (out of {maxPoints} points)</Label>
                <Input
                  id="grade"
                  type="number"
                  min="0"
                  max={maxPoints}
                  step="0.1"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="Enter grade..."
                />
              </div>

              {/* Penalties and Extra Credit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latePenalty">Late Penalty</Label>
                  <Input
                    id="latePenalty"
                    type="number"
                    min="0"
                    step="0.1"
                    value={latePenalty}
                    onChange={(e) => setLatePenalty(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extraCredit">Extra Credit</Label>
                  <Input
                    id="extraCredit"
                    type="number"
                    min="0"
                    step="0.1"
                    value={extraCredit}
                    onChange={(e) => setExtraCredit(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Grade Override */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="override"
                  checked={gradeOverride}
                  onCheckedChange={setGradeOverride}
                />
                <Label htmlFor="override">Manual grade override</Label>
              </div>

              <Separator />

              {/* Final Grade Display */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Final Grade:</span>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getGradeColor(percentage)}`}>
                      {finalGrade.toFixed(1)}/{maxPoints}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {percentage.toFixed(1)}% ({getGradeLetter(percentage)})
                    </div>
                  </div>
                </div>
                
                {(numericLatePenalty > 0 || numericExtraCredit > 0) && (
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Base Grade:</span>
                      <span>{numericGrade.toFixed(1)}</span>
                    </div>
                    {numericLatePenalty > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Late Penalty:</span>
                        <span>-{numericLatePenalty.toFixed(1)}</span>
                      </div>
                    )}
                    {numericExtraCredit > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Extra Credit:</span>
                        <span>+{numericExtraCredit.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Feedback */}
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide detailed feedback for the student..."
                  className="min-h-[100px]"
                />
              </div>

              {/* Grade Comments (Internal) */}
              <div className="space-y-2">
                <Label htmlFor="gradeComments">Internal Comments (Optional)</Label>
                <Textarea
                  id="gradeComments"
                  value={gradeComments}
                  onChange={(e) => setGradeComments(e.target.value)}
                  placeholder="Internal notes about this grade (not visible to students)..."
                  className="min-h-[60px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !grade.trim()}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <Timer className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {currentGrade !== null ? 'Update Grade' : 'Submit Grade'}
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    {showHistory ? 'Hide' : 'View'} History
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAITools(!showAITools)}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    {showAITools ? 'Hide' : 'Show'} AI Tools
                  </Button>
                </div>
              </div>

              {/* Current Grade Info */}
              {currentGrade !== null && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>Currently graded: {currentGrade}/{maxPoints}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Grade History & AI Tools */}
        <div className="space-y-6">
          {showHistory && (
            <GradeHistoryViewer 
              submissionId={submissionId}
              maxPoints={maxPoints}
            />
          )}

          {showAITools && (
            <div className="space-y-4">
              <AIFeedbackGenerator
                assignmentContent={""} // This would come from submission content
                assignmentTitle={assignmentTitle}
                maxPoints={maxPoints}
                onFeedbackGenerated={(aiFeedback) => {
                  setFeedback(aiFeedback.detailed_feedback);
                  setGrade(aiFeedback.grade_recommendation.toString());
                  toast({
                    title: "AI Feedback Applied",
                    description: "AI-generated feedback and grade have been applied.",
                  });
                }}
              />
              <PlagiarismDetector
                content={""} // This would come from submission content
                assignmentTitle={assignmentTitle}
                onResultGenerated={(result) => {
                  if (result.risk_level === 'high') {
                    const currentFeedbackText = feedback;
                    setFeedback(currentFeedbackText + 
                      (currentFeedbackText ? '\n\n' : '') + 
                      `⚠️ Plagiarism Check: High similarity detected (${result.overall_similarity}%). Please review for proper citations and original work.`
                    );
                    toast({
                      title: "Plagiarism Alert",
                      description: "High similarity detected. Please review submission carefully.",
                      variant: "destructive",
                    });
                  }
                }}
              />
            </div>
          )}
          
          {/* Grading Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grading Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Be Specific</p>
                  <p className="text-muted-foreground">Provide clear, actionable feedback</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Highlight Strengths</p>
                  <p className="text-muted-foreground">Note what the student did well</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Timely Grading</p>
                  <p className="text-muted-foreground">Return grades within 1-2 weeks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};