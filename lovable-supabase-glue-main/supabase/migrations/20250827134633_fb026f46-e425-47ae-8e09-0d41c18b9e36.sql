-- Harden functions with fixed search_path
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
STABLE
AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = user_uuid);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_course_teacher(course_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_uuid AND teacher_id = user_uuid
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_course_student(course_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE course_id = course_uuid AND student_id = user_uuid
  );
END;
$$;

-- Ensure INSERTs are allowed appropriately
-- Courses: allow teachers to insert their own rows
DROP POLICY IF EXISTS "courses_teacher_insert_check" ON public.courses;
CREATE POLICY "courses_teacher_insert_check" ON public.courses
FOR INSERT WITH CHECK (teacher_id = auth.uid());

-- Assignments: allow teachers to insert for their courses
DROP POLICY IF EXISTS "assignments_teacher_insert_check" ON public.assignments;
CREATE POLICY "assignments_teacher_insert_check" ON public.assignments
FOR INSERT WITH CHECK (public.is_course_teacher(course_id, auth.uid()));

-- Enrollments: allow students to insert/delete their own enrollment rows
DROP POLICY IF EXISTS "enrollments_student_insert_self" ON public.enrollments;
CREATE POLICY "enrollments_student_insert_self" ON public.enrollments
FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "enrollments_student_delete_self" ON public.enrollments;
CREATE POLICY "enrollments_student_delete_self" ON public.enrollments
FOR DELETE USING (student_id = auth.uid());