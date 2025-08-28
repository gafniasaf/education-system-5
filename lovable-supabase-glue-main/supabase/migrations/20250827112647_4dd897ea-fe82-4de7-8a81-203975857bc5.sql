-- First create the profile directly for a test user
INSERT INTO public.profiles (id, email, role, first_name, last_name) VALUES
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'admin2@expertcollege.com', 'student', 'Admin', 'Student')
ON CONFLICT (id) DO NOTHING;

-- Enroll this student in some courses to see data  
INSERT INTO public.enrollments (student_id, course_id) VALUES
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111'),
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222'),
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- Add some submissions for this student
INSERT INTO public.submissions (student_id, assignment_id, content, grade, submitted_at) VALUES
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'aaaa1111-1111-1111-1111-111111111111', 'My calculus homework solutions', 85, NOW() - INTERVAL '2 days'),
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'bbbb2222-2222-2222-2222-222222222222', 'Poetry analysis essay', 92, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;