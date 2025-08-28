-- Update existing profiles with better names for demo
UPDATE public.profiles SET first_name = 'Sarah', last_name = 'Johnson' WHERE id = '88af8ede-da43-4013-bd71-39b29cdce393';
UPDATE public.profiles SET first_name = 'Emma', last_name = 'Smith' WHERE id = '496944f8-060b-426f-a292-699abe5c70a0';
UPDATE public.profiles SET first_name = 'John', last_name = 'Principal' WHERE id = 'b488a512-3a75-435b-9a6b-5242532e0c0c';
UPDATE public.profiles SET first_name = 'Mike', last_name = 'Davis' WHERE id = '435bd242-f6c9-4bdf-ae0c-9875f2664e32';

-- Insert mock courses
INSERT INTO public.courses (id, title, description, teacher_id) VALUES
('course-1', 'Advanced Mathematics', 'Calculus and advanced mathematical concepts for high school students', '88af8ede-da43-4013-bd71-39b29cdce393'),
('course-2', 'English Literature', 'Classic and contemporary literature analysis and writing', '435bd242-f6c9-4bdf-ae0c-9875f2664e32'),
('course-3', 'Physics', 'Fundamentals of physics including mechanics, thermodynamics, and electromagnetism', '88af8ede-da43-4013-bd71-39b29cdce393'),
('course-4', 'World History', 'Comprehensive study of world civilizations and historical events', '435bd242-f6c9-4bdf-ae0c-9875f2664e32'),
('course-5', 'Computer Science', 'Introduction to programming and computational thinking', '88af8ede-da43-4013-bd71-39b29cdce393')
ON CONFLICT (id) DO NOTHING;

-- Insert enrollments (student enrolling in courses)
INSERT INTO public.enrollments (student_id, course_id) VALUES
('496944f8-060b-426f-a292-699abe5c70a0', 'course-1'),
('496944f8-060b-426f-a292-699abe5c70a0', 'course-2'),
('496944f8-060b-426f-a292-699abe5c70a0', 'course-3')
ON CONFLICT (id) DO NOTHING;

-- Insert assignments
INSERT INTO public.assignments (id, course_id, title, description, due_date, points_possible) VALUES
('assign-1', 'course-1', 'Calculus Problem Set 1', 'Solve derivative and integral problems from chapter 3', NOW() + INTERVAL '7 days', 100),
('assign-2', 'course-1', 'Graphing Functions Project', 'Create detailed graphs of complex mathematical functions', NOW() + INTERVAL '14 days', 150),
('assign-3', 'course-2', 'Shakespeare Essay', 'Analyze themes in Hamlet with 5-page analytical essay', NOW() + INTERVAL '10 days', 100),
('assign-4', 'course-2', 'Poetry Analysis', 'Compare and contrast two modern poets', NOW() + INTERVAL '5 days', 75),
('assign-5', 'course-3', 'Lab Report: Pendulum Motion', 'Conduct experiment and write detailed lab report', NOW() + INTERVAL '3 days', 80),
('assign-6', 'course-4', 'World War II Research Paper', 'Research and write about a specific WWII event', NOW() + INTERVAL '21 days', 200),
('assign-7', 'course-5', 'Python Programming Project', 'Build a simple calculator application', NOW() + INTERVAL '15 days', 150)
ON CONFLICT (id) DO NOTHING;