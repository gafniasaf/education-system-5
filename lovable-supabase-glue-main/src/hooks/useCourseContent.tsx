import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ContentModule {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  module_order: number;
  is_published: boolean;
  publish_date?: string;
  due_date?: string;
  estimated_duration?: number;
  learning_objectives?: string[];
  prerequisites?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  content_type: 'video' | 'document' | 'link' | 'text' | 'quiz' | 'interactive';
  content_data: Record<string, any>;
  item_order: number;
  is_required: boolean;
  estimated_duration?: number;
  content_url?: string;
  file_attachments?: any[];
  embed_code?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentProgress {
  id: string;
  student_id: string;
  content_item_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  progress_percentage: number;
  time_spent: number;
  first_accessed_at?: string;
  last_accessed_at?: string;
  completed_at?: string;
  notes?: string;
  bookmarked: boolean;
}

interface UseCourseContentOptions {
  courseId?: string;
  moduleId?: string;
  studentMode?: boolean;
}

export const useCourseContent = ({ 
  courseId, 
  moduleId, 
  studentMode = false 
}: UseCourseContentOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [modules, setModules] = useState<ContentModule[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch modules for a course
  const fetchModules = useCallback(async (course_id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('content_modules')
        .select('*')
        .eq('course_id', course_id)
        .order('module_order');

      if (error) throw error;

      setModules(data || []);
    } catch (err) {
      console.error('Error fetching modules:', err);
      setError('Failed to load course modules');
      toast({
        title: "Error",
        description: "Failed to load course modules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch content items for a module
  const fetchContentItems = useCallback(async (module_id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('module_id', module_id)
        .order('item_order');

      if (error) throw error;

      setContentItems((data || []).map(item => ({
        ...item,
        content_type: item.content_type as ContentItem['content_type'],
        content_data: item.content_data as Record<string, any>,
        file_attachments: Array.isArray(item.file_attachments) ? item.file_attachments : [],
      })));
    } catch (err) {
      console.error('Error fetching content items:', err);
      setError('Failed to load content items');
      toast({
        title: "Error",
        description: "Failed to load content items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch student progress
  const fetchStudentProgress = useCallback(async (student_id: string, content_item_ids: string[]) => {
    try {
      const { data, error } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', student_id)
        .in('content_item_id', content_item_ids);

      if (error) throw error;

      setStudentProgress((data || []).map(progress => ({
        ...progress,
        status: progress.status as StudentProgress['status'],
      })));
    } catch (err) {
      console.error('Error fetching student progress:', err);
      setError('Failed to load progress data');
    }
  }, []);

  // Create a new module
  const createModule = useCallback(async (moduleData: Partial<ContentModule>) => {
    if (!user || !courseId) return null;

    try {
      const { data, error } = await supabase
        .from('content_modules')
        .insert({
          title: moduleData.title!,
          course_id: courseId,
          created_by: user.id,
          description: moduleData.description,
          module_order: moduleData.module_order || 0,
          is_published: moduleData.is_published || false,
          publish_date: moduleData.publish_date,
          due_date: moduleData.due_date,
          estimated_duration: moduleData.estimated_duration,
          learning_objectives: moduleData.learning_objectives,
          prerequisites: moduleData.prerequisites,
        })
        .select()
        .single();

      if (error) throw error;

      setModules(prev => [...prev, data].sort((a, b) => a.module_order - b.module_order));
      
      toast({
        title: "Success",
        description: "Module created successfully",
      });

      return data;
    } catch (err) {
      console.error('Error creating module:', err);
      toast({
        title: "Error",
        description: "Failed to create module",
        variant: "destructive",
      });
      return null;
    }
  }, [user, courseId, toast]);

  // Update a module
  const updateModule = useCallback(async (moduleId: string, updates: Partial<ContentModule>) => {
    try {
      const { data, error } = await supabase
        .from('content_modules')
        .update(updates)
        .eq('id', moduleId)
        .select()
        .single();

      if (error) throw error;

      setModules(prev => prev.map(m => m.id === moduleId ? data : m));
      
      toast({
        title: "Success",
        description: "Module updated successfully",
      });

      return data;
    } catch (err) {
      console.error('Error updating module:', err);
      toast({
        title: "Error",
        description: "Failed to update module",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Delete a module
  const deleteModule = useCallback(async (moduleId: string) => {
    try {
      const { error } = await supabase
        .from('content_modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      setModules(prev => prev.filter(m => m.id !== moduleId));
      
      toast({
        title: "Success",
        description: "Module deleted successfully",
      });

      return true;
    } catch (err) {
      console.error('Error deleting module:', err);
      toast({
        title: "Error",
        description: "Failed to delete module",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Create a content item
  const createContentItem = useCallback(async (itemData: Partial<ContentItem>) => {
    if (!moduleId) return null;

    try {
      const { data, error } = await supabase
        .from('content_items')
        .insert({
          title: itemData.title!,
          module_id: moduleId,
          content_type: itemData.content_type!,
          description: itemData.description,
          content_data: itemData.content_data || {},
          item_order: itemData.item_order || 0,
          is_required: itemData.is_required !== false,
          estimated_duration: itemData.estimated_duration,
          content_url: itemData.content_url,
          file_attachments: itemData.file_attachments || [],
          embed_code: itemData.embed_code,
        })
        .select()
        .single();

      if (error) throw error;

      setContentItems(prev => [...prev, {
        ...data,
        content_type: data.content_type as ContentItem['content_type'],
        content_data: data.content_data as Record<string, any>,
        file_attachments: Array.isArray(data.file_attachments) ? data.file_attachments : [],
      }].sort((a, b) => a.item_order - b.item_order));
      
      toast({
        title: "Success",
        description: "Content item created successfully",
      });

      return data;
    } catch (err) {
      console.error('Error creating content item:', err);
      toast({
        title: "Error",
        description: "Failed to create content item",
        variant: "destructive",
      });
      return null;
    }
  }, [moduleId, toast]);

  // Update a content item
  const updateContentItem = useCallback(async (itemId: string, updates: Partial<ContentItem>) => {
    try {
      const { data, error } = await supabase
        .from('content_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      setContentItems(prev => prev.map(item => item.id === itemId ? {
        ...data,
        content_type: data.content_type as ContentItem['content_type'],
        content_data: data.content_data as Record<string, any>,
        file_attachments: Array.isArray(data.file_attachments) ? data.file_attachments : [],
      } : item));
      
      toast({
        title: "Success",
        description: "Content item updated successfully",
      });

      return data;
    } catch (err) {
      console.error('Error updating content item:', err);
      toast({
        title: "Error",
        description: "Failed to update content item",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Delete a content item
  const deleteContentItem = useCallback(async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('content_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setContentItems(prev => prev.filter(item => item.id !== itemId));
      
      toast({
        title: "Success",
        description: "Content item deleted successfully",
      });

      return true;
    } catch (err) {
      console.error('Error deleting content item:', err);
      toast({
        title: "Error",
        description: "Failed to delete content item",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Update student progress
  const updateProgress = useCallback(async (
    contentItemId: string, 
    progressData: Partial<StudentProgress>
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('student_progress')
        .upsert({
          student_id: user.id,
          content_item_id: contentItemId,
          ...progressData,
        })
        .select()
        .single();

      if (error) throw error;

      setStudentProgress(prev => {
        const existing = prev.find(p => p.content_item_id === contentItemId);
        const updatedProgress = {
          ...data,
          status: data.status as StudentProgress['status'],
        };
        if (existing) {
          return prev.map(p => p.content_item_id === contentItemId ? updatedProgress : p);
        } else {
          return [...prev, updatedProgress];
        }
      });

      return data;
    } catch (err) {
      console.error('Error updating progress:', err);
      toast({
        title: "Error",
        description: "Failed to update progress",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast]);

  // Mark content as completed
  const markAsCompleted = useCallback(async (contentItemId: string) => {
    return updateProgress(contentItemId, {
      status: 'completed',
      progress_percentage: 100,
      completed_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    });
  }, [updateProgress]);

  // Track content interaction
  const trackInteraction = useCallback(async (
    contentItemId: string, 
    interactionType: string, 
    interactionData?: Record<string, any>
  ) => {
    if (!user) return;

    try {
      await supabase
        .from('content_interactions')
        .insert({
          student_id: user.id,
          content_item_id: contentItemId,
          interaction_type: interactionType,
          interaction_data: interactionData || {},
        });
    } catch (err) {
      console.error('Error tracking interaction:', err);
    }
  }, [user]);

  // Auto-fetch data based on provided IDs
  useEffect(() => {
    if (courseId && !studentMode) {
      fetchModules(courseId);
    }
  }, [courseId, studentMode, fetchModules]);

  useEffect(() => {
    if (moduleId) {
      fetchContentItems(moduleId);
    }
  }, [moduleId, fetchContentItems]);

  useEffect(() => {
    if (studentMode && user && contentItems.length > 0) {
      const itemIds = contentItems.map(item => item.id);
      fetchStudentProgress(user.id, itemIds);
    }
  }, [studentMode, user, contentItems, fetchStudentProgress]);

  // Get progress for a specific content item
  const getProgressForItem = useCallback((contentItemId: string) => {
    return studentProgress.find(p => p.content_item_id === contentItemId);
  }, [studentProgress]);

  // Calculate module completion percentage
  const getModuleCompletion = useCallback((moduleItems: ContentItem[]) => {
    if (moduleItems.length === 0) return 0;
    
    const completedItems = moduleItems.filter(item => {
      const progress = getProgressForItem(item.id);
      return progress?.status === 'completed';
    });
    
    return (completedItems.length / moduleItems.length) * 100;
  }, [getProgressForItem]);

  return {
    modules,
    contentItems,
    studentProgress,
    loading,
    error,
    // Module operations
    createModule,
    updateModule,
    deleteModule,
    fetchModules,
    // Content item operations
    createContentItem,
    updateContentItem,
    deleteContentItem,
    fetchContentItems,
    // Progress operations
    updateProgress,
    markAsCompleted,
    trackInteraction,
    getProgressForItem,
    getModuleCompletion,
    // Refresh functions
    refetch: () => {
      if (courseId) fetchModules(courseId);
      if (moduleId) fetchContentItems(moduleId);
    }
  };
};