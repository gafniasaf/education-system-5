import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  BarChart3, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  Award,
  Target
} from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description?: string;
  course_id: string;
  time_limit?: number;
  attempts_allowed: number;
  is_published: boolean;
  created_at: string;
  questions: QuizQuestion[];
  course?: {
    title: string;
  };
  attempts?: QuizAttempt[];
}

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correct_answer: string;
  points: number;
  order_index: number;
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  started_at: string;
  completed_at?: string;
  score?: number;
  answers: any[];
  student?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

export const QuizAssessmentTools: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'quizzes' | 'results'>('quizzes');

  // New quiz form state
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    course_id: '',
    time_limit: 60,
    attempts_allowed: 1,
    is_published: false,
  });

  // Question form state
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    question_type: 'multiple_choice' as const,
    options: ['', '', '', ''],
    correct_answer: '',
    points: 1,
  });

  useEffect(() => {
    if (user && profile) {
      fetchCourses();
      fetchQuizzes();
    }
  }, [user, profile]);

  const fetchCourses = async () => {
    if (!user || !profile) return;

    try {
      let query = supabase.from('courses').select('id, title');

      if (profile.role === 'teacher') {
        query = query.eq('teacher_id', user.id);
      }

      const { data } = await query.order('title');
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchQuizzes = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);

      let query = supabase
        .from('quizzes')
        .select(`
          *,
          course:courses(title),
          quiz_questions(*),
          quiz_attempts(*)
        `)
        .order('created_at', { ascending: false });

      if (profile.role === 'teacher') {
        // Teachers see their own quizzes
        const { data: teacherCourses } = await supabase
          .from('courses')
          .select('id')
          .eq('teacher_id', user.id);
        
        if (teacherCourses && teacherCourses.length > 0) {
          const courseIds = teacherCourses.map(c => c.id);
          query = query.in('course_id', courseIds);
        }
      } else {
        // Students see published quizzes from their enrolled courses
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('student_id', user.id);
        
        if (enrollments && enrollments.length > 0) {
          const courseIds = enrollments.map(e => e.course_id);
          query = query.in('course_id', courseIds).eq('is_published', true);
        }
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Transform data to match interface
      const transformedQuizzes: Quiz[] = (data || []).map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        course_id: quiz.course_id,
        time_limit: quiz.time_limit,
        attempts_allowed: quiz.attempts_allowed,
        is_published: quiz.is_published,
        created_at: quiz.created_at,
        course: quiz.course || undefined,
        questions: (quiz.quiz_questions || []).map((q: any) => ({
          id: q.id,
          quiz_id: q.quiz_id,
          question_text: q.question_text,
          question_type: q.question_type as 'multiple_choice' | 'true_false' | 'short_answer',
          options: Array.isArray(q.options) ? q.options : (q.options ? [q.options] : []),
          correct_answer: q.correct_answer,
          points: q.points,
          order_index: q.order_index
        })),
        attempts: (quiz.quiz_attempts || []).map((a: any) => ({
          id: a.id,
          quiz_id: a.quiz_id,
          student_id: a.student_id,
          started_at: a.started_at,
          completed_at: a.completed_at,
          score: a.score,
          answers: Array.isArray(a.answers) ? a.answers : (a.answers ? [a.answers] : [])
        }))
      }));

      setQuizzes(transformedQuizzes);

    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast({
        title: "Error",
        description: "Failed to load quizzes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createQuiz = async () => {
    if (!user || !newQuiz.title.trim() || !newQuiz.course_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('quizzes')
        .insert({
          ...newQuiz,
          created_by: user.id
        })
        .select(`
          *,
          course:courses(title)
        `)
        .single();

      if (error) throw error;

      const newQuizData = {
        ...data,
        questions: [],
        attempts: []
      };

      setQuizzes(prev => [newQuizData, ...prev]);

      toast({
        title: "Success",
        description: "Quiz created successfully",
      });

      setNewQuiz({
        title: '',
        description: '',
        course_id: '',
        time_limit: 60,
        attempts_allowed: 1,
        is_published: false,
      });
      setIsCreateDialogOpen(false);

    } catch (error) {
      console.error('Error creating quiz:', error);
      toast({
        title: "Error",
        description: "Failed to create quiz",
        variant: "destructive",
      });
    }
  };

  const addQuestionToQuiz = (quizId: string) => {
    if (!newQuestion.question_text.trim() || !newQuestion.correct_answer.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all question fields",
        variant: "destructive",
      });
      return;
    }

    const question: QuizQuestion = {
      id: Math.random().toString(36).substr(2, 9),
      quiz_id: quizId,
      ...newQuestion,
      order_index: (selectedQuiz?.questions.length || 0) + 1,
    };

    setQuizzes(prev => prev.map(quiz => 
      quiz.id === quizId 
        ? { ...quiz, questions: [...quiz.questions, question] }
        : quiz
    ));

    if (selectedQuiz?.id === quizId) {
      setSelectedQuiz(prev => prev ? { ...prev, questions: [...prev.questions, question] } : null);
    }

    setNewQuestion({
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      points: 1,
    });

    toast({
      title: "Success",
      description: "Question added to quiz",
    });
  };

  const toggleQuizPublished = (quizId: string) => {
    setQuizzes(prev => prev.map(quiz => 
      quiz.id === quizId 
        ? { ...quiz, is_published: !quiz.is_published }
        : quiz
    ));

    if (selectedQuiz?.id === quizId) {
      setSelectedQuiz(prev => prev ? { ...prev, is_published: !prev.is_published } : null);
    }

    toast({
      title: "Success",
      description: "Quiz status updated",
    });
  };

  const deleteQuiz = (quizId: string) => {
    setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
    if (selectedQuiz?.id === quizId) {
      setSelectedQuiz(null);
    }

    toast({
      title: "Success",
      description: "Quiz deleted successfully",
    });
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return '⚪';
      case 'true_false':
        return '✓✗';
      case 'short_answer':
        return '📝';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Quiz & Assessment Tools</h2>
          <p className="text-muted-foreground">Create and manage interactive assessments</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeTab === 'quizzes' ? 'default' : 'outline'}
            onClick={() => setActiveTab('quizzes')}
          >
            Quizzes
          </Button>
          <Button 
            variant={activeTab === 'results' ? 'default' : 'outline'}
            onClick={() => setActiveTab('results')}
          >
            Results
          </Button>
          {profile?.role === 'teacher' && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Quiz
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Quiz</DialogTitle>
                  <DialogDescription>
                    Set up a new quiz for your students
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Quiz Title</Label>
                    <Input
                      id="title"
                      value={newQuiz.title}
                      onChange={(e) => setNewQuiz(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter quiz title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={newQuiz.description}
                      onChange={(e) => setNewQuiz(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Quiz description"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="course">Course</Label>
                    <Select value={newQuiz.course_id} onValueChange={(value) => setNewQuiz(prev => ({ ...prev, course_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                      <Input
                        id="time_limit"
                        type="number"
                        value={newQuiz.time_limit}
                        onChange={(e) => setNewQuiz(prev => ({ ...prev, time_limit: parseInt(e.target.value) || 60 }))}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="attempts">Attempts Allowed</Label>
                      <Input
                        id="attempts"
                        type="number"
                        value={newQuiz.attempts_allowed}
                        onChange={(e) => setNewQuiz(prev => ({ ...prev, attempts_allowed: parseInt(e.target.value) || 1 }))}
                        min="1"
                        max="10"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="published"
                      checked={newQuiz.is_published}
                      onCheckedChange={(checked) => setNewQuiz(prev => ({ ...prev, is_published: checked === true }))}
                    />
                    <Label htmlFor="published">Publish immediately</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createQuiz}>Create Quiz</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {activeTab === 'quizzes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quiz List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-semibold">Your Quizzes</h3>
            {quizzes.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Award className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No quizzes created yet</p>
                </CardContent>
              </Card>
            ) : (
              quizzes.map((quiz) => (
                <Card 
                  key={quiz.id} 
                  className={`cursor-pointer transition-colors ${selectedQuiz?.id === quiz.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedQuiz(quiz)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{quiz.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {quiz.course?.title} • {quiz.questions.length} questions
                        </CardDescription>
                      </div>
                      <Badge variant={quiz.is_published ? 'default' : 'secondary'}>
                        {quiz.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{quiz.time_limit} min</span>
                      <span>{quiz.attempts_allowed} attempts</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Quiz Details */}
          <div className="lg:col-span-2">
            {selectedQuiz ? (
              <div className="space-y-6">
                {/* Quiz Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{selectedQuiz.title}</CardTitle>
                        <CardDescription>
                          {selectedQuiz.description || 'No description provided'}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleQuizPublished(selectedQuiz.id)}
                        >
                          {selectedQuiz.is_published ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          {selectedQuiz.is_published ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditDialogOpen(true)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteQuiz(selectedQuiz.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Time Limit:</span>
                        <p className="font-medium">{selectedQuiz.time_limit} minutes</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Attempts:</span>
                        <p className="font-medium">{selectedQuiz.attempts_allowed}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Questions:</span>
                        <p className="font-medium">{selectedQuiz.questions.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Questions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Questions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedQuiz.questions.map((question, index) => (
                      <div key={question.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Q{index + 1}</span>
                            <span className="text-xs">{getQuestionTypeIcon(question.question_type)}</span>
                            <Badge variant="outline" className="text-xs">
                              {question.points} pts
                            </Badge>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="font-medium mb-2">{question.question_text}</p>
                        {question.question_type === 'multiple_choice' && question.options && (
                          <div className="space-y-1">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full border-2 ${option === question.correct_answer ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}></div>
                                <span className="text-sm">{option}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Question Form */}
                    {profile?.role === 'teacher' && (
                      <div className="p-4 border-2 border-dashed rounded-lg space-y-4">
                        <h4 className="font-medium">Add New Question</h4>
                        <div>
                          <Label>Question Text</Label>
                          <Textarea
                            value={newQuestion.question_text}
                            onChange={(e) => setNewQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                            placeholder="Enter your question..."
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Question Type</Label>
                            <Select value={newQuestion.question_type} onValueChange={(value: any) => setNewQuestion(prev => ({ ...prev, question_type: value }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                <SelectItem value="true_false">True/False</SelectItem>
                                <SelectItem value="short_answer">Short Answer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Points</Label>
                            <Input
                              type="number"
                              value={newQuestion.points}
                              onChange={(e) => setNewQuestion(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
                              min="1"
                              max="10"
                            />
                          </div>
                        </div>
                        
                        {newQuestion.question_type === 'multiple_choice' && (
                          <div className="space-y-2">
                            <Label>Answer Options</Label>
                            {newQuestion.options.map((option, index) => (
                              <Input
                                key={index}
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...newQuestion.options];
                                  newOptions[index] = e.target.value;
                                  setNewQuestion(prev => ({ ...prev, options: newOptions }));
                                }}
                                placeholder={`Option ${index + 1}`}
                              />
                            ))}
                          </div>
                        )}
                        
                        <div>
                          <Label>Correct Answer</Label>
                          {newQuestion.question_type === 'multiple_choice' ? (
                            <Select value={newQuestion.correct_answer} onValueChange={(value) => setNewQuestion(prev => ({ ...prev, correct_answer: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select correct answer" />
                              </SelectTrigger>
                              <SelectContent>
                                {newQuestion.options.filter(option => option.trim()).map((option, index) => (
                                  <SelectItem key={index} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={newQuestion.correct_answer}
                              onChange={(e) => setNewQuestion(prev => ({ ...prev, correct_answer: e.target.value }))}
                              placeholder="Enter correct answer"
                            />
                          )}
                        </div>
                        
                        <Button onClick={() => addQuestionToQuiz(selectedQuiz.id)}>
                          Add Question
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Quiz Selected</h3>
                  <p className="text-muted-foreground">
                    Select a quiz from the list to view and edit its details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <Card>
          <CardHeader>
            <CardTitle>Quiz Results & Analytics</CardTitle>
            <CardDescription>Performance insights and student progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
              <p className="text-muted-foreground">
                Detailed analytics and results tracking will be available here
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};