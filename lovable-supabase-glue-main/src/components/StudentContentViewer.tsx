import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Play, CheckCircle, Clock, BookOpen, FileText, Video, Headphones, Lock } from 'lucide-react';
import { useCourseContent, type ContentModule, type ContentItem, type StudentProgress } from '@/hooks/useCourseContent';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StudentContentViewerProps {
  courseId: string;
}

interface ModuleWithItems extends ContentModule {
  content_items?: ContentItem[];
}

const getContentTypeIcon = (type: string) => {
  switch (type) {
    case 'video': return <Video className="h-4 w-4" />;
    case 'audio': return <Headphones className="h-4 w-4" />;
    case 'document': return <FileText className="h-4 w-4" />;
    case 'reading': return <BookOpen className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-500';
    case 'in_progress': return 'bg-blue-500';
    default: return 'bg-gray-300';
  }
};

export function StudentContentViewer({ courseId }: StudentContentViewerProps) {
  const { user } = useAuth();
  const { modules, loading, error } = useCourseContent({ courseId, studentMode: true });
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [modulesWithItems, setModulesWithItems] = useState<ModuleWithItems[]>([]);
  const [studentProgress, setStudentProgress] = useState<Record<string, StudentProgress>>({});
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Load modules with content items
  useEffect(() => {
    if (!modules.length) return;

    const loadModulesWithItems = async () => {
      try {
        const modulesWithItemsData = await Promise.all(
          modules.map(async (module) => {
            const { data: items, error } = await supabase
              .from('content_items')
              .select('*')
              .eq('module_id', module.id)
              .order('item_order');

            if (error) throw error;

            return {
              ...module,
              content_items: (items || []).map(item => ({
                ...item,
                content_type: item.content_type as ContentItem['content_type'],
                content_data: item.content_data as Record<string, any>,
                file_attachments: Array.isArray(item.file_attachments) ? item.file_attachments : [],
              }))
            };
          })
        );

        setModulesWithItems(modulesWithItemsData);
      } catch (error) {
        console.error('Error loading module items:', error);
      }
    };

    loadModulesWithItems();
  }, [modules]);

  // Load student progress
  useEffect(() => {
    if (!user?.id || !modulesWithItems.length) return;

    const loadProgress = async () => {
      try {
        const allItemIds = modulesWithItems.flatMap(m => m.content_items?.map(i => i.id) || []);
        
        const { data, error } = await supabase
          .from('student_progress')
          .select('*')
          .eq('student_id', user.id)
          .in('content_item_id', allItemIds);

        if (error) throw error;

        const progressMap = (data || []).reduce((acc, progress) => {
          acc[progress.content_item_id] = progress as StudentProgress;
          return acc;
        }, {} as Record<string, StudentProgress>);

        setStudentProgress(progressMap);
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    };

    loadProgress();
  }, [user?.id, modulesWithItems]);

  // Set default selected module
  useEffect(() => {
    if (modulesWithItems.length > 0 && !selectedModuleId) {
      const firstPublishedModule = modulesWithItems.find(m => m.is_published);
      if (firstPublishedModule) {
        setSelectedModuleId(firstPublishedModule.id);
      }
    }
  }, [modulesWithItems, selectedModuleId]);

  const selectedModule = modulesWithItems.find(m => m.id === selectedModuleId);

  const updateProgress = async (itemId: string, updates: Partial<StudentProgress>) => {
    if (!user?.id) return;

    try {
      const existing = studentProgress[itemId];
      const progressData = {
        student_id: user.id,
        content_item_id: itemId,
        ...updates,
        last_accessed_at: new Date().toISOString(),
        first_accessed_at: existing?.first_accessed_at || new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('student_progress')
        .upsert(progressData, { onConflict: 'student_id,content_item_id' })
        .select()
        .single();

      if (error) throw error;

      setStudentProgress(prev => ({
        ...prev,
        [itemId]: data as StudentProgress
      }));

      // Track interaction
      await supabase.from('content_interactions').insert({
        student_id: user.id,
        content_item_id: itemId,
        interaction_type: updates.status === 'completed' ? 'completed' : 'accessed',
        interaction_data: {
          progress_percentage: updates.progress_percentage,
          time_spent: updates.time_spent,
        }
      });

    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    }
  };

  const startContentItem = async (itemId: string) => {
    setSelectedItemId(itemId);
    setStartTime(new Date());
    
    const existing = studentProgress[itemId];
    if (!existing || existing.status === 'not_started') {
      await updateProgress(itemId, {
        status: 'in_progress',
        progress_percentage: 0,
        time_spent: 0,
      });
    }
  };

  const completeContentItem = async (itemId: string) => {
    const timeSpent = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000) : 0;
    const existing = studentProgress[itemId];
    
    await updateProgress(itemId, {
      status: 'completed',
      progress_percentage: 100,
      time_spent: (existing?.time_spent || 0) + timeSpent,
      completed_at: new Date().toISOString(),
    });
    
    toast.success('Content completed!');
  };

  const calculateModuleProgress = (moduleId: string) => {
    const moduleItems = selectedModule?.content_items || [];
    if (moduleItems.length === 0) return 0;
    
    const completedItems = moduleItems.filter(item => 
      studentProgress[item.id]?.status === 'completed'
    ).length;
    
    return Math.round((completedItems / moduleItems.length) * 100);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
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
            Failed to load course content: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const publishedModules = modulesWithItems.filter(m => m.is_published && 
    (!m.publish_date || new Date(m.publish_date) <= new Date())
  );

  if (publishedModules.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No content is available yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Course Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {publishedModules.map((module) => {
                    const progress = calculateModuleProgress(module.id);
                    const isSelected = selectedModuleId === module.id;
                    
                    return (
                      <div
                        key={module.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedModuleId(module.id)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm">{module.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {progress}%
                            </Badge>
                          </div>
                          <Progress value={progress} className="h-1" />
                          {module.estimated_duration && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDuration(module.estimated_duration)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Content Display */}
        <div className="lg:col-span-2">
          {selectedModule && (
            <Card>
              <CardHeader>
                <div className="space-y-2">
                  <CardTitle>{selectedModule.title}</CardTitle>
                  {selectedModule.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedModule.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {selectedModule.content_items?.length || 0} items
                    </div>
                    {selectedModule.estimated_duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(selectedModule.estimated_duration)}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedItemId || 'overview'} onValueChange={setSelectedItemId}>
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div className="space-y-3">
                      {selectedModule.content_items
                        ?.sort((a, b) => a.item_order - b.item_order)
                        .map((item) => {
                          const progress = studentProgress[item.id];
                          const isLocked = item.is_required && progress?.status !== 'completed';
                          
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-4 border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${getStatusColor(progress?.status || 'not_started')}`}>
                                  {progress?.status === 'completed' ? (
                                    <CheckCircle className="h-4 w-4 text-white" />
                                  ) : (
                                    getContentTypeIcon(item.content_type)
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium">{item.title}</h4>
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {item.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {item.content_type}
                                    </Badge>
                                    {item.estimated_duration && (
                                      <span className="text-xs text-muted-foreground">
                                        {formatDuration(item.estimated_duration)}
                                      </span>
                                    )}
                                    {item.is_required && (
                                      <Badge variant="outline" className="text-xs">
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {progress?.status === 'completed' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startContentItem(item.id)}
                                  >
                                    Review
                                  </Button>
                                ) : (
                                  <Button
                                    variant={progress?.status === 'in_progress' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => startContentItem(item.id)}
                                    disabled={isLocked}
                                  >
                                    {isLocked ? (
                                      <Lock className="h-4 w-4" />
                                    ) : progress?.status === 'in_progress' ? (
                                      'Continue'
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                {progress?.status === 'in_progress' && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => completeContentItem(item.id)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}