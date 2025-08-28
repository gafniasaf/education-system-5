-- Update helper functions to be properly secured
DROP FUNCTION IF EXISTS public.is_course_teacher(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_course_student(uuid, uuid);

-- Teacher of a course?
CREATE OR REPLACE FUNCTION public.is_course_teacher(course_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = course_uuid
      AND c.teacher_id = user_uuid
  );
END;
$$;

-- Student enrolled in a course?
CREATE OR REPLACE FUNCTION public.is_course_student(course_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.course_id = course_uuid
      AND e.student_id = user_uuid
  );
END;
$$;

-- Drop existing broad policies and replace with deny-by-default, action-specific policies

-- COURSES: Drop existing policies
DROP POLICY IF EXISTS courses_teacher_access ON public.courses;
DROP POLICY IF EXISTS courses_student_view ON public.courses;

-- COURSES: Apply deny-by-default template
CREATE POLICY courses_select_teacher ON public.courses
FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY courses_select_student ON public.courses
FOR SELECT USING (public.is_course_student(id, auth.uid()));

CREATE POLICY courses_insert_teacher ON public.courses
FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY courses_update_teacher ON public.courses
FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY courses_delete_teacher ON public.courses
FOR DELETE USING (teacher_id = auth.uid());

-- ENROLLMENTS: Drop existing policies
DROP POLICY IF EXISTS enrollments_student_access ON public.enrollments;
DROP POLICY IF EXISTS enrollments_teacher_view ON public.enrollments;

-- ENROLLMENTS: Apply deny-by-default template
CREATE POLICY enrollments_select_student ON public.enrollments
FOR SELECT USING (student_id = auth.uid());

CREATE POLICY enrollments_select_teacher ON public.enrollments
FOR SELECT USING (public.is_course_teacher(course_id, auth.uid()));

CREATE POLICY enrollments_insert_self ON public.enrollments
FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY enrollments_delete_self ON public.enrollments
FOR DELETE USING (student_id = auth.uid());

-- ASSIGNMENTS: Drop existing policies
DROP POLICY IF EXISTS assignments_teacher_access ON public.assignments;
DROP POLICY IF EXISTS assignments_student_view ON public.assignments;

-- ASSIGNMENTS: Apply deny-by-default template
CREATE POLICY assignments_select_student ON public.assignments
FOR SELECT USING (public.is_course_student(course_id, auth.uid()));

CREATE POLICY assignments_select_teacher ON public.assignments
FOR SELECT USING (public.is_course_teacher(course_id, auth.uid()));

CREATE POLICY assignments_insert_teacher ON public.assignments
FOR INSERT WITH CHECK (public.is_course_teacher(course_id, auth.uid()));

CREATE POLICY assignments_update_teacher ON public.assignments
FOR UPDATE USING (public.is_course_teacher(course_id, auth.uid()));

CREATE POLICY assignments_delete_teacher ON public.assignments
FOR DELETE USING (public.is_course_teacher(course_id, auth.uid()));