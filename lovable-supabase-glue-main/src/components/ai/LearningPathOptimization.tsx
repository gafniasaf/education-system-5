import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Loader2, Route, BookOpen, Target, ArrowRight, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LearningPathStep {
  id: string;
  title: string;
  description: string;
  content_type: 'video' | 'reading' | 'quiz' | 'assignment' | 'discussion';
  estimated_duration: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  learning_objectives: string[];
  completed: boolean;
  recommended_order: number;
}

interface LearningPath {
  student_id: string;
  course_id: string;
  path_title: string;
  total_steps: number;
  completed_steps: number;
  estimated_completion_time: number;
  difficulty_progression: string;
  steps: LearningPathStep[];
  recommended_next_actions: string[];
}

interface LearningPathOptimizationProps {
  studentId: string;
  courseId: string;
  currentProgress?: any;
  className?: string;
}

export const LearningPathOptimization: React.FC<LearningPathOptimizationProps> = ({
  studentId,
  courseId,
  currentProgress,
  className
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [studentData, setStudentData] = useState<any>(null);

  useEffect(() => {
    fetchStudentProgress();
  }, [studentId, courseId]);

  const fetchStudentProgress = async () => {
    try {
      // Fetch student progress and performance data
      const { data: progressData, error } = await supabase
        .from('student_progress')
        .select(`
          *,
          content_items (
            title,
            content_type,
            estimated_duration,
            content_modules (
              title,
              learning_objectives
            )
          )
        `)
        .eq('student_id', studentId);

      if (error) throw error;
      setStudentData(progressData);
    } catch (error) {
      console.error('Error fetching student progress:', error);
    }
  };

  const optimizeLearningPath = async () => {
    setIsOptimizing(true);
    
    try {
      // Simulate AI-powered learning path optimization
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock optimized learning path based on student performance and preferences
      const mockPath: LearningPath = {
        student_id: studentId,
        course_id: courseId,
        path_title: "Personalized Learning Journey",
        total_steps: 12,
        completed_steps: 4,
        estimated_completion_time: 280, // minutes
        difficulty_progression: "Progressive with reinforcement",
        steps: [
          {
            id: "step-1",
            title: "Foundation Concepts Review",
            description: "Reinforce key concepts showing knowledge gaps",
            content_type: "reading",
            estimated_duration: 20,
            difficulty_level: "beginner",
            prerequisites: [],
            learning_objectives: ["Understand basic principles", "Recall key terminology"],
            completed: true,
            recommended_order: 1
          },
          {
            id: "step-2", 
            title: "Interactive Practice Module",
            description: "Hands-on exercises to strengthen weak areas",
            content_type: "quiz",
            estimated_duration: 30,
            difficulty_level: "intermediate",
            prerequisites: ["step-1"],
            learning_objectives: ["Apply concepts", "Identify patterns"],
            completed: true,
            recommended_order: 2
          },
          {
            id: "step-3",
            title: "Video Tutorial Series",
            description: "Visual learning for complex topics",
            content_type: "video",
            estimated_duration: 45,
            difficulty_level: "intermediate",
            prerequisites: ["step-2"],
            learning_objectives: ["Visualize processes", "Connect concepts"],
            completed: false,
            recommended_order: 3
          },
          {
            id: "step-4",
            title: "Collaborative Discussion",
            description: "Peer learning and knowledge sharing",
            content_type: "discussion",
            estimated_duration: 25,
            difficulty_level: "intermediate",
            prerequisites: ["step-3"],
            learning_objectives: ["Articulate understanding", "Learn from peers"],
            completed: false,
            recommended_order: 4
          },
          {
            id: "step-5",
            title: "Advanced Application Project",
            description: "Apply learning to real-world scenarios",
            content_type: "assignment",
            estimated_duration: 90,
            difficulty_level: "advanced",
            prerequisites: ["step-4"],
            learning_objectives: ["Synthesize knowledge", "Create solutions"],
            completed: false,
            recommended_order: 5
          }
        ],
        recommended_next_actions: [
          "Complete Video Tutorial Series for visual reinforcement",
          "Participate in discussion forum to clarify doubts",
          "Schedule study session for advanced project prep"
        ]
      };

      setLearningPath(mockPath);
      
      toast({
        title: "Learning Path Optimized",
        description: "Personalized learning path has been generated based on performance analysis.",
      });
    } catch (error) {
      console.error('Learning path optimization error:', error);
      toast({
        title: "Error",
        description: "Failed to optimize learning path. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'reading': return '📖';
      case 'quiz': return '❓';
      case 'assignment': return '📝';
      case 'discussion': return '💬';
      default: return '📚';
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completionPercentage = learningPath ? 
    (learningPath.completed_steps / learningPath.total_steps) * 100 : 0;

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            AI Learning Path Optimization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!learningPath ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Generate an optimized learning path based on student performance and learning patterns
              </p>
              <Button 
                onClick={optimizeLearningPath} 
                disabled={isOptimizing}
                className="min-w-[200px]"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing Path...
                  </>
                ) : (
                  <>
                    <Route className="mr-2 h-4 w-4" />
                    Generate Learning Path
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Path Overview */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{learningPath.path_title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {learningPath.estimated_completion_time} minutes total • {learningPath.difficulty_progression}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {learningPath.completed_steps}/{learningPath.total_steps}
                    </div>
                    <p className="text-sm text-muted-foreground">Steps completed</p>
                  </div>
                </div>
                <Progress value={completionPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {completionPercentage.toFixed(0)}% complete
                </p>
              </div>

              {/* Learning Steps */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Optimized Learning Steps
                </h4>
                <div className="space-y-3">
                  {learningPath.steps.map((step, index) => (
                    <div key={step.id} className={`border rounded-lg p-4 ${step.completed ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {step.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5 flex items-center justify-center text-xs font-medium">
                              {step.recommended_order}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{getContentTypeIcon(step.content_type)}</span>
                            <h5 className="font-medium">{step.title}</h5>
                            <Badge variant="outline" className={getDifficultyColor(step.difficulty_level)}>
                              {step.difficulty_level}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {step.estimated_duration}min
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                          
                          <div className="text-xs text-muted-foreground">
                            <strong>Objectives:</strong> {step.learning_objectives.join(', ')}
                          </div>
                          
                          {step.prerequisites.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <strong>Prerequisites:</strong> {step.prerequisites.join(', ')}
                            </div>
                          )}
                        </div>
                        
                        {index < learningPath.steps.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-gray-400 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Actions */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Recommended Next Actions
                </h4>
                <div className="space-y-2">
                  {learningPath.recommended_next_actions.map((action, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                      <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800">{action}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setLearningPath(null)}
                  className="flex-1"
                >
                  Generate New Path
                </Button>
                <Button className="flex-1">
                  Apply Learning Path
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};