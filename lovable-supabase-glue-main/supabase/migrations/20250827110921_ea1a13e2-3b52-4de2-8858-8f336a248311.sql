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
('forum-11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Calculus Help and Discussion', 'Ask questions and share insights about calculus concepts', '88af8ede-da43-4013-bd71-39b29cdce393'),
('forum-22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Book Club Discussions', 'Discuss assigned readings and share interpretations', '435bd242-f6c9-4bdf-ae0c-9875f2664e32'),
('forum-33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Physics Problem Solutions', 'Collaborate on physics problems and lab discussions', '88af8ede-da43-4013-bd71-39b29cdce393'),
('forum-44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'Historical Debates', 'Engage in respectful debates about historical events', '435bd242-f6c9-4bdf-ae0c-9875f2664e32'),
('forum-55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'Code Reviews and Programming Tips', 'Share code, get feedback, and learn from each other', '88af8ede-da43-4013-bd71-39b29cdce393')
ON CONFLICT (id) DO NOTHING;

-- Insert discussion posts
INSERT INTO public.discussion_posts (forum_id, author_id, content, parent_post_id) VALUES
('forum-11111111-1111-1111-1111-111111111111', '496944f8-060b-426f-a292-699abe5c70a0', 'Can someone help me understand the chain rule better? I am struggling with composite functions.', NULL),
('forum-22222222-2222-2222-2222-222222222222', '496944f8-060b-426f-a292-699abe5c70a0', 'What did everyone think about the ending of Chapter 5? I found the symbolism really powerful.', NULL),
('forum-33333333-3333-3333-3333-333333333333', '496944f8-060b-426f-a292-699abe5c70a0', 'Has anyone finished the pendulum lab? I am getting weird results for the period calculation.', NULL),
('forum-55555555-5555-5555-5555-555555555555', '496944f8-060b-426f-a292-699abe5c70a0', 'Check out this Python code I wrote for the calculator project! Any suggestions for improvement?', NULL)
ON CONFLICT (id) DO NOTHING;