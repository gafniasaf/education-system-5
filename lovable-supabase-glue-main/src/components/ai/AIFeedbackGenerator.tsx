import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIFeedback {
  overall_score: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  detailed_feedback: string;
  grade_recommendation: number;
}

interface AIFeedbackGeneratorProps {
  assignmentContent: string;
  assignmentTitle: string;
  maxPoints: number;
  rubricCriteria?: Array<{
    title: string;
    description: string;
    points: number;
  }>;
  onFeedbackGenerated: (feedback: AIFeedback) => void;
  className?: string;
}

export const AIFeedbackGenerator: React.FC<AIFeedbackGeneratorProps> = ({
  assignmentContent,
  assignmentTitle,
  maxPoints,
  rubricCriteria,
  onFeedbackGenerated,
  className
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFeedback, setGeneratedFeedback] = useState<AIFeedback | null>(null);
  const { toast } = useToast();

  const generateAIFeedback = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate AI processing - In production, this would call an AI service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock AI-generated feedback based on content analysis
      const feedback: AIFeedback = {
        overall_score: 85,
        strengths: [
          "Clear thesis statement and well-structured arguments",
          "Good use of supporting evidence and examples",
          "Proper grammar and sentence structure throughout"
        ],
        improvements: [
          "Could benefit from stronger conclusion that ties all points together",
          "Some paragraphs could be more concise",
          "Consider adding more diverse sources to strengthen arguments"
        ],
        suggestions: [
          "Review transition sentences between paragraphs for better flow",
          "Add a counterargument section to show critical thinking",
          "Include more recent sources to support your claims"
        ],
        detailed_feedback: `This submission demonstrates a solid understanding of the topic with well-researched content. The introduction effectively sets up the main arguments, and the body paragraphs provide good supporting evidence. However, the conclusion could be strengthened to better summarize the key points and their implications. Overall, this is a strong piece of work that shows clear analytical thinking.`,
        grade_recommendation: Math.round((85 / 100) * maxPoints)
      };

      setGeneratedFeedback(feedback);
      onFeedbackGenerated(feedback);
      
      toast({
        title: "AI Feedback Generated",
        description: "Comprehensive feedback has been generated for this assignment.",
      });
    } catch (error) {
      console.error('AI feedback generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 90) return "default";
    if (score >= 80) return "secondary";
    if (score >= 70) return "outline";
    return "destructive";
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Feedback Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!generatedFeedback ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Generate comprehensive AI feedback for "{assignmentTitle}"
              </p>
              <Button 
                onClick={generateAIFeedback} 
                disabled={isGenerating || !assignmentContent.trim()}
                className="min-w-[200px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Content...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Generate AI Feedback
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h3 className="font-semibold">Overall Assessment</h3>
                  <p className="text-sm text-muted-foreground">AI-generated score</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(generatedFeedback.overall_score)}`}>
                    {generatedFeedback.overall_score}%
                  </div>
                  <Badge variant={getScoreBadgeVariant(generatedFeedback.overall_score)}>
                    {generatedFeedback.grade_recommendation}/{maxPoints} points
                  </Badge>
                </div>
              </div>

              {/* Detailed Feedback */}
              <div>
                <h4 className="font-semibold mb-2">Detailed Analysis</h4>
                <Textarea 
                  value={generatedFeedback.detailed_feedback}
                  readOnly
                  className="min-h-[100px] resize-none"
                />
              </div>

              {/* Strengths */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Strengths
                </h4>
                <ul className="space-y-1">
                  {generatedFeedback.strengths.map((strength, index) => (
                    <li key={index} className="text-sm text-green-700 bg-green-50 p-2 rounded">
                      • {strength}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas for Improvement */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  Areas for Improvement
                </h4>
                <ul className="space-y-1">
                  {generatedFeedback.improvements.map((improvement, index) => (
                    <li key={index} className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
                      • {improvement}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggestions */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  Suggestions for Enhancement
                </h4>
                <ul className="space-y-1">
                  {generatedFeedback.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                      • {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setGeneratedFeedback(null)}
                  className="flex-1"
                >
                  Generate New Feedback
                </Button>
                <Button 
                  onClick={() => onFeedbackGenerated(generatedFeedback)}
                  className="flex-1"
                >
                  Apply This Feedback
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};