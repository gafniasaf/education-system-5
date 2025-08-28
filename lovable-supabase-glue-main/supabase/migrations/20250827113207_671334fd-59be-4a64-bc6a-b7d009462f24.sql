-- Enroll the new student into three courses
INSERT INTO public.enrollments (student_id, course_id) VALUES
('eb05c303-a299-4dcb-acd0-75aed9f5ef6f', '11111111-1111-1111-1111-111111111111'),
('eb05c303-a299-4dcb-acd0-75aed9f5ef6f', '22222222-2222-2222-2222-222222222222'),
('eb05c303-a299-4dcb-acd0-75aed9f5ef6f', '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

-- Add a couple of sample submissions for this student
INSERT INTO public.submissions (student_id, assignment_id, content, grade, submitted_at)
VALUES
('eb05c303-a299-4dcb-acd0-75aed9f5ef6f', 'aaaaaaaa-1111-1111-1111-111111111111', 'Solutions for Calculus Problem Set 1', 88, now() - interval '3 days'),
('eb05c303-a299-4dcb-acd0-75aed9f5ef6f', 'bbbbbbbb-1111-1111-1111-111111111111', 'Draft essay on Shakespeare', 90, now() - interval '1 day')
ON CONFLICT DO NOTHING;