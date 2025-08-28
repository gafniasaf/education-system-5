-- Update function to have proper search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update all policies to restrict to authenticated users only
-- Drop and recreate policies with authenticated restriction

-- Assignments policies
DROP POLICY IF EXISTS "assignments_teacher_full_access" ON public.assignments;
DROP POLICY IF EXISTS "assignments_student_select_enrolled" ON public.assignments;

CREATE POLICY "assignments_teacher_full_access" ON public.assignments 
FOR ALL 
TO authenticated
USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid()));

CREATE POLICY "assignments_student_select_enrolled" ON public.assignments 
FOR SELECT 
TO authenticated
USING (EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = assignments.course_id AND e.student_id = auth.uid()));

-- Submissions policies  
DROP POLICY IF EXISTS "submissions_student_own" ON public.submissions;
DROP POLICY IF EXISTS "submissions_teacher_course" ON public.submissions;

CREATE POLICY "submissions_student_own" ON public.submissions 
FOR ALL 
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "submissions_teacher_course" ON public.submissions 
FOR ALL 
TO authenticated
USING (EXISTS (SELECT 1 FROM assignments a JOIN courses c ON a.course_id = c.id WHERE a.id = submissions.assignment_id AND c.teacher_id = auth.uid()));

-- Update existing policies to restrict to authenticated users
DROP POLICY IF EXISTS "courses_student_select_enrolled" ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_delete_own" ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_select_own" ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_update_own" ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_insert" ON public.courses;

CREATE POLICY "courses_teacher_select_own" ON public.courses 
FOR SELECT 
TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "courses_teacher_insert" ON public.courses 
FOR INSERT 
TO authenticated
WITH CHECK (teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'teacher'));

CREATE POLICY "courses_teacher_update_own" ON public.courses 
FOR UPDATE 
TO authenticated
USING (teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'teacher'));

CREATE POLICY "courses_teacher_delete_own" ON public.courses 
FOR DELETE 
TO authenticated
USING (teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'teacher'));

CREATE POLICY "courses_student_select_enrolled" ON public.courses 
FOR SELECT 
TO authenticated
USING (EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = courses.id AND e.student_id = auth.uid()));

-- Update enrollments policies
DROP POLICY IF EXISTS "enrollments_student_select_own" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_student_insert_self" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_student_delete_self" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_teacher_select_course" ON public.enrollments;

CREATE POLICY "enrollments_student_select_own" ON public.enrollments 
FOR SELECT 
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "enrollments_student_insert_self" ON public.enrollments 
FOR INSERT 
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "enrollments_student_delete_self" ON public.enrollments 
FOR DELETE 
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "enrollments_teacher_select_course" ON public.enrollments 
FOR SELECT 
TO authenticated
USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = enrollments.course_id AND c.teacher_id = auth.uid()));

-- Update profiles policies
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

CREATE POLICY "profiles_select_self" ON public.profiles 
FOR SELECT 
TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_insert_self" ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_self" ON public.profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

-- Update parent_links policies
DROP POLICY IF EXISTS "parent_links_parent_read" ON public.parent_links;

CREATE POLICY "parent_links_parent_read" ON public.parent_links 
FOR SELECT 
TO authenticated
USING (auth.uid() = parent_id);

-- Update audit_logs policies  
DROP POLICY IF EXISTS "audit_logs_insert_any_auth" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_none" ON public.audit_logs;

CREATE POLICY "audit_logs_insert_any_auth" ON public.audit_logs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "audit_logs_select_none" ON public.audit_logs 
FOR SELECT 
TO authenticated
USING (false);