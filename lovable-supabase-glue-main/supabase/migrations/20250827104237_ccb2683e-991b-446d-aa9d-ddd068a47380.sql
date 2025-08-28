-- Create rubrics table
CREATE TABLE public.rubrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  total_points INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rubric criteria table
CREATE TABLE public.rubric_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rubric_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rubric grades table for individual criteria scoring
CREATE TABLE public.rubric_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL,
  criterion_id UUID NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  graded_by UUID NOT NULL,
  UNIQUE(submission_id, criterion_id)
);

-- Enable RLS on all tables
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_grades ENABLE ROW LEVEL SECURITY;

-- RLS policies for rubrics
CREATE POLICY "rubrics_teacher_full_access" 
ON public.rubrics 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM assignments a 
  JOIN courses c ON a.course_id = c.id 
  WHERE a.id = rubrics.assignment_id AND c.teacher_id = auth.uid()
));

CREATE POLICY "rubrics_student_select_enrolled" 
ON public.rubrics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM assignments a 
  JOIN courses c ON a.course_id = c.id 
  JOIN enrollments e ON c.id = e.course_id 
  WHERE a.id = rubrics.assignment_id AND e.student_id = auth.uid()
));

-- RLS policies for rubric criteria
CREATE POLICY "rubric_criteria_teacher_full_access" 
ON public.rubric_criteria 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM rubrics r 
  JOIN assignments a ON r.assignment_id = a.id 
  JOIN courses c ON a.course_id = c.id 
  WHERE r.id = rubric_criteria.rubric_id AND c.teacher_id = auth.uid()
));

CREATE POLICY "rubric_criteria_student_select_enrolled" 
ON public.rubric_criteria 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM rubrics r 
  JOIN assignments a ON r.assignment_id = a.id 
  JOIN courses c ON a.course_id = c.id 
  JOIN enrollments e ON c.id = e.course_id 
  WHERE r.id = rubric_criteria.rubric_id AND e.student_id = auth.uid()
));

-- RLS policies for rubric grades
CREATE POLICY "rubric_grades_teacher_full_access" 
ON public.rubric_grades 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM submissions s 
  JOIN assignments a ON s.assignment_id = a.id 
  JOIN courses c ON a.course_id = c.id 
  WHERE s.id = rubric_grades.submission_id AND c.teacher_id = auth.uid()
));

CREATE POLICY "rubric_grades_student_select_own" 
ON public.rubric_grades 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM submissions s 
  WHERE s.id = rubric_grades.submission_id AND s.student_id = auth.uid()
));

-- Create triggers for updated_at
CREATE TRIGGER update_rubrics_updated_at
  BEFORE UPDATE ON public.rubrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraints after policies
ALTER TABLE public.rubrics 
ADD CONSTRAINT rubrics_assignment_id_fkey 
FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;

ALTER TABLE public.rubric_criteria 
ADD CONSTRAINT rubric_criteria_rubric_id_fkey 
FOREIGN KEY (rubric_id) REFERENCES public.rubrics(id) ON DELETE CASCADE;

ALTER TABLE public.rubric_grades 
ADD CONSTRAINT rubric_grades_submission_id_fkey 
FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE;

ALTER TABLE public.rubric_grades 
ADD CONSTRAINT rubric_grades_criterion_id_fkey 
FOREIGN KEY (criterion_id) REFERENCES public.rubric_criteria(id) ON DELETE CASCADE;