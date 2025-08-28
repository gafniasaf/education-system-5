import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { 
  FileText, 
  Clock, 
  Trash2, 
  Eye, 
  Download,
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface DraftSubmission {
  id: string;
  assignment_id: string;
  draft_content?: string;
  auto_save_timestamp?: string;
  submission_version: number;
  created_at: string;
  assignment?: {
    title: string;
    course?: {
      title: string;
    };
  };
  file_attachments?: any[];
}

interface SubmissionDraftManagerProps {
  onDraftSelect?: (draftId: string, assignmentId: string) => void;
  className?: string;
}

export const SubmissionDraftManager: React.FC<SubmissionDraftManagerProps> = ({
  onDraftSelect,
  className,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [drafts, setDrafts] = useState<DraftSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<DraftSubmission | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDrafts();
    }
  }, [user]);

  const fetchDrafts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          assignment_id,
          draft_content,
          auto_save_timestamp,
          submission_version,
          created_at,
          file_attachments,
          assignments!inner (
            title,
            courses!inner (title)
          )
        `)
        .eq('student_id', user.id)
        .is('submitted_at', null) // Only drafts (not submitted)
        .not('draft_content', 'is', null) // Has draft content
        .order('auto_save_timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;

      const draftsWithAssignments = (data || []).map(draft => {
        const draftData = draft as any;
        return {
          id: draftData.id,
          assignment_id: draftData.assignment_id,
          draft_content: draftData.draft_content,
          auto_save_timestamp: draftData.auto_save_timestamp,
          submission_version: draftData.submission_version,
          created_at: draftData.created_at,
          file_attachments: draftData.file_attachments,
          assignment: {
            title: draftData.assignments?.title || 'Unknown Assignment',
            course: {
              title: draftData.assignments?.courses?.title || 'Unknown Course'
            }
          },
        };
      });

      setDrafts(draftsWithAssignments);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      toast({
        title: "Error",
        description: "Failed to load drafts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteDraft = async (draftId: string) => {
    try {
      setDeletingId(draftId);

      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', draftId)
        .eq('student_id', user?.id); // Extra safety check

      if (error) throw error;

      setDrafts(prev => prev.filter(draft => draft.id !== draftId));
      setShowDeleteDialog(false);
      setSelectedDraft(null);

      toast({
        title: "Success",
        description: "Draft deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: "Error",
        description: "Failed to delete draft",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteClick = (draft: DraftSubmission) => {
    setSelectedDraft(draft);
    setShowDeleteDialog(true);
  };

  const handlePreviewClick = (draft: DraftSubmission) => {
    setSelectedDraft(draft);
    setShowPreviewDialog(true);
  };

  const getTimeAgo = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const getContentPreview = (content?: string) => {
    if (!content) return 'No content';
    return content.length > 100 ? `${content.substring(0, 100)}...` : content;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-y-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-muted-foreground ml-2">Loading drafts...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Draft Submissions
              </CardTitle>
              <CardDescription>
                Auto-saved drafts that haven't been submitted yet
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDrafts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No drafts found</h3>
              <p className="text-muted-foreground">
                Your assignment drafts will appear here as you work on them.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <Card key={draft.id} className="border border-muted">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">
                            {draft.assignment?.title || 'Unknown Assignment'}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            v{draft.submission_version}
                          </Badge>
                        </div>
                        
                        {draft.assignment?.course && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {draft.assignment.course.title}
                          </p>
                        )}
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {getContentPreview(draft.draft_content)}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Saved {getTimeAgo(draft.auto_save_timestamp)}</span>
                          </div>
                          
                          {draft.file_attachments && draft.file_attachments.length > 0 && (
                            <span>{draft.file_attachments.length} file(s)</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewClick(draft)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {onDraftSelect && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDraftSelect(draft.id, draft.assignment_id)}
                          >
                            Continue
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(draft)}
                          disabled={deletingId === draft.id}
                        >
                          {deletingId === draft.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Draft</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this draft? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDraft && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{selectedDraft.assignment?.title}</strong>
                <br />
                Last saved {getTimeAgo(selectedDraft.auto_save_timestamp)}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={!!deletingId}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedDraft && deleteDraft(selectedDraft.id)}
              disabled={!!deletingId}
            >
              {deletingId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Draft Preview</DialogTitle>
            <DialogDescription>
              {selectedDraft?.assignment?.title} - {selectedDraft?.assignment?.course?.title}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDraft && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Version {selectedDraft.submission_version}</span>
                <span>•</span>
                <span>Saved {getTimeAgo(selectedDraft.auto_save_timestamp)}</span>
                {selectedDraft.file_attachments && selectedDraft.file_attachments.length > 0 && (
                  <>
                    <span>•</span>
                    <span>{selectedDraft.file_attachments.length} file(s) attached</span>
                  </>
                )}
              </div>
              
              {selectedDraft.draft_content && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">Content</h4>
                  <div className="whitespace-pre-wrap text-sm">
                    {selectedDraft.draft_content}
                  </div>
                </div>
              )}
              
              {selectedDraft.file_attachments && selectedDraft.file_attachments.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">File Attachments</h4>
                  <div className="space-y-2">
                    {selectedDraft.file_attachments.map((file: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        <span>{file.name || `File ${index + 1}`}</span>
                        {file.size && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(file.size / 1024)}KB
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {onDraftSelect && selectedDraft && (
              <Button
                onClick={() => {
                  onDraftSelect(selectedDraft.id, selectedDraft.assignment_id);
                  setShowPreviewDialog(false);
                }}
              >
                Continue Working
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};