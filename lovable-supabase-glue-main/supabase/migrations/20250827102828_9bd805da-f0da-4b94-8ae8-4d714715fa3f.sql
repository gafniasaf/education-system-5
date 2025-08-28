-- Create storage buckets for assignment files
INSERT INTO storage.buckets (id, name, public) VALUES ('assignment-files', 'assignment-files', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('course-resources', 'course-resources', false);

-- Create RLS policies for assignment files bucket
CREATE POLICY "Students can upload their own assignment files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'assignment-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can view their own assignment files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'assignment-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers can view assignment files for their courses"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'assignment-files' 
  AND EXISTS (
    SELECT 1 FROM assignments a
    JOIN courses c ON a.course_id = c.id
    WHERE c.teacher_id = auth.uid()
    AND a.id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Students can update their own assignment files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'assignment-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can delete their own assignment files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'assignment-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create RLS policies for course resources bucket
CREATE POLICY "Teachers can upload course resources"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'course-resources'
  AND EXISTS (
    SELECT 1 FROM courses
    WHERE teacher_id = auth.uid()
    AND id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Enrolled students can view course resources"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'course-resources'
  AND (
    EXISTS (
      SELECT 1 FROM courses
      WHERE teacher_id = auth.uid()
      AND id::text = (storage.foldername(name))[1]
    )
    OR
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.student_id = auth.uid()
      AND c.id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Teachers can manage their course resources"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'course-resources'
  AND EXISTS (
    SELECT 1 FROM courses
    WHERE teacher_id = auth.uid()
    AND id::text = (storage.foldername(name))[1]
  )
);

-- Add file_attachments column to submissions table
ALTER TABLE submissions 
ADD COLUMN file_attachments JSONB DEFAULT '[]'::jsonb;

-- Add resource_files column to assignments table  
ALTER TABLE assignments
ADD COLUMN resource_files JSONB DEFAULT '[]'::jsonb;