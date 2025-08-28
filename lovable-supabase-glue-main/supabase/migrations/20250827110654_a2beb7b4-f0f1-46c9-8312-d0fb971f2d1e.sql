-- Insert assignments with proper descriptions (no apostrophes to cause issues)
INSERT INTO public.assignments (course_id, title, description, due_date, points_possible) VALUES
-- Math assignments (Sarah Johnson's courses)
((SELECT id FROM courses WHERE title = 'Advanced Mathematics' LIMIT 1), 'Calculus Problem Set 1', 'Solve derivative and integral problems from chapter 3', NOW() + INTERVAL '7 days', 100),
((SELECT id FROM courses WHERE title = 'Advanced Mathematics' LIMIT 1), 'Graphing Functions Project', 'Create detailed graphs of complex mathematical functions', NOW() + INTERVAL '14 days', 150),

-- English assignments (Mike Davis courses)
((SELECT id FROM courses WHERE title = 'English Literature' LIMIT 1), 'Shakespeare Essay', 'Analyze themes in Hamlet with 5-page analytical essay', NOW() + INTERVAL '10 days', 100),
((SELECT id FROM courses WHERE title = 'English Literature' LIMIT 1), 'Poetry Analysis', 'Compare and contrast two modern poets', NOW() + INTERVAL '5 days', 75),

-- Physics assignments (Sarah Johnson's courses)
((SELECT id FROM courses WHERE title = 'Physics' LIMIT 1), 'Lab Report: Pendulum Motion', 'Conduct experiment and write detailed lab report', NOW() + INTERVAL '3 days', 80),
((SELECT id FROM courses WHERE title = 'Physics' LIMIT 1), 'Physics Problem Set', 'Solve problems related to Newton laws', NOW() + INTERVAL '12 days', 100),

-- History assignments (Lisa Chen courses)
((SELECT id FROM courses WHERE title = 'World History' LIMIT 1), 'World War II Research Paper', 'Research and write about a specific WWII event', NOW() + INTERVAL '21 days', 200),
((SELECT id FROM courses WHERE title = 'World History' LIMIT 1), 'Timeline Project', 'Create interactive timeline of ancient civilizations', NOW() + INTERVAL '8 days', 120),

-- Computer Science assignments (Mike Davis courses)
((SELECT id FROM courses WHERE title = 'Computer Science' LIMIT 1), 'Python Programming Project', 'Build a simple calculator application', NOW() + INTERVAL '15 days', 150),
((SELECT id FROM courses WHERE title = 'Computer Science' LIMIT 1), 'Algorithm Analysis', 'Analyze time complexity of sorting algorithms', NOW() + INTERVAL '6 days', 100)
ON CONFLICT (id) DO NOTHING;