import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, BookOpen, TrendingUp, Target, Calendar, Award } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface StudentLearningAnalyticsProps {
  courseId?: string;
}

interface LearningAnalytics {
  total_modules: number;
  completed_modules: number;
  total_content_items: number;
  completed_content_items: number;
  total_time_spent: number;
  average_completion_rate: number;
  most_active_content_type: string;
  learning_streak: number;
}

interface ProgressByModule {
  module_id: string;
  module_title: string;
  total_items: number;
  completed_items: number;
  completion_rate: number;
  time_spent: number;
}

interface ContentTypeActivity {
  content_type: string;
  interactions: number;
  time_spent: number;
  completion_rate: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export function StudentLearningAnalytics({ courseId }: StudentLearningAnalyticsProps) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null);
  const [progressByModule, setProgressByModule] = useState<ProgressByModule[]>([]);
  const [contentTypeActivity, setContentTypeActivity] = useState<ContentTypeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    loadAnalytics();
  }, [user?.id, courseId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load overall learning analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .rpc('get_student_learning_analytics', {
          student_uuid: user?.id,
          course_uuid: courseId || null
        });

      if (analyticsError) throw analyticsError;
      setAnalytics(analyticsData?.[0] || null);

      // Load progress by module
      await loadProgressByModule();

      // Load content type activity
      await loadContentTypeActivity();

    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const loadProgressByModule = async () => {
    try {
      let query = supabase
        .from('content_modules')
        .select(`
          id,
          title,
          content_items!inner(
            id,
            student_progress(
              status,
              time_spent
            )
          )
        `);

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query
        .eq('is_published', true)
        .eq('content_items.student_progress.student_id', user?.id);

      if (error) throw error;

      const moduleProgress = data?.map(module => {
        const totalItems = module.content_items?.length || 0;
        const progressData = module.content_items?.flatMap(item => 
          item.student_progress || []
        ) || [];
        
        const completedItems = progressData.filter(p => p.status === 'completed').length;
        const totalTimeSpent = progressData.reduce((sum, p) => sum + (p.time_spent || 0), 0);

        return {
          module_id: module.id,
          module_title: module.title,
          total_items: totalItems,
          completed_items: completedItems,
          completion_rate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
          time_spent: totalTimeSpent
        };
      }) || [];

      setProgressByModule(moduleProgress);
    } catch (err) {
      console.error('Error loading module progress:', err);
    }
  };

  const loadContentTypeActivity = async () => {
    try {
      let query = supabase
        .from('content_interactions')
        .select(`
          interaction_type,
          interaction_data,
          content_items!inner(
            content_type,
            student_progress(
              status,
              time_spent
            )
          )
        `)
        .eq('student_id', user?.id);

      if (courseId) {
        query = query.eq('content_items.module.course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by content type
      const activityMap = new Map<string, {
        interactions: number;
        totalTime: number;
        completedCount: number;
        totalCount: number;
      }>();

      data?.forEach(interaction => {
        const contentType = interaction.content_items?.content_type || 'unknown';
        const current = activityMap.get(contentType) || {
          interactions: 0,
          totalTime: 0,
          completedCount: 0,
          totalCount: 0
        };

        current.interactions += 1;
        current.totalCount += 1;
        
        if (interaction.content_items?.student_progress?.[0]) {
          const progress = interaction.content_items.student_progress[0];
          current.totalTime += progress.time_spent || 0;
          if (progress.status === 'completed') {
            current.completedCount += 1;
          }
        }

        activityMap.set(contentType, current);
      });

      const activity = Array.from(activityMap.entries()).map(([contentType, data]) => ({
        content_type: contentType,
        interactions: data.interactions,
        time_spent: data.totalTime,
        completion_rate: data.totalCount > 0 ? Math.round((data.completedCount / data.totalCount) * 100) : 0
      }));

      setContentTypeActivity(activity);
    } catch (err) {
      console.error('Error loading content type activity:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTimeForChart = (seconds: number) => {
    return Math.round(seconds / 60); // Convert to minutes for chart display
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Completion Rate</p>
                <p className="text-2xl font-bold">{Math.round(analytics?.average_completion_rate || 0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Completed Items</p>
                <p className="text-2xl font-bold">
                  {analytics?.completed_content_items || 0}/{analytics?.total_content_items || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Time Spent</p>
                <p className="text-2xl font-bold">{formatDuration(analytics?.total_time_spent || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Learning Streak</p>
                <p className="text-2xl font-bold">{analytics?.learning_streak || 0} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modules">Module Progress</TabsTrigger>
          <TabsTrigger value="content-types">Content Types</TabsTrigger>
          <TabsTrigger value="time-analysis">Time Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progress by Module</CardTitle>
            </CardHeader>
            <CardContent>
              {progressByModule.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={progressByModule}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="module_title" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'completion_rate' ? `${value}%` : value,
                          name === 'completion_rate' ? 'Completion Rate' : 'Completed Items'
                        ]}
                      />
                      <Bar dataKey="completion_rate" fill="hsl(var(--primary))" name="completion_rate" />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  <div className="space-y-2">
                    {progressByModule.map((module, index) => (
                      <div key={module.module_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <h4 className="font-medium">{module.module_title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {module.completed_items}/{module.total_items} items completed
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{module.completion_rate}%</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDuration(module.time_spent)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No module data available yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content-types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Type Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {contentTypeActivity.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={contentTypeActivity}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="interactions"
                        label={({ content_type, percent }) => `${content_type} ${(percent * 100).toFixed(0)}%`}
                      >
                        {contentTypeActivity.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="space-y-3">
                    {contentTypeActivity.map((activity, index) => (
                      <div key={activity.content_type} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div>
                            <h4 className="font-medium capitalize">{activity.content_type}</h4>
                            <p className="text-sm text-muted-foreground">
                              {activity.interactions} interactions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{activity.completion_rate}%</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDuration(activity.time_spent)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No content activity data available yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {progressByModule.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={progressByModule}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="module_title" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} min`, 'Time Spent']}
                    />
                    <Bar 
                      dataKey={(data) => formatTimeForChart(data.time_spent)} 
                      fill="hsl(var(--secondary))" 
                      name="time_spent"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No time analysis data available yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}