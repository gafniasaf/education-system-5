-- Insert mock profiles (teachers, students, parents)
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

-- Parents
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'john.smith@parent.com', 'parent', 'John', 'Smith'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'mary.wilson@parent.com', 'parent', 'Mary', 'Wilson'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'david.brown@parent.com', 'parent', 'David', 'Brown')
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

-- Insert parent links
INSERT INTO public.parent_links (parent_id, student_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666')
ON CONFLICT (id) DO NOTHING;

-- Insert assignments
INSERT INTO public.assignments (id, course_id, title, description, due_date, points_possible) VALUES
-- Math assignments
('assign-1', 'course-1', 'Calculus Problem Set 1', 'Solve derivative and integral problems from chapter 3', NOW() + INTERVAL '7 days', 100),
('assign-2', 'course-1', 'Graphing Functions Project', 'Create detailed graphs of complex mathematical functions', NOW() + INTERVAL '14 days', 150),

-- English assignments
('assign-3', 'course-2', 'Shakespeare Essay', 'Analyze themes in Hamlet with 5-page analytical essay', NOW() + INTERVAL '10 days', 100),
('assign-4', 'course-2', 'Poetry Analysis', 'Compare and contrast two modern poets', NOW() + INTERVAL '5 days', 75),

-- Physics assignments
('assign-5', 'course-3', 'Lab Report: Pendulum Motion', 'Conduct experiment and write detailed lab report', NOW() + INTERVAL '3 days', 80),
('assign-6', 'course-3', 'Physics Problem Set', 'Solve problems related to Newton\'s laws', NOW() + INTERVAL '12 days', 100),

-- History assignments
('assign-7', 'course-4', 'World War II Research Paper', 'Research and write about a specific WWII event', NOW() + INTERVAL '21 days', 200),
('assign-8', 'course-4', 'Timeline Project', 'Create interactive timeline of ancient civilizations', NOW() + INTERVAL '8 days', 120),

-- Computer Science assignments
('assign-9', 'course-5', 'Python Programming Project', 'Build a simple calculator application', NOW() + INTERVAL '15 days', 150),
('assign-10', 'course-5', 'Algorithm Analysis', 'Analyze time complexity of sorting algorithms', NOW() + INTERVAL '6 days', 100)
ON CONFLICT (id) DO NOTHING;

-- Insert submissions
INSERT INTO public.submissions (assignment_id, student_id, content, grade, submitted_at, graded_at, feedback, graded_by) VALUES
-- Completed submissions with grades
('assign-1', '44444444-4444-4444-4444-444444444444', 'Here is my calculus work showing step-by-step solutions...', 92, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 'Excellent work! Clear understanding of concepts.', '11111111-1111-1111-1111-111111111111'),
('assign-3', '44444444-4444-4444-4444-444444444444', 'Hamlet represents the struggle between action and inaction...', 87, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', 'Good analysis, could use more textual evidence.', '22222222-2222-2222-2222-222222222222'),
('assign-5', '66666666-6666-6666-6666-666666666666', 'Lab results show pendulum period is proportional to...', 95, NOW() - INTERVAL '1 day', NOW(), 'Outstanding experimental design and analysis!', '11111111-1111-1111-1111-111111111111'),

-- Submitted but not graded
('assign-4', '66666666-6666-6666-6666-666666666666', 'Comparing Robert Frost and Maya Angelou reveals...', NULL, NOW() - INTERVAL '1 day', NULL, NULL, NULL),
('assign-1', '55555555-5555-5555-5555-555555555555', 'My approach to solving these calculus problems...', NULL, NOW() - INTERVAL '6 hours', NULL, NULL, NULL),

-- Late submission
('assign-2', '77777777-7777-7777-7777-777777777777', 'Here are my function graphs with detailed analysis...', 78, NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', 'Good work but submitted late. -10 points.', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Insert rubrics
INSERT INTO public.rubrics (id, assignment_id, title, description, total_points) VALUES
('rubric-1', 'assign-1', 'Calculus Problem Set Rubric', 'Grading criteria for mathematical problem solving', 100),
('rubric-2', 'assign-3', 'Essay Grading Rubric', 'Comprehensive essay evaluation criteria', 100),
('rubric-3', 'assign-5', 'Lab Report Rubric', 'Scientific lab report assessment', 80)
ON CONFLICT (id) DO NOTHING;

-- Insert rubric criteria
INSERT INTO public.rubric_criteria (rubric_id, title, description, points, order_index) VALUES
-- Calculus rubric criteria
('rubric-1', 'Problem Solving Accuracy', 'Correct mathematical solutions and methodology', 40, 1),
('rubric-1', 'Work Shown', 'Clear step-by-step work and reasoning', 30, 2),
('rubric-1', 'Organization', 'Neat, organized presentation of work', 20, 3),
('rubric-1', 'Timeliness', 'Submitted on time and complete', 10, 4),

-- Essay rubric criteria
('rubric-2', 'Thesis and Arguments', 'Clear thesis with strong supporting arguments', 30, 1),
('rubric-2', 'Textual Evidence', 'Appropriate use of quotes and citations', 25, 2),
('rubric-2', 'Writing Quality', 'Grammar, style, and clarity of expression', 25, 3),
('rubric-2', 'Analysis Depth', 'Critical thinking and insight demonstrated', 20, 4),

-- Lab report criteria
('rubric-3', 'Experimental Design', 'Quality of experimental setup and methodology', 25, 1),
('rubric-3', 'Data Collection', 'Accuracy and completeness of data', 20, 2),
('rubric-3', 'Analysis and Conclusions', 'Interpretation of results and scientific conclusions', 25, 3),
('rubric-3', 'Report Writing', 'Clear, scientific writing style', 10, 4)
ON CONFLICT (id) DO NOTHING;

-- Insert announcements
INSERT INTO public.announcements (course_id, author_id, title, content, priority, expires_at) VALUES
('course-1', '11111111-1111-1111-1111-111111111111', 'Midterm Exam Schedule', 'The midterm exam will be held next Friday at 2 PM in Room 205. Please bring calculators and formula sheets.', 'high', NOW() + INTERVAL '10 days'),
('course-2', '22222222-2222-2222-2222-222222222222', 'Guest Speaker Tomorrow', 'Renowned poet Jane Morrison will be speaking about contemporary poetry tomorrow at 1 PM.', 'normal', NOW() + INTERVAL '1 day'),
('course-3', '11111111-1111-1111-1111-111111111111', 'Lab Safety Reminder', 'Please remember to wear safety goggles during all lab experiments. No exceptions.', 'normal', NOW() + INTERVAL '30 days'),
('course-4', '33333333-3333-3333-3333-333333333333', 'Field Trip Permission Slips', 'Permission slips for the museum field trip are due by Friday. See me after class if you need another copy.', 'normal', NOW() + INTERVAL '5 days'),
('course-5', '22222222-2222-2222-2222-222222222222', 'Programming Contest', 'Sign up for the regional programming contest! Great opportunity to showcase your skills.', 'low', NOW() + INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

-- Insert discussion forums
INSERT INTO public.discussion_forums (id, course_id, title, description, created_by) VALUES
('forum-1', 'course-1', 'Calculus Help and Discussion', 'Ask questions and share insights about calculus concepts', '11111111-1111-1111-1111-111111111111'),
('forum-2', 'course-2', 'Book Club Discussions', 'Discuss assigned readings and share interpretations', '22222222-2222-2222-2222-222222222222'),
('forum-3', 'course-3', 'Physics Problem Solutions', 'Collaborate on physics problems and lab discussions', '11111111-1111-1111-1111-111111111111'),
('forum-4', 'course-4', 'Historical Debates', 'Engage in respectful debates about historical events and interpretations', '33333333-3333-3333-3333-333333333333'),
('forum-5', 'course-5', 'Code Reviews and Programming Tips', 'Share code, get feedback, and learn from each other', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Insert discussion posts
INSERT INTO public.discussion_posts (forum_id, author_id, content, parent_post_id) VALUES
-- Main posts
('forum-1', '44444444-4444-4444-4444-444444444444', 'Can someone help me understand the chain rule better? I\'m struggling with composite functions.', NULL),
('forum-1', '55555555-5555-5555-5555-555555555555', 'Here\'s a great way to remember integration by parts: LIATE (Logarithmic, Inverse trig, Algebraic, Trig, Exponential)', NULL),
('forum-2', '66666666-6666-6666-6666-666666666666', 'What did everyone think about the ending of Chapter 5? I found the symbolism really powerful.', NULL),
('forum-3', '77777777-7777-7777-7777-777777777777', 'Has anyone finished the pendulum lab? I\'m getting weird results for the period calculation.', NULL),
('forum-5', '88888888-8888-8888-8888-888888888888', 'Check out this Python code I wrote for the calculator project! Any suggestions for improvement?', NULL);

-- Get the IDs of the posts we just inserted for replies
INSERT INTO public.discussion_posts (forum_id, author_id, content, parent_post_id) VALUES
-- Replies (using the first post ID - in practice you'd get the actual IDs)
('forum-1', '11111111-1111-1111-1111-111111111111', 'Great question! The chain rule is like peeling an onion - work from the outside function inward. Let me know if you want me to work through an example in class.', (SELECT id FROM discussion_posts WHERE content LIKE 'Can someone help me understand the chain rule%' LIMIT 1)),
('forum-1', '77777777-7777-7777-7777-777777777777', 'Thanks for the LIATE tip! That\'s going to help me so much on the exam.', (SELECT id FROM discussion_posts WHERE content LIKE 'Here\'s a great way to remember%' LIMIT 1)),
('forum-2', '22222222-2222-2222-2222-222222222222', 'Excellent observation about the symbolism! I love how engaged you all are with the text.', (SELECT id FROM discussion_posts WHERE content LIKE 'What did everyone think about the ending%' LIMIT 1)),
('forum-3', '66666666-6666-6666-6666-666666666666', 'I had the same issue! Make sure you\'re measuring the length from the pivot point to the center of mass, not the bottom of the pendulum.', (SELECT id FROM discussion_posts WHERE content LIKE 'Has anyone finished the pendulum lab%' LIMIT 1))
ON CONFLICT (id) DO NOTHING;

-- Insert messages
INSERT INTO public.messages (sender_id, recipient_id, subject, content, course_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Question about Emma\'s progress', 'Hi Ms. Johnson, I wanted to check in about Emma\'s progress in your math class. She seems to be struggling with some concepts at home.', 'course-1'),
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Re: Question about Emma\'s progress', 'Thank you for reaching out! Emma is actually doing quite well. Her recent test score was 92%. I\'d be happy to discuss strategies to help her at home.', 'course-1'),
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Extension request for essay', 'Hi Mr. Davis, I\'ve been sick this week and wondering if I could get a 2-day extension on the Shakespeare essay? I have a doctor\'s note.', 'course-2'),
('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Re: Extension request for essay', 'Of course, Emma. Feel better soon! Please submit by Tuesday instead of Sunday. Let me know if you need any clarification on the assignment.', 'course-2'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'Field trip permission', 'Hi Ms. Chen, James is very excited about the museum field trip. The permission slip is signed and attached. Thank you for organizing this!', 'course-4')
ON CONFLICT (id) DO NOTHING;