import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lightbulb, BookOpen, Video, FileText, Users, ExternalLink, Star, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ContentRecommendation {
  id: string;
  title: string;
  description: string;
  content_type: 'video' | 'article' | 'quiz' | 'interactive' | 'discussion' | 'external';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number;
  relevance_score: number;
  reason_for_recommendation: string;
  tags: string[];
  url?: string;
  thumbnail_url?: string;
  author: string;
  rating: number;
  prerequisites?: string[];
}

interface IntelligentContentRecommendationsProps {
  studentId: string;
  courseId?: string;
  currentTopic?: string;
  learningGoals?: string[];
  performanceData?: any;
  className?: string;
}

export const IntelligentContentRecommendations: React.FC<IntelligentContentRecommendationsProps> = ({
  studentId,
  courseId,
  currentTopic,
  learningGoals,
  performanceData,
  className
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { toast } = useToast();

  const generateRecommendations = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate AI-powered content recommendation engine
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock intelligent recommendations based on student needs and performance
      const mockRecommendations: ContentRecommendation[] = [
        {
          id: "rec-1",
          title: "Interactive Data Structures Visualization",
          description: "Visual approach to understanding arrays, linked lists, and trees with hands-on exercises.",
          content_type: "interactive",
          difficulty_level: "intermediate",
          estimated_duration: 45,
          relevance_score: 95,
          reason_for_recommendation: "Based on your quiz performance, visual learning will help strengthen data structure concepts.",
          tags: ["data-structures", "visualization", "algorithms"],
          url: "https://example.com/data-structures",
          author: "Prof. Johnson",
          rating: 4.8,
          prerequisites: ["Basic programming"]
        },
        {
          id: "rec-2",
          title: "Peer Discussion: Problem-Solving Strategies",
          description: "Join classmates in discussing different approaches to algorithmic thinking.",
          content_type: "discussion",
          difficulty_level: "intermediate",
          estimated_duration: 30,
          relevance_score: 88,
          reason_for_recommendation: "Your collaborative learning style shows you benefit from peer discussions.",
          tags: ["algorithms", "peer-learning", "problem-solving"],
          author: "Class Community",
          rating: 4.6
        },
        {
          id: "rec-3",
          title: "Fundamentals Review: Variables and Functions",
          description: "Comprehensive review of basic programming concepts with practice problems.",
          content_type: "article",
          difficulty_level: "beginner",
          estimated_duration: 25,
          relevance_score: 82,
          reason_for_recommendation: "Strengthening fundamentals will improve performance on advanced topics.",
          tags: ["fundamentals", "variables", "functions"],
          url: "https://example.com/fundamentals",
          author: "Dr. Smith",
          rating: 4.7,
          prerequisites: []
        },
        {
          id: "rec-4",
          title: "Advanced Algorithm Patterns Video Series",
          description: "In-depth exploration of common algorithmic patterns and optimization techniques.",
          content_type: "video",
          difficulty_level: "advanced",
          estimated_duration: 75,
          relevance_score: 78,
          reason_for_recommendation: "Ready for advanced content based on strong performance in previous modules.",
          tags: ["algorithms", "optimization", "patterns"],
          url: "https://example.com/advanced-algorithms",
          author: "Tech Academy",
          rating: 4.9
        },
        {
          id: "rec-5",
          title: "Quick Quiz: Sorting Algorithms",
          description: "Test your understanding of bubble sort, merge sort, and quicksort.",
          content_type: "quiz",
          difficulty_level: "intermediate",
          estimated_duration: 15,
          relevance_score: 85,
          reason_for_recommendation: "Practice quiz to reinforce sorting concepts before the upcoming exam.",
          tags: ["sorting", "algorithms", "practice"],
          author: "Course Materials",
          rating: 4.4
        }
      ];

      setRecommendations(mockRecommendations);
      
      toast({
        title: "Recommendations Generated",
        description: `Found ${mockRecommendations.length} personalized content recommendations.`,
      });
    } catch (error) {
      console.error('Content recommendation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate content recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'article': return <FileText className="h-4 w-4" />;
      case 'quiz': return <BookOpen className="h-4 w-4" />;
      case 'interactive': return <Lightbulb className="h-4 w-4" />;
      case 'discussion': return <Users className="h-4 w-4" />;
      case 'external': return <ExternalLink className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
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

  const getRelevanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const categories = ['all', 'video', 'article', 'quiz', 'interactive', 'discussion', 'external'];
  
  const filteredRecommendations = selectedCategory === 'all' 
    ? recommendations 
    : recommendations.filter(rec => rec.content_type === selectedCategory);

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Intelligent Content Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Generate personalized content recommendations based on learning patterns and performance
              </p>
              <Button 
                onClick={generateRecommendations} 
                disabled={isGenerating}
                className="min-w-[200px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Learning Data...
                  </>
                ) : (
                  <>
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Generate Recommendations
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Category Filter */}
              <div>
                <h4 className="font-semibold mb-3">Content Type Filter</h4>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="capitalize"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Recommendations List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Recommended for You</h4>
                  <Badge variant="secondary">
                    {filteredRecommendations.length} recommendations
                  </Badge>
                </div>

                {filteredRecommendations.map((recommendation) => (
                  <div key={recommendation.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg">
                        {getContentTypeIcon(recommendation.content_type)}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-semibold text-lg">{recommendation.title}</h5>
                            <p className="text-sm text-muted-foreground">by {recommendation.author}</p>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${getRelevanceColor(recommendation.relevance_score)}`}>
                              {recommendation.relevance_score}%
                            </div>
                            <p className="text-xs text-muted-foreground">relevance</p>
                          </div>
                        </div>

                        <p className="text-sm">{recommendation.description}</p>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={getDifficultyColor(recommendation.difficulty_level)}>
                            {recommendation.difficulty_level}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {recommendation.estimated_duration}min
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{recommendation.rating}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {recommendation.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <Alert className="bg-blue-50 border-blue-200">
                          <Lightbulb className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-800 text-sm">
                            <strong>Why recommended:</strong> {recommendation.reason_for_recommendation}
                          </AlertDescription>
                        </Alert>

                        {recommendation.prerequisites && recommendation.prerequisites.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <strong>Prerequisites:</strong> {recommendation.prerequisites.join(', ')}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button size="sm" className="flex-1">
                            Start Learning
                          </Button>
                          {recommendation.url && (
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            Save for Later
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setRecommendations([])}
                  className="flex-1"
                >
                  Generate New Recommendations
                </Button>
                <Button className="flex-1">
                  Save All Recommendations
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};