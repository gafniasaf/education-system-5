-- Insert discussion forums
INSERT INTO public.discussion_forums (id, course_id, title, description, created_by) VALUES
('forum-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Calculus Help and Discussion', 'Ask questions and share insights about calculus concepts', '88af8ede-da43-4013-bd71-39b29cdce393'),
('forum-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Book Club Discussions', 'Discuss assigned readings and share interpretations', '435bd242-f6c9-4bdf-ae0c-9875f2664e32'),
('forum-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Physics Problem Solutions', 'Collaborate on physics problems and lab discussions', '88af8ede-da43-4013-bd71-39b29cdce393'),
('forum-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'Historical Debates', 'Engage in respectful debates about historical events and interpretations', '435bd242-f6c9-4bdf-ae0c-9875f2664e32'),
('forum-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'Code Reviews and Programming Tips', 'Share code, get feedback, and learn from each other', '88af8ede-da43-4013-bd71-39b29cdce393')
ON CONFLICT (id) DO NOTHING;

-- Insert discussion posts
INSERT INTO public.discussion_posts (forum_id, author_id, content, parent_post_id) VALUES
-- Main posts
('forum-1111-1111-1111-111111111111', '496944f8-060b-426f-a292-699abe5c70a0', 'Can someone help me understand the chain rule better? I am struggling with composite functions and would appreciate some guidance.', NULL),
('forum-2222-2222-2222-222222222222', '496944f8-060b-426f-a292-699abe5c70a0', 'What did everyone think about the ending of Chapter 5? I found the symbolism really powerful and thought-provoking.', NULL),
('forum-3333-3333-3333-333333333333', '496944f8-060b-426f-a292-699abe5c70a0', 'Has anyone finished the pendulum lab? I am getting some unexpected results for the period calculation.', NULL),
('forum-5555-5555-5555-555555555555', '496944f8-060b-426f-a292-699abe5c70a0', 'Check out this Python code I wrote for the calculator project! Any suggestions for improvement would be appreciated.', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert messages between users
INSERT INTO public.messages (sender_id, recipient_id, subject, content, course_id) VALUES
('496944f8-060b-426f-a292-699abe5c70a0', '88af8ede-da43-4013-bd71-39b29cdce393', 'Question about Assignment 1', 'Hi Ms. Johnson, I wanted to ask about the calculus assignment. Could you clarify what you mean by showing all intermediate steps?', '11111111-1111-1111-1111-111111111111'),
('88af8ede-da43-4013-bd71-39b29cdce393', '496944f8-060b-426f-a292-699abe5c70a0', 'Re: Question about Assignment 1', 'Hi Emma! Great question. By intermediate steps I mean showing each derivative calculation step by step, not just the final answer. Feel free to ask if you need more clarification!', '11111111-1111-1111-1111-111111111111'),
('496944f8-060b-426f-a292-699abe5c70a0', '435bd242-f6c9-4bdf-ae0c-9875f2664e32', 'Extension request for essay', 'Hi Mr. Davis, I have been sick this week and wondering if I could get a 2-day extension on the Shakespeare essay? I can provide a doctor note if needed.', '22222222-2222-2222-2222-222222222222'),
('435bd242-f6c9-4bdf-ae0c-9875f2664e32', '496944f8-060b-426f-a292-699abe5c70a0', 'Re: Extension request for essay', 'Of course, Emma. Feel better soon! Please submit by Tuesday instead of Sunday. Let me know if you need any clarification on the assignment requirements.', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Insert rubrics
INSERT INTO public.rubrics (id, assignment_id, title, description, total_points) VALUES
('rubric-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111', 'Calculus Problem Set Rubric', 'Grading criteria for mathematical problem solving', 100),
('rubric-2222-2222-2222-222222222222', 'bbbbbbbb-1111-1111-1111-111111111111', 'Essay Grading Rubric', 'Comprehensive essay evaluation criteria', 100),
('rubric-3333-3333-3333-333333333333', 'cccccccc-1111-1111-1111-111111111111', 'Lab Report Rubric', 'Scientific lab report assessment', 80)
ON CONFLICT (id) DO NOTHING;

-- Insert rubric criteria
INSERT INTO public.rubric_criteria (rubric_id, title, description, points, order_index) VALUES
-- Calculus rubric criteria
('rubric-1111-1111-1111-111111111111', 'Problem Solving Accuracy', 'Correct mathematical solutions and methodology', 40, 1),
('rubric-1111-1111-1111-111111111111', 'Work Shown', 'Clear step-by-step work and reasoning', 30, 2),
('rubric-1111-1111-1111-111111111111', 'Organization', 'Neat, organized presentation of work', 20, 3),
('rubric-1111-1111-1111-111111111111', 'Timeliness', 'Submitted on time and complete', 10, 4),

-- Essay rubric criteria
('rubric-2222-2222-2222-222222222222', 'Thesis and Arguments', 'Clear thesis with strong supporting arguments', 30, 1),
('rubric-2222-2222-2222-222222222222', 'Textual Evidence', 'Appropriate use of quotes and citations', 25, 2),
('rubric-2222-2222-2222-222222222222', 'Writing Quality', 'Grammar, style, and clarity of expression', 25, 3),
('rubric-2222-2222-2222-222222222222', 'Analysis Depth', 'Critical thinking and insight demonstrated', 20, 4),

-- Lab report criteria
('rubric-3333-3333-3333-333333333333', 'Experimental Design', 'Quality of experimental setup and methodology', 25, 1),
('rubric-3333-3333-3333-333333333333', 'Data Collection', 'Accuracy and completeness of data', 20, 2),
('rubric-3333-3333-3333-333333333333', 'Analysis and Conclusions', 'Interpretation of results and scientific conclusions', 25, 3),
('rubric-3333-3333-3333-333333333333', 'Report Writing', 'Clear, scientific writing style', 10, 4)
ON CONFLICT (id) DO NOTHING;