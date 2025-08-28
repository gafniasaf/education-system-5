-- Fix infinite recursion in RLS policies by simplifying them

-- Drop existing problematic policies for courses
DROP POLICY IF EXISTS "courses_teacher_insert" ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_update_own" ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_delete_own" ON public.courses;

-- Recreate simpler policies without potential recursion
CREATE POLICY "courses_teacher_insert" 
ON public.courses 
FOR INSERT 
TO authenticated
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "courses_teacher_update_own" 
ON public.courses 
FOR UPDATE 
TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "courses_teacher_delete_own" 
ON public.courses 
FOR DELETE 
TO authenticated
USING (teacher_id = auth.uid());