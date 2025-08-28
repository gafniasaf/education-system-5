-- Insert mock profiles (teachers, students, admin)
INSERT INTO public.profiles (id, email, role, first_name, last_name) VALUES
-- Teachers
('11111111-1111-1111-1111-111111111111', 'sarah.johnson@school.edu', 'teacher', 'Sarah', 'Johnson'),
('22222222-2222-2222-2222-222222222222', 'mike.davis@school.edu', 'teacher', 'Mike', 'Davis'),
('33333333-3333-3333-3333-333333333333', 'lisa.chen@school.edu', 'teacher', 'Lisa', 'Chen'),

-- Students
('44444444-4444-4444-4444-444444444444', 'emma.smith@student.edu', 'student', 'Emma', 'Smith'),
('55555555-5555-5555-5555-555555555555', 'james.wilson@student.edu', 'student', 'James', 'Wilson'),
('66666666-6666-6666-6666-666666666666', 'sophia.brown@student.edu', 'student', 'Sophia', 'Brown'),
('77777777-7777-7777-7777-777777777777', 'oliver.garcia@student.edu', 'student', 'Oliver', 'Garcia'),
('88888888-8888-8888-8888-888888888888', 'ava.martinez@student.edu', 'student', 'Ava', 'Martinez'),
('99999999-9999-9999-9999-999999999999', 'noah.rodriguez@student.edu', 'student', 'Noah', 'Rodriguez'),

-- Admin/Principal
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@school.edu', 'admin', 'John', 'Principal')
ON CONFLICT (id) DO NOTHING;

-- Insert mock courses
INSERT INTO public.courses (id, title, description, teacher_id) VALUES
('course-1', 'Advanced Mathematics', 'Calculus and advanced mathematical concepts for high school students', '11111111-1111-1111-1111-111111111111'),
('course-2', 'English Literature', 'Classic and contemporary literature analysis and writing', '22222222-2222-2222-2222-222222222222'),
('course-3', 'Physics', 'Fundamentals of physics including mechanics, thermodynamics, and electromagnetism', '11111111-1111-1111-1111-111111111111'),
('course-4', 'World History', 'Comprehensive study of world civilizations and historical events', '33333333-3333-3333-3333-333333333333'),
('course-5', 'Computer Science', 'Introduction to programming and computational thinking', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Insert enrollments
INSERT INTO public.enrollments (student_id, course_id) VALUES
-- Emma Smith enrollments
('44444444-4444-4444-4444-444444444444', 'course-1'),
('44444444-4444-4444-4444-444444444444', 'course-2'),
('44444444-4444-4444-4444-444444444444', 'course-3'),

-- James Wilson enrollments  
('55555555-5555-5555-5555-555555555555', 'course-1'),
('55555555-5555-5555-5555-555555555555', 'course-4'),
('55555555-5555-5555-5555-555555555555', 'course-5'),

-- Sophia Brown enrollments
('66666666-6666-6666-6666-666666666666', 'course-2'),
('66666666-6666-6666-6666-666666666666', 'course-3'),
('66666666-6666-6666-6666-666666666666', 'course-4'),

-- Oliver Garcia enrollments
('77777777-7777-7777-7777-777777777777', 'course-1'),
('77777777-7777-7777-7777-777777777777', 'course-5'),

-- Ava Martinez enrollments
('88888888-8888-8888-8888-888888888888', 'course-2'),
('88888888-8888-8888-8888-888888888888', 'course-4'),
('88888888-8888-8888-8888-888888888888', 'course-5'),

-- Noah Rodriguez enrollments
('99999999-9999-9999-9999-999999999999', 'course-1'),
('99999999-9999-9999-9999-999999999999', 'course-3'),
('99999999-9999-9999-9999-999999999999', 'course-5')
ON CONFLICT (id) DO NOTHING;