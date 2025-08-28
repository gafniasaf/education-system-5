import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Star, Save } from 'lucide-react';

interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  points: number;
  order_index: number;
}

interface RubricGrade {
  id?: string;
  criterion_id: string;
  points_earned: number;
  feedback: string;
}

interface RubricGradingProps {
  submissionId: string;
  rubricId: string;
  readOnly?: boolean;
}

export const RubricGrading: React.FC<RubricGradingProps> = ({
  submissionId,
  rubricId,
  readOnly = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [grades, setGrades] = useState<RubricGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRubricData();
  }, [rubricId, submissionId]);

  const fetchRubricData = async () => {
    try {
      // Fetch criteria
      const { data: criteriaData, error: criteriaError } = await supabase
        .from('rubric_criteria')
        .select('*')
        .eq('rubric_id', rubricId)
        .order('order_index');

      if (criteriaError) throw criteriaError;

      setCriteria(criteriaData || []);

      // Fetch existing grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('rubric_grades')
        .select('*')
        .eq('submission_id', submissionId);

      if (gradesError) throw gradesError;

      // Initialize grades state
      const existingGrades = gradesData || [];
      const initialGrades = (criteriaData || []).map(criterion => {
        const existingGrade = existingGrades.find(g => g.criterion_id === criterion.id);
        return {
          id: existingGrade?.id,
          criterion_id: criterion.id,
          points_earned: existingGrade?.points_earned || 0,
          feedback: existingGrade?.feedback || '',
        };
      });

      setGrades(initialGrades);
    } catch (error) {
      console.error('Error fetching rubric data:', error);
      toast({
        title: "Error",
        description: "Failed to load rubric data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateGrade = (criterionId: string, field: keyof RubricGrade, value: string | number) => {
    setGrades(prev =>
      prev.map(grade =>
        grade.criterion_id === criterionId
          ? { ...grade, [field]: value }
          : grade
      )
    );
  };

  const saveGrades = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const gradesToUpsert = grades.map(grade => ({
        id: grade.id,
        submission_id: submissionId,
        criterion_id: grade.criterion_id,
        points_earned: grade.points_earned,
        feedback: grade.feedback,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('rubric_grades')
        .upsert(gradesToUpsert, {
          onConflict: 'submission_id,criterion_id'
        });

      if (error) throw error;

      // Calculate total score and update submission
      const totalEarned = grades.reduce((sum, grade) => sum + grade.points_earned, 0);
      const totalPossible = criteria.reduce((sum, criterion) => sum + criterion.points, 0);
      const finalGrade = Math.round((totalEarned / totalPossible) * 100);

      const { error: submissionError } = await supabase
        .from('submissions')
        .update({
          grade: finalGrade,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (submissionError) throw submissionError;

      toast({
        title: "Success",
        description: "Grades saved successfully",
      });

      // Refresh data
      fetchRubricData();
    } catch (error) {
      console.error('Error saving grades:', error);
      toast({
        title: "Error",
        description: "Failed to save grades",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getTotalScore = () => {
    const earned = grades.reduce((sum, grade) => sum + grade.points_earned, 0);
    const possible = criteria.reduce((sum, criterion) => sum + criterion.points, 0);
    return { earned, possible };
  };

  const getScorePercentage = () => {
    const { earned, possible } = getTotalScore();
    return possible > 0 ? Math.round((earned / possible) * 100) : 0;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Loading rubric...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (criteria.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No rubric criteria found
          </div>
        </CardContent>
      </Card>
    );
  }

  const { earned, possible } = getTotalScore();
  const percentage = getScorePercentage();

  return (
    <div className="space-y-4">
      {/* Score Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Rubric Grading</span>
            <div className="flex items-center gap-2">
              <Badge variant={percentage >= 90 ? "default" : percentage >= 70 ? "secondary" : "destructive"}>
                {earned}/{possible} points ({percentage}%)
              </Badge>
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Criteria Grading */}
      <div className="space-y-4">
        {criteria.map((criterion) => {
          const grade = grades.find(g => g.criterion_id === criterion.id);
          return (
            <Card key={criterion.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{criterion.title}</span>
                  <Badge variant="outline">
                    {grade?.points_earned || 0}/{criterion.points} pts
                  </Badge>
                </CardTitle>
                {criterion.description && (
                  <p className="text-sm text-muted-foreground">
                    {criterion.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor={`points-${criterion.id}`}>Points Earned</Label>
                  <Input
                    id={`points-${criterion.id}`}
                    type="number"
                    min="0"
                    max={criterion.points}
                    value={grade?.points_earned || 0}
                    onChange={(e) => updateGrade(criterion.id, 'points_earned', parseInt(e.target.value) || 0)}
                    disabled={readOnly}
                  />
                </div>
                
                <div>
                  <Label htmlFor={`feedback-${criterion.id}`}>Feedback</Label>
                  <Textarea
                    id={`feedback-${criterion.id}`}
                    value={grade?.feedback || ''}
                    onChange={(e) => updateGrade(criterion.id, 'feedback', e.target.value)}
                    placeholder="Provide specific feedback for this criterion..."
                    rows={2}
                    disabled={readOnly}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      {!readOnly && (
        <div className="flex justify-end">
          <Button onClick={saveGrades} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Grades'}
          </Button>
        </div>
      )}
    </div>
  );
};