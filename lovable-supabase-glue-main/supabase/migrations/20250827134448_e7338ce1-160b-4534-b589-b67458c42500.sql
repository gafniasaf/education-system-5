-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_course_teacher(course_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_uuid AND teacher_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_course_student(course_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE course_id = course_uuid AND student_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop and recreate courses policies to fix recursion
DROP POLICY IF EXISTS "courses_student_select_enrolled" ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_insert" ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_update_own" ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_delete_own" ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_select_own" ON public.courses;

-- Simple, non-recursive policies for courses
CREATE POLICY "courses_teacher_full_access" ON public.courses
FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "courses_student_select_enrolled" ON public.courses
FOR SELECT USING (public.is_course_student(id, auth.uid()));

-- Drop and recreate enrollments policies to fix recursion
DROP POLICY IF EXISTS "enrollments_teacher_select_course" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_student_select_own" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_student_insert_self" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_student_delete_self" ON public.enrollments;

-- Simple, non-recursive policies for enrollments
CREATE POLICY "enrollments_own_records" ON public.enrollments
FOR ALL USING (student_id = auth.uid());

CREATE POLICY "enrollments_teacher_view" ON public.enrollments
FOR SELECT USING (public.is_course_teacher(course_id, auth.uid()));

-- Fix assignments policies
DROP POLICY IF EXISTS "assignments_teacher_full_access" ON public.assignments;
DROP POLICY IF EXISTS "assignments_student_select_enrolled" ON public.assignments;

CREATE POLICY "assignments_teacher_full_access" ON public.assignments
FOR ALL USING (public.is_course_teacher(course_id, auth.uid()));

CREATE POLICY "assignments_student_select_enrolled" ON public.assignments
FOR SELECT USING (public.is_course_student(course_id, auth.uid()));