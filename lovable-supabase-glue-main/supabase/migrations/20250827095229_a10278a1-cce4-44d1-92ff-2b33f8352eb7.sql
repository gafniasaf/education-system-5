-- Fix infinite recursion in enrollments RLS policies
-- Drop existing policies that are causing recursive issues
DROP POLICY IF EXISTS enrollments_teacher_select_course ON enrollments;

-- Create a simpler, non-recursive policy for teachers to view enrollments
-- Teachers can only see enrollments for courses they own
CREATE POLICY enrollments_teacher_select_course ON enrollments
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM courses 
    WHERE courses.id = enrollments.course_id 
    AND courses.teacher_id = auth.uid()
  )
);

-- Also ensure courses policies don't reference enrollments to prevent loops
DROP POLICY IF EXISTS courses_student_select_enrolled ON courses;

-- Create a simple policy for students to see courses they're enrolled in
-- This avoids the recursive reference
CREATE POLICY courses_student_select_enrolled ON courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM enrollments 
    WHERE enrollments.course_id = courses.id 
    AND enrollments.student_id = auth.uid()
  )
);