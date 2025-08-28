import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Shield, 
  Star, 
  Route, 
  Lightbulb, 
  Mic, 
  Languages,
  Sparkles,
  TrendingUp,
  Zap
} from 'lucide-react';
import { AIFeedbackGenerator } from './AIFeedbackGenerator';
import { PlagiarismDetector } from './PlagiarismDetector';
import { AutomatedGradeRecommendation } from './AutomatedGradeRecommendation';
import { LearningPathOptimization } from './LearningPathOptimization';
import { IntelligentContentRecommendations } from './IntelligentContentRecommendations';
import { VoiceToTextAssignment } from './VoiceToTextAssignment';
import { LanguageTranslationSupport } from './LanguageTranslationSupport';

interface AIDashboardProps {
  studentId?: string;
  courseId?: string;
  assignmentId?: string;
  submissionContent?: string;
  assignmentTitle?: string;
  maxPoints?: number;
  className?: string;
}

export const AIDashboard: React.FC<AIDashboardProps> = ({
  studentId,
  courseId,
  assignmentId,
  submissionContent = '',
  assignmentTitle = 'Assignment',
  maxPoints = 100,
  className
}) => {
  const [activeTab, setActiveTab] = useState('feedback');
  const [transcribedText, setTranscribedText] = useState('');

  const aiTools = [
    {
      id: 'feedback',
      title: 'AI Feedback Generator',
      description: 'Generate comprehensive AI-powered feedback',
      icon: Brain,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      component: (
        <AIFeedbackGenerator
          assignmentContent={submissionContent}
          assignmentTitle={assignmentTitle}
          maxPoints={maxPoints}
          onFeedbackGenerated={(feedback) => {
            console.log('AI Feedback generated:', feedback);
          }}
        />
      )
    },
    {
      id: 'plagiarism',
      title: 'Plagiarism Detection',
      description: 'Smart plagiarism checking and analysis',
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      component: (
        <PlagiarismDetector
          content={submissionContent}
          assignmentTitle={assignmentTitle}
          onResultGenerated={(result) => {
            console.log('Plagiarism check result:', result);
          }}
        />
      )
    },
    {
      id: 'grading',
      title: 'Grade Recommendations',
      description: 'Automated intelligent grade suggestions',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      component: (
        <AutomatedGradeRecommendation
          submissionContent={submissionContent}
          assignmentId={assignmentId || ''}
          assignmentTitle={assignmentTitle}
          maxPoints={maxPoints}
          onRecommendationGenerated={(recommendation) => {
            console.log('Grade recommendation:', recommendation);
          }}
        />
      )
    },
    {
      id: 'learning-path',
      title: 'Learning Path Optimization',
      description: 'Personalized learning journey planning',
      icon: Route,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      component: studentId ? (
        <LearningPathOptimization
          studentId={studentId}
          courseId={courseId || ''}
        />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Student ID required for learning path optimization
        </div>
      )
    },
    {
      id: 'recommendations',
      title: 'Content Recommendations',
      description: 'Intelligent content suggestions',
      icon: Lightbulb,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      component: studentId ? (
        <IntelligentContentRecommendations
          studentId={studentId}
          courseId={courseId}
        />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Student ID required for content recommendations
        </div>
      )
    },
    {
      id: 'voice-to-text',
      title: 'Voice-to-Text',
      description: 'Speech recognition for assignments',
      icon: Mic,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      component: (
        <VoiceToTextAssignment
          onTranscriptionUpdate={(text) => setTranscribedText(text)}
          onTranscriptionComplete={(text) => {
            console.log('Transcription complete:', text);
          }}
        />
      )
    },
    {
      id: 'translation',
      title: 'Language Translation',
      description: 'Multi-language translation support',
      icon: Languages,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      component: (
        <LanguageTranslationSupport
          defaultText={transcribedText}
          onTranslationComplete={(result) => {
            console.log('Translation complete:', result);
          }}
        />
      )
    }
  ];

  const currentTool = aiTools.find(tool => tool.id === activeTab);

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-6 w-6 text-blue-600" />
                AI-Powered Education Suite
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Advanced AI tools to enhance teaching and learning
              </p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Phase 6 Complete
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Tool Selection */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {aiTools.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTab === tool.id;
                
                return (
                  <TabsTrigger
                    key={tool.id}
                    value={tool.id}
                    className={`p-4 h-auto flex-col gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${
                      isActive ? '' : `hover:${tool.bgColor}`
                    }`}
                    asChild
                  >
                    <Button
                      variant={isActive ? "default" : "outline"}
                      className="h-auto flex-col gap-2"
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-current' : tool.color}`} />
                      <div className="text-center">
                        <div className="font-medium text-xs">{tool.title}</div>
                        <div className={`text-xs ${isActive ? 'text-current' : 'text-muted-foreground'}`}>
                          {tool.description}
                        </div>
                      </div>
                    </Button>
                  </TabsTrigger>
                );
              })}
            </div>

            {/* Tool Content */}
            <div className="min-h-[400px]">
              {aiTools.map((tool) => (
                <TabsContent key={tool.id} value={tool.id} className="mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${tool.bgColor}`}>
                        <tool.icon className={`h-5 w-5 ${tool.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{tool.title}</h3>
                        <p className="text-sm text-muted-foreground">{tool.description}</p>
                      </div>
                    </div>
                    {tool.component}
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>

          {/* AI Suite Statistics */}
          <div className="mt-8 pt-6 border-t">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">7</div>
                <div className="text-xs text-muted-foreground">AI Tools</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600">100%</div>
                <div className="text-xs text-muted-foreground">Phase 6 Complete</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-purple-600">∞</div>
                <div className="text-xs text-muted-foreground">Possibilities</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-orange-600">
                  <TrendingUp className="h-6 w-6 mx-auto" />
                </div>
                <div className="text-xs text-muted-foreground">Enhanced Learning</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};