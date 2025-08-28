-- Update existing profiles with better names for demo
UPDATE public.profiles SET first_name = 'Sarah', last_name = 'Johnson' WHERE id = '88af8ede-da43-4013-bd71-39b29cdce393';
UPDATE public.profiles SET first_name = 'Emma', last_name = 'Smith' WHERE id = '496944f8-060b-426f-a292-699abe5c70a0';
UPDATE public.profiles SET first_name = 'John', last_name = 'Principal' WHERE id = 'b488a512-3a75-435b-9a6b-5242532e0c0c';
UPDATE public.profiles SET first_name = 'Mike', last_name = 'Davis' WHERE id = '435bd242-f6c9-4bdf-ae0c-9875f2664e32';

-- Insert mock courses with proper UUIDs
INSERT INTO public.courses (id, title, description, teacher_id) VALUES
('11111111-1111-1111-1111-111111111111', 'Advanced Mathematics', 'Calculus and advanced mathematical concepts for high school students', '88af8ede-da43-4013-bd71-39b29cdce393'),
('22222222-2222-2222-2222-222222222222', 'English Literature', 'Classic and contemporary literature analysis and writing', '435bd242-f6c9-4bdf-ae0c-9875f2664e32'),
('33333333-3333-3333-3333-333333333333', 'Physics', 'Fundamentals of physics including mechanics, thermodynamics, and electromagnetism', '88af8ede-da43-4013-bd71-39b29cdce393'),
('44444444-4444-4444-4444-444444444444', 'World History', 'Comprehensive study of world civilizations and historical events', '435bd242-f6c9-4bdf-ae0c-9875f2664e32'),
('55555555-5555-5555-5555-555555555555', 'Computer Science', 'Introduction to programming and computational thinking', '88af8ede-da43-4013-bd71-39b29cdce393')
ON CONFLICT (id) DO NOTHING;

-- Insert enrollments (student enrolling in courses)
INSERT INTO public.enrollments (student_id, course_id) VALUES
('496944f8-060b-426f-a292-699abe5c70a0', '11111111-1111-1111-1111-111111111111'),
('496944f8-060b-426f-a292-699abe5c70a0', '22222222-2222-2222-2222-222222222222'),
('496944f8-060b-426f-a292-699abe5c70a0', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;