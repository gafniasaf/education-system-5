import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, Star, Users, BookOpen, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GradeRecommendation {
  recommended_grade: number;
  confidence_score: number;
  reasoning: string;
  similar_submissions: Array<{
    student_name: string;
    grade: number;
    similarity_score: number;
  }>;
  criteria_analysis: Array<{
    criterion: string;
    score: number;
    max_score: number;
    reasoning: string;
  }>;
  adjustment_factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }>;
}

interface AutomatedGradeRecommendationProps {
  submissionContent: string;
  assignmentId: string;
  assignmentTitle: string;
  maxPoints: number;
  rubricCriteria?: Array<{
    title: string;
    description: string;
    points: number;
  }>;
  onRecommendationGenerated: (recommendation: GradeRecommendation) => void;
  className?: string;
}

export const AutomatedGradeRecommendation: React.FC<AutomatedGradeRecommendationProps> = ({
  submissionContent,
  assignmentId,
  assignmentTitle,
  maxPoints,
  rubricCriteria,
  onRecommendationGenerated,
  className
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendation, setRecommendation] = useState<GradeRecommendation | null>(null);
  const { toast } = useToast();

  const generateGradeRecommendation = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate AI-powered grade analysis
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Mock sophisticated grade recommendation based on multiple factors
      const baseScore = Math.floor(Math.random() * 30) + 70; // 70-100 range
      const confidenceScore = Math.floor(Math.random() * 20) + 80; // 80-100 confidence
      
      const gradeRecommendation: GradeRecommendation = {
        recommended_grade: Math.round((baseScore / 100) * maxPoints),
        confidence_score: confidenceScore,
        reasoning: `Based on comprehensive analysis of content quality, adherence to assignment requirements, and comparison with similar submissions, this work demonstrates ${baseScore >= 90 ? 'exceptional' : baseScore >= 80 ? 'strong' : 'adequate'} understanding of the subject matter.`,
        similar_submissions: [
          {
            student_name: "Student A",
            grade: Math.round(((baseScore + 5) / 100) * maxPoints),
            similarity_score: 87
          },
          {
            student_name: "Student B", 
            grade: Math.round(((baseScore - 3) / 100) * maxPoints),
            similarity_score: 82
          },
          {
            student_name: "Student C",
            grade: Math.round(((baseScore + 2) / 100) * maxPoints),
            similarity_score: 79
          }
        ],
        criteria_analysis: rubricCriteria?.map(criterion => ({
          criterion: criterion.title,
          score: Math.round((baseScore / 100) * criterion.points * (0.9 + Math.random() * 0.2)),
          max_score: criterion.points,
          reasoning: `Demonstrates ${baseScore >= 85 ? 'excellent' : baseScore >= 75 ? 'good' : 'satisfactory'} performance in ${criterion.title.toLowerCase()}.`
        })) || [
          {
            criterion: "Content Quality",
            score: Math.round((baseScore / 100) * (maxPoints * 0.4)),
            max_score: Math.round(maxPoints * 0.4),
            reasoning: "Strong understanding evident with clear explanations and examples."
          },
          {
            criterion: "Organization",
            score: Math.round(((baseScore + 5) / 100) * (maxPoints * 0.3)),
            max_score: Math.round(maxPoints * 0.3),
            reasoning: "Well-structured presentation with logical flow."
          },
          {
            criterion: "Requirements",
            score: Math.round(((baseScore - 2) / 100) * (maxPoints * 0.3)),
            max_score: Math.round(maxPoints * 0.3),
            reasoning: "Meets most assignment requirements with minor gaps."
          }
        ],
        adjustment_factors: [
          ...(baseScore >= 85 ? [{
            factor: "Exceptional insight",
            impact: 'positive' as const,
            description: "Demonstrates deep understanding beyond basic requirements"
          }] : []),
          ...(Math.random() > 0.7 ? [{
            factor: "Late submission",
            impact: 'negative' as const,
            description: "Submitted after deadline with potential penalty"
          }] : []),
          {
            factor: "Peer comparison",
            impact: 'neutral' as const,
            description: "Performance aligns with class average"
          }
        ]
      };

      setRecommendation(gradeRecommendation);
      onRecommendationGenerated(gradeRecommendation);
      
      toast({
        title: "Grade Recommendation Generated",
        description: `AI suggests ${gradeRecommendation.recommended_grade}/${maxPoints} with ${gradeRecommendation.confidence_score}% confidence.`,
      });
    } catch (error) {
      console.error('Grade recommendation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate grade recommendation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFactorIcon = (impact: string) => {
    switch (impact) {
      case 'positive': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative': return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default: return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Automated Grade Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!recommendation ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Generate AI-powered grade recommendation for "{assignmentTitle}"
              </p>
              <Button 
                onClick={generateGradeRecommendation} 
                disabled={isGenerating || !submissionContent.trim()}
                className="min-w-[200px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Submission...
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Generate Recommendation
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Recommended Grade */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Recommended Grade</h3>
                    <p className="text-sm text-muted-foreground">AI-generated suggestion</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {recommendation.recommended_grade}/{maxPoints}
                    </div>
                    <div className={`text-sm font-medium ${getConfidenceColor(recommendation.confidence_score)}`}>
                      {recommendation.confidence_score}% confidence
                    </div>
                  </div>
                </div>
                <Progress value={recommendation.confidence_score} className="h-2 mb-3" />
                <p className="text-sm text-muted-foreground">{recommendation.reasoning}</p>
              </div>

              {/* Criteria Analysis */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Criteria Analysis
                </h4>
                <div className="space-y-3">
                  {recommendation.criteria_analysis.map((criterion, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">{criterion.criterion}</h5>
                        <Badge variant="outline">
                          {criterion.score}/{criterion.max_score}
                        </Badge>
                      </div>
                      <Progress value={(criterion.score / criterion.max_score) * 100} className="h-1 mb-2" />
                      <p className="text-xs text-muted-foreground">{criterion.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Similar Submissions */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Similar Submissions Comparison
                </h4>
                <div className="space-y-2">
                  {recommendation.similar_submissions.map((submission, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{submission.student_name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {submission.similarity_score}% similar
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {submission.grade}/{maxPoints}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adjustment Factors */}
              {recommendation.adjustment_factors.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Adjustment Factors</h4>
                  <div className="space-y-2">
                    {recommendation.adjustment_factors.map((factor, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                        {getFactorIcon(factor.impact)}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{factor.factor}</p>
                          <p className="text-xs text-muted-foreground">{factor.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <Alert>
                <Star className="h-4 w-4" />
                <AlertDescription>
                  This is an AI-generated recommendation. Please review and adjust based on your professional judgment.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setRecommendation(null)}
                  className="flex-1"
                >
                  Generate New Recommendation
                </Button>
                <Button 
                  onClick={() => onRecommendationGenerated(recommendation)}
                  className="flex-1"
                >
                  Apply Recommendation
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};