-- Insert announcements
INSERT INTO public.announcements (course_id, author_id, title, content, priority, expires_at) VALUES
('11111111-1111-1111-1111-111111111111', '88af8ede-da43-4013-bd71-39b29cdce393', 'Midterm Exam Schedule', 'The midterm exam will be held next Friday at 2 PM in Room 205. Please bring calculators and formula sheets.', 'high', NOW() + INTERVAL '10 days'),
('22222222-2222-2222-2222-222222222222', '435bd242-f6c9-4bdf-ae0c-9875f2664e32', 'Guest Speaker Tomorrow', 'Renowned poet Jane Morrison will be speaking about contemporary poetry tomorrow at 1 PM.', 'normal', NOW() + INTERVAL '1 day'),
('33333333-3333-3333-3333-333333333333', '88af8ede-da43-4013-bd71-39b29cdce393', 'Lab Safety Reminder', 'Please remember to wear safety goggles during all lab experiments. No exceptions.', 'normal', NOW() + INTERVAL '30 days'),
('44444444-4444-4444-4444-444444444444', '435bd242-f6c9-4bdf-ae0c-9875f2664e32', 'Field Trip Permission Slips', 'Permission slips for the museum field trip are due by Friday. See me after class if you need another copy.', 'normal', NOW() + INTERVAL '5 days'),
('55555555-5555-5555-5555-555555555555', '88af8ede-da43-4013-bd71-39b29cdce393', 'Programming Contest', 'Sign up for the regional programming contest! Great opportunity to showcase your skills.', 'low', NOW() + INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

-- Insert discussion forums
INSERT INTO public.discussion_forums (id, course_id, title, description, created_by) VALUES
('11111111-1111-1111-2222-111111111111', '11111111-1111-1111-1111-111111111111', 'Calculus Help and Discussion', 'Ask questions and share insights about calculus concepts', '88af8ede-da43-4013-bd71-39b29cdce393'),
('22222222-2222-2222-3333-222222222222', '22222222-2222-2222-2222-222222222222', 'Book Club Discussions', 'Discuss assigned readings and share interpretations', '435bd242-f6c9-4bdf-ae0c-9875f2664e32'),
('33333333-3333-3333-4444-333333333333', '33333333-3333-3333-3333-333333333333', 'Physics Problem Solutions', 'Collaborate on physics problems and lab discussions', '88af8ede-da43-4013-bd71-39b29cdce393'),
('44444444-4444-4444-5555-444444444444', '44444444-4444-4444-4444-444444444444', 'Historical Debates', 'Engage in respectful debates about historical events', '435bd242-f6c9-4bdf-ae0c-9875f2664e32'),
('55555555-5555-5555-6666-555555555555', '55555555-5555-5555-5555-555555555555', 'Code Reviews and Programming Tips', 'Share code, get feedback, and learn from each other', '88af8ede-da43-4013-bd71-39b29cdce393')
ON CONFLICT (id) DO NOTHING;