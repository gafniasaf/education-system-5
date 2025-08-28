-- Add draft functionality to submissions table
ALTER TABLE public.submissions 
ADD COLUMN draft_content TEXT,
ADD COLUMN submission_version INTEGER DEFAULT 1,
ADD COLUMN auto_save_timestamp TIMESTAMP WITH TIME ZONE;

-- Add index for performance on auto_save_timestamp
CREATE INDEX idx_submissions_auto_save ON public.submissions(student_id, auto_save_timestamp);

-- Add index for version tracking
CREATE INDEX idx_submissions_version ON public.submissions(assignment_id, student_id, submission_version);

-- Update existing submissions to have version 1
UPDATE public.submissions SET submission_version = 1 WHERE submission_version IS NULL;