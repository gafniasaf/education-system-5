import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

interface SubmissionDraft {
  id?: string;
  assignment_id: string;
  student_id: string;
  content?: string;
  draft_content?: string;
  file_attachments?: FileAttachment[];
  auto_save_timestamp?: string;
  submission_version: number;
  submitted_at?: string;
}

interface UseSubmissionDraftsOptions {
  assignmentId: string;
  autoSaveInterval?: number; // milliseconds
}

export const useSubmissionDrafts = ({ 
  assignmentId, 
  autoSaveInterval = 30000 // 30 seconds default
}: UseSubmissionDraftsOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [submission, setSubmission] = useState<SubmissionDraft | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const previousContentRef = useRef('');
  const previousFilesRef = useRef<FileAttachment[]>([]);

  // Fetch existing submission/draft
  const fetchSubmission = useCallback(async () => {
    if (!user || !assignmentId) return;

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .order('submission_version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const fileAttachments = Array.isArray(data.file_attachments) 
          ? data.file_attachments as unknown as FileAttachment[]
          : [];
        
        setSubmission({
          ...data,
          file_attachments: fileAttachments
        });
        setDraftContent(data.draft_content || data.content || '');
        setFiles(fileAttachments);
        previousContentRef.current = data.draft_content || data.content || '';
        previousFilesRef.current = fileAttachments;
        setLastSaved(data.auto_save_timestamp ? new Date(data.auto_save_timestamp) : null);
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
      toast({
        title: "Error",
        description: "Failed to load existing submission",
        variant: "destructive",
      });
    }
  }, [user, assignmentId, toast]);

  // Auto-save draft
  const saveDraft = useCallback(async (content: string, attachments: FileAttachment[]) => {
    if (!user || !assignmentId) return;

    // Check if there are actually changes
    const contentChanged = content !== previousContentRef.current;
    const filesChanged = JSON.stringify(attachments) !== JSON.stringify(previousFilesRef.current);
    
    if (!contentChanged && !filesChanged) return;

    setIsDraftSaving(true);

    try {
      const now = new Date().toISOString();
      
      if (submission?.id) {
        // Update existing submission draft
        const { error } = await supabase
          .from('submissions')
          .update({
            draft_content: content,
            file_attachments: attachments as any,
            auto_save_timestamp: now,
          })
          .eq('id', submission.id);

        if (error) throw error;
      } else {
        // Create new draft submission
        const { data, error } = await supabase
          .from('submissions')
          .insert({
            assignment_id: assignmentId,
            student_id: user.id,
            draft_content: content,
            file_attachments: attachments as any,
            auto_save_timestamp: now,
            submission_version: 1,
          })
          .select()
          .single();

        if (error) throw error;
        
        const fileAttachments = Array.isArray(data.file_attachments) 
          ? data.file_attachments as unknown as FileAttachment[]
          : [];
        setSubmission({
          ...data,
          file_attachments: fileAttachments
        });
      }

      previousContentRef.current = content;
      previousFilesRef.current = attachments;
      setLastSaved(new Date(now));
      setHasUnsavedChanges(false);

    } catch (error) {
      console.error('Error saving draft:', error);
      // Don't show error toast for auto-save failures to avoid spam
    } finally {
      setIsDraftSaving(false);
    }
  }, [user, assignmentId, submission?.id]);

  // Submit final submission
  const submitAssignment = useCallback(async (content: string, attachments: FileAttachment[]) => {
    if (!user || !assignmentId) return false;

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      
      if (submission?.id) {
        // Update existing submission to final
        const { error } = await supabase
          .from('submissions')
          .update({
            content: content,
            file_attachments: attachments as any,
            submitted_at: now,
            draft_content: null, // Clear draft after submission
            auto_save_timestamp: null,
          })
          .eq('id', submission.id);

        if (error) throw error;
      } else {
        // Create new final submission
        const { data, error } = await supabase
          .from('submissions')
          .insert({
            assignment_id: assignmentId,
            student_id: user.id,
            content: content,
            file_attachments: attachments as any,
            submitted_at: now,
            submission_version: 1,
          })
          .select()
          .single();

        if (error) throw error;
        
        const fileAttachments = Array.isArray(data.file_attachments) 
          ? data.file_attachments as unknown as FileAttachment[]
          : [];
        setSubmission({
          ...data,
          file_attachments: fileAttachments
        });
      }

      setHasUnsavedChanges(false);
      
      toast({
        title: "Success",
        description: "Assignment submitted successfully",
      });

      return true;
    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast({
        title: "Error",
        description: "Failed to submit assignment",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [user, assignmentId, submission?.id, toast]);

  // Handle content changes
  const updateContent = useCallback((newContent: string) => {
    setDraftContent(newContent);
    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new auto-save timeout
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDraft(newContent, files);
    }, autoSaveInterval);
  }, [files, saveDraft, autoSaveInterval]);

  // Handle file changes
  const updateFiles = useCallback((newFiles: FileAttachment[]) => {
    setFiles(newFiles);
    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new auto-save timeout
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDraft(draftContent, newFiles);
    }, autoSaveInterval);
  }, [draftContent, saveDraft, autoSaveInterval]);

  // Force save draft (manual save)
  const forceSaveDraft = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    return saveDraft(draftContent, files);
  }, [draftContent, files, saveDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Fetch submission on mount
  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    submission,
    draftContent,
    files,
    isDraftSaving,
    isSubmitting,
    lastSaved,
    hasUnsavedChanges,
    isSubmitted: !!submission?.submitted_at,
    updateContent,
    updateFiles,
    forceSaveDraft,
    submitAssignment,
    refetchSubmission: fetchSubmission,
  };
};