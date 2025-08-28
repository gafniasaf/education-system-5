-- Update existing profiles with realistic names and details
UPDATE public.profiles SET 
  first_name = 'Sarah', 
  last_name = 'Johnson' 
WHERE email = 'teacher@example.com';

UPDATE public.profiles SET 
  first_name = 'Emma', 
  last_name = 'Smith' 
WHERE email = 'student@example.com';

UPDATE public.profiles SET 
  first_name = 'John', 
  last_name = 'Principal' 
WHERE email = 'admin@example.com';

UPDATE public.profiles SET 
  first_name = 'Mike', 
  last_name = 'Davis',
  role = 'teacher'
WHERE email = 'teacher2@example.com';

UPDATE public.profiles SET 
  first_name = 'Lisa', 
  last_name = 'Chen',
  role = 'teacher'
WHERE email = 'teacher@expertcollege.com';

UPDATE public.profiles SET 
  first_name = 'James', 
  last_name = 'Wilson' 
WHERE email = 'student@expertcollege.com';

UPDATE public.profiles SET 
  first_name = 'Sophia', 
  last_name = 'Brown' 
WHERE email = 'agafni@expertcollege.com';

-- Insert mock courses using existing teacher IDs
INSERT INTO public.courses (id, title, description, teacher_id) VALUES
('course-1', 'Advanced Mathematics', 'Calculus and advanced mathematical concepts for high school students', '88af8ede-da43-4013-bd71-39b29cdce393'),
('course-2', 'English Literature', 'Classic and contemporary literature analysis and writing', '435bd242-f6c9-4bdf-ae0c-9875f2664e32'),
('course-3', 'Physics', 'Fundamentals of physics including mechanics, thermodynamics, and electromagnetism', '88af8ede-da43-4013-bd71-39b29cdce393'),
('course-4', 'World History', 'Comprehensive study of world civilizations and historical events', '11c4a5fa-826d-4e01-a8a9-c328914ce452'),
('course-5', 'Computer Science', 'Introduction to programming and computational thinking', '435bd242-f6c9-4bdf-ae0c-9875f2664e32')
ON CONFLICT (id) DO NOTHING;

-- Insert enrollments for existing students
INSERT INTO public.enrollments (student_id, course_id) VALUES
-- Emma Smith enrollments
('496944f8-060b-426f-a292-699abe5c70a0', 'course-1'),
('496944f8-060b-426f-a292-699abe5c70a0', 'course-2'),
('496944f8-060b-426f-a292-699abe5c70a0', 'course-3'),

-- James Wilson enrollments  
('ced57852-125e-4d9d-82b4-88c08187f208', 'course-1'),
('ced57852-125e-4d9d-82b4-88c08187f208', 'course-4'),
('ced57852-125e-4d9d-82b4-88c08187f208', 'course-5'),

-- Sophia Brown enrollments
('21d4a0ff-2fd9-4902-92a9-53554dca8eeb', 'course-2'),
('21d4a0ff-2fd9-4902-92a9-53554dca8eeb', 'course-3'),
('21d4a0ff-2fd9-4902-92a9-53554dca8eeb', 'course-4')
ON CONFLICT (id) DO NOTHING;