import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileUpload } from '@/components/FileUpload';
import { useSubmissionDrafts } from '@/hooks/useSubmissionDrafts';
import { formatDistanceToNow } from 'date-fns';
import { 
  Save, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  points_possible?: number;
  course_id: string;
}

interface StudentSubmissionInterfaceProps {
  assignment: Assignment;
  disabled?: boolean;
  onSubmissionComplete?: () => void;
}

export const StudentSubmissionInterface: React.FC<StudentSubmissionInterfaceProps> = ({
  assignment,
  disabled = false,
  onSubmissionComplete,
}) => {
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  
  const {
    submission,
    draftContent,
    files,
    isDraftSaving,
    isSubmitting,
    lastSaved,
    hasUnsavedChanges,
    isSubmitted,
    updateContent,
    updateFiles,
    forceSaveDraft,
    submitAssignment,
  } = useSubmissionDrafts({ 
    assignmentId: assignment.id,
    autoSaveInterval: 30000 // 30 seconds
  });

  const handleSubmit = async () => {
    if (!draftContent.trim() && files.length === 0) {
      return;
    }

    const success = await submitAssignment(draftContent, files);
    if (success) {
      setShowSubmitDialog(false);
      onSubmissionComplete?.();
    }
  };

  const getDueStatus = () => {
    if (!assignment.due_date) return null;
    
    const dueDate = new Date(assignment.due_date);
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    const hoursUntilDue = timeDiff / (1000 * 60 * 60);
    
    if (timeDiff < 0) {
      return {
        status: 'overdue',
        message: `Overdue by ${formatDistanceToNow(dueDate)}`,
        variant: 'destructive' as const
      };
    } else if (hoursUntilDue < 24) {
      return {
        status: 'due_soon',
        message: `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`,
        variant: 'default' as const
      };
    } else {
      return {
        status: 'upcoming',
        message: `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`,
        variant: 'secondary' as const
      };
    }
  };

  const dueStatus = getDueStatus();
  const canSubmit = !isSubmitted && !disabled && (draftContent.trim() || files.length > 0);

  return (
    <div className="space-y-6">
      {/* Assignment Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {assignment.title}
              </CardTitle>
              {assignment.description && (
                <CardDescription className="mt-2">
                  {assignment.description}
                </CardDescription>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {assignment.points_possible && (
                <Badge variant="outline">
                  {assignment.points_possible} points
                </Badge>
              )}
              {dueStatus && (
                <Badge variant={dueStatus.variant}>
                  {dueStatus.message}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Submission Status */}
      {isSubmitted ? (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Assignment submitted successfully!</span>
              <Badge variant="default">Submitted</Badge>
            </div>
            {submission?.submitted_at && (
              <p className="text-sm text-muted-foreground mt-1">
                Submitted {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}
              </p>
            )}
          </AlertDescription>
        </Alert>
      ) : dueStatus?.status === 'overdue' ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This assignment is overdue. You may still submit, but it may affect your grade.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Auto-save Status */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          {isDraftSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving draft...</span>
            </>
          ) : hasUnsavedChanges ? (
            <>
              <AlertCircle className="h-3 w-3 text-orange-500" />
              <span>Unsaved changes</span>
            </>
          ) : lastSaved ? (
            <>
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>
                Last saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
              </span>
            </>
          ) : null}
        </div>
        
        {hasUnsavedChanges && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={forceSaveDraft}
            disabled={isDraftSaving}
          >
            <Save className="h-3 w-3 mr-1" />
            Save Now
          </Button>
        )}
      </div>

      {/* Content Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Response</CardTitle>
          <CardDescription>
            Write your assignment response below. Your work is automatically saved as you type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={draftContent}
            onChange={(e) => updateContent(e.target.value)}
            placeholder="Start typing your response here..."
            className="min-h-[200px] resize-y"
            disabled={isSubmitted || disabled}
          />
          
          {/* Character/Word Count */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Characters: {draftContent.length}</span>
            <span>Words: {draftContent.trim() ? draftContent.trim().split(/\s+/).length : 0}</span>
          </div>
        </CardContent>
      </Card>

      {/* File Attachments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">File Attachments</CardTitle>
          <CardDescription>
            Upload supporting files for your assignment (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload
            bucketName="assignment-files"
            folder={`${assignment.course_id}/${assignment.id}`}
            existingFiles={files}
            onFilesChange={updateFiles}
            maxFiles={5}
            disabled={isSubmitted || disabled}
          />
        </CardContent>
      </Card>

      {/* Submit Section */}
      {!isSubmitted && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Ready to submit?</h4>
                <p className="text-sm text-muted-foreground">
                  Once submitted, you won't be able to make changes.
                </p>
              </div>
              <Button
                onClick={() => setShowSubmitDialog(true)}
                disabled={!canSubmit || isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Assignment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your assignment? You won't be able to make changes after submission.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Submission Summary */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Response length:</span>
                <span>{draftContent.length} characters</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Word count:</span>
                <span>{draftContent.trim() ? draftContent.trim().split(/\s+/).length : 0} words</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>File attachments:</span>
                <span>{files.length} files</span>
              </div>
            </div>

            {/* Due Date Warning */}
            {dueStatus?.status === 'overdue' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This assignment is overdue. Submitting now may result in a late penalty.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSubmitDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Confirm Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};