-- Insert assignments with proper UUIDs
INSERT INTO public.assignments (id, course_id, title, description, due_date, points_possible) VALUES
('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Calculus Problem Set 1', 'Solve derivative and integral problems from chapter 3', NOW() + INTERVAL '7 days', 100),
('aaaaaaaa-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Graphing Functions Project', 'Create detailed graphs of complex mathematical functions', NOW() + INTERVAL '14 days', 150),
('bbbbbbbb-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Shakespeare Essay', 'Analyze themes in Hamlet with 5-page analytical essay', NOW() + INTERVAL '10 days', 100),
('bbbbbbbb-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Poetry Analysis', 'Compare and contrast two modern poets', NOW() + INTERVAL '5 days', 75),
('cccccccc-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Lab Report: Pendulum Motion', 'Conduct experiment and write detailed lab report', NOW() + INTERVAL '3 days', 80),
('dddddddd-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'World War II Research Paper', 'Research and write about a specific WWII event', NOW() + INTERVAL '21 days', 200),
('eeeeeeee-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Python Programming Project', 'Build a simple calculator application', NOW() + INTERVAL '15 days', 150)
ON CONFLICT (id) DO NOTHING;

-- Insert submissions
INSERT INTO public.submissions (assignment_id, student_id, content, grade, submitted_at, graded_at, feedback, graded_by) VALUES
-- Completed submissions with grades
('aaaaaaaa-1111-1111-1111-111111111111', '496944f8-060b-426f-a292-699abe5c70a0', 'Here is my calculus work showing step-by-step solutions for all derivative problems...', 92, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 'Excellent work! Clear understanding of concepts. Well done on showing all steps.', '88af8ede-da43-4013-bd71-39b29cdce393'),
('bbbbbbbb-1111-1111-1111-111111111111', '496944f8-060b-426f-a292-699abe5c70a0', 'Hamlet represents the eternal struggle between action and inaction, thought and deed...', 87, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', 'Good analysis of themes, could use more textual evidence to support arguments.', '435bd242-f6c9-4bdf-ae0c-9875f2664e32'),
('cccccccc-1111-1111-1111-111111111111', '496944f8-060b-426f-a292-699abe5c70a0', 'Lab results show pendulum period is proportional to square root of length...', 95, NOW() - INTERVAL '1 day', NOW(), 'Outstanding experimental design and analysis! Great use of data visualization.', '88af8ede-da43-4013-bd71-39b29cdce393'),

-- Submitted but not graded
('bbbbbbbb-2222-2222-2222-222222222222', '496944f8-060b-426f-a292-699abe5c70a0', 'Comparing Robert Frost and Maya Angelou reveals contrasting approaches to nature and identity...', NULL, NOW() - INTERVAL '1 day', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert announcements
INSERT INTO public.announcements (course_id, author_id, title, content, priority, expires_at) VALUES
('11111111-1111-1111-1111-111111111111', '88af8ede-da43-4013-bd71-39b29cdce393', 'Midterm Exam Schedule', 'The midterm exam will be held next Friday at 2 PM in Room 205. Please bring calculators and formula sheets.', 'high', NOW() + INTERVAL '10 days'),
('22222222-2222-2222-2222-222222222222', '435bd242-f6c9-4bdf-ae0c-9875f2664e32', 'Guest Speaker Tomorrow', 'Renowned poet Jane Morrison will be speaking about contemporary poetry tomorrow at 1 PM.', 'normal', NOW() + INTERVAL '1 day'),
('33333333-3333-3333-3333-333333333333', '88af8ede-da43-4013-bd71-39b29cdce393', 'Lab Safety Reminder', 'Please remember to wear safety goggles during all lab experiments. No exceptions.', 'normal', NOW() + INTERVAL '30 days'),
('44444444-4444-4444-4444-444444444444', '435bd242-f6c9-4bdf-ae0c-9875f2664e32', 'Field Trip Permission Slips', 'Permission slips for the museum field trip are due by Friday. See me after class if you need another copy.', 'normal', NOW() + INTERVAL '5 days'),
('55555555-5555-5555-5555-555555555555', '88af8ede-da43-4013-bd71-39b29cdce393', 'Programming Contest', 'Sign up for the regional programming contest! Great opportunity to showcase your skills.', 'low', NOW() + INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;