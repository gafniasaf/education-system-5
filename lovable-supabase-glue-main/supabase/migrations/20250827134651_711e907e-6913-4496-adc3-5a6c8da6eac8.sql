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

-- Drop ALL existing policies on these tables
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- Drop all policies on courses
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'courses' AND schemaname = 'public') 
    LOOP 
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.courses';
    END LOOP;
    
    -- Drop all policies on enrollments  
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'enrollments' AND schemaname = 'public') 
    LOOP 
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.enrollments';
    END LOOP;
    
    -- Drop all policies on assignments
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'assignments' AND schemaname = 'public') 
    LOOP 
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.assignments';
    END LOOP;
END $$;

-- Create new, simple policies
CREATE POLICY "courses_teacher_access" ON public.courses
FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "courses_student_view" ON public.courses
FOR SELECT USING (public.is_course_student(id, auth.uid()));

CREATE POLICY "enrollments_student_access" ON public.enrollments
FOR ALL USING (student_id = auth.uid());

CREATE POLICY "enrollments_teacher_view" ON public.enrollments
FOR SELECT USING (public.is_course_teacher(course_id, auth.uid()));

CREATE POLICY "assignments_teacher_access" ON public.assignments
FOR ALL USING (public.is_course_teacher(course_id, auth.uid()));

CREATE POLICY "assignments_student_view" ON public.assignments
FOR SELECT USING (public.is_course_student(course_id, auth.uid()));