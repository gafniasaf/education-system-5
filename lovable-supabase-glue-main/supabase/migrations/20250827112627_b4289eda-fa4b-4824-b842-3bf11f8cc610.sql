-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create student user for admin2@expertcollege.com  
SELECT public.dev_upsert_user_with_role('admin2@expertcollege.com', 'password', 'student');

-- Enroll this student in some courses to see data
INSERT INTO public.enrollments (student_id, course_id) VALUES
((SELECT id FROM public.profiles WHERE email = 'admin2@expertcollege.com'), '11111111-1111-1111-1111-111111111111'),
((SELECT id FROM public.profiles WHERE email = 'admin2@expertcollege.com'), '22222222-2222-2222-2222-222222222222'),
((SELECT id FROM public.profiles WHERE email = 'admin2@expertcollege.com'), '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;