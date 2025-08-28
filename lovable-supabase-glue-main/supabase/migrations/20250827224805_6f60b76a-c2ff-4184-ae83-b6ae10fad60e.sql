-- Phase 2: Enhanced Grade Management - Database Schema Updates

-- Add grade analytics tracking columns to submissions table
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS grade_scale VARCHAR(10) DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS late_penalty_applied DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_credit_points DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS grade_override BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS grade_comments TEXT,
ADD COLUMN IF NOT EXISTS time_spent_grading INTEGER; -- in minutes

-- Create grade history table for tracking grade changes
CREATE TABLE IF NOT EXISTS public.grade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  previous_grade INTEGER,
  new_grade INTEGER,
  previous_feedback TEXT,
  new_feedback TEXT,
  changed_by UUID NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_grade_history_submission FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE
);

-- Enable RLS on grade_history
ALTER TABLE public.grade_history ENABLE ROW LEVEL SECURITY;

-- Create policies for grade_history
CREATE POLICY "grade_history_student_view_own" 
ON public.grade_history 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.submissions s 
    WHERE s.id = grade_history.submission_id 
    AND s.student_id = auth.uid()
  )
);

CREATE POLICY "grade_history_teacher_full_access" 
ON public.grade_history 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.assignments a ON s.assignment_id = a.id
    JOIN public.courses c ON a.course_id = c.id
    WHERE s.id = grade_history.submission_id 
    AND c.teacher_id = auth.uid()
  )
);

-- Create grade analytics view for teachers
CREATE OR REPLACE VIEW public.grade_analytics AS
SELECT 
  c.id as course_id,
  c.title as course_title,
  c.teacher_id,
  a.id as assignment_id,
  a.title as assignment_title,
  a.points_possible,
  COUNT(s.id) as total_submissions,
  COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_submissions,
  AVG(s.grade) as average_grade,
  MIN(s.grade) as min_grade,
  MAX(s.grade) as max_grade,
  STDDEV(s.grade) as grade_stddev,
  COUNT(CASE WHEN s.submitted_at > a.due_date THEN 1 END) as late_submissions,
  AVG(CASE WHEN s.grade IS NOT NULL THEN s.time_spent_grading END) as avg_grading_time
FROM public.courses c
LEFT JOIN public.assignments a ON c.id = a.course_id
LEFT JOIN public.submissions s ON a.id = s.assignment_id
GROUP BY c.id, c.title, c.teacher_id, a.id, a.title, a.points_possible;

-- Create function to automatically log grade changes
CREATE OR REPLACE FUNCTION public.log_grade_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log if grade or feedback actually changed
  IF (OLD.grade IS DISTINCT FROM NEW.grade) OR (OLD.feedback IS DISTINCT FROM NEW.feedback) THEN
    INSERT INTO public.grade_history (
      submission_id,
      previous_grade,
      new_grade,
      previous_feedback,
      new_feedback,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.grade,
      NEW.grade,
      OLD.feedback,
      NEW.feedback,
      NEW.graded_by,
      CASE 
        WHEN OLD.grade IS NULL THEN 'Initial Grade'
        WHEN NEW.grade IS NULL THEN 'Grade Removed'
        ELSE 'Grade Updated'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic grade history logging
DROP TRIGGER IF EXISTS trigger_log_grade_changes ON public.submissions;
CREATE TRIGGER trigger_log_grade_changes
  AFTER UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_grade_changes();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grade_history_submission_id ON public.grade_history(submission_id);
CREATE INDEX IF NOT EXISTS idx_grade_history_changed_at ON public.grade_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_submissions_graded_at ON public.submissions(graded_at);
CREATE INDEX IF NOT EXISTS idx_submissions_grade_scale ON public.submissions(grade_scale);

-- Create function to calculate grade statistics
CREATE OR REPLACE FUNCTION public.get_grade_statistics(assignment_uuid UUID)
RETURNS TABLE(
  total_submissions BIGINT,
  graded_submissions BIGINT,
  average_grade NUMERIC,
  median_grade NUMERIC,
  grade_distribution JSONB,
  completion_rate NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  total_students BIGINT;
  grade_array NUMERIC[];
BEGIN
  -- Get total enrolled students for completion rate
  SELECT COUNT(*) INTO total_students
  FROM public.enrollments e
  JOIN public.assignments a ON a.course_id = e.course_id
  WHERE a.id = assignment_uuid;

  -- Get grade array for median calculation
  SELECT ARRAY_AGG(grade ORDER BY grade) INTO grade_array
  FROM public.submissions s
  WHERE s.assignment_id = assignment_uuid 
  AND s.grade IS NOT NULL;

  RETURN QUERY
  SELECT 
    COUNT(s.id) as total_submissions,
    COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_submissions,
    AVG(s.grade) as average_grade,
    CASE 
      WHEN array_length(grade_array, 1) > 0 THEN
        CASE 
          WHEN array_length(grade_array, 1) % 2 = 1 THEN
            grade_array[array_length(grade_array, 1) / 2 + 1]
          ELSE
            (grade_array[array_length(grade_array, 1) / 2] + grade_array[array_length(grade_array, 1) / 2 + 1]) / 2
        END
      ELSE NULL
    END as median_grade,
    (
      SELECT jsonb_object_agg(grade_range, count)
      FROM (
        SELECT 
          CASE 
            WHEN (s.grade::FLOAT / a.points_possible * 100) >= 90 THEN 'A (90-100%)'
            WHEN (s.grade::FLOAT / a.points_possible * 100) >= 80 THEN 'B (80-89%)'
            WHEN (s.grade::FLOAT / a.points_possible * 100) >= 70 THEN 'C (70-79%)'
            WHEN (s.grade::FLOAT / a.points_possible * 100) >= 60 THEN 'D (60-69%)'
            ELSE 'F (<60%)'
          END as grade_range,
          COUNT(*) as count
        FROM public.submissions s
        JOIN public.assignments a ON s.assignment_id = a.id
        WHERE s.assignment_id = assignment_uuid 
        AND s.grade IS NOT NULL
        GROUP BY grade_range
      ) grade_ranges
    ) as grade_distribution,
    CASE 
      WHEN total_students > 0 THEN 
        (COUNT(s.id)::NUMERIC / total_students * 100)
      ELSE 0 
    END as completion_rate
  FROM public.submissions s
  WHERE s.assignment_id = assignment_uuid;
END;
$$;