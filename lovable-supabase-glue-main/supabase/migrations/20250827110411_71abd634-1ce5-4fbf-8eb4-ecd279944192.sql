-- Use the existing dev function to create users with profiles
SELECT public.dev_upsert_user_with_role('sarah.johnson@school.edu', 'password123', 'teacher');
SELECT public.dev_upsert_user_with_role('mike.davis@school.edu', 'password123', 'teacher');
SELECT public.dev_upsert_user_with_role('lisa.chen@school.edu', 'password123', 'teacher');
SELECT public.dev_upsert_user_with_role('emma.smith@student.edu', 'password123', 'student');
SELECT public.dev_upsert_user_with_role('james.wilson@student.edu', 'password123', 'student');
SELECT public.dev_upsert_user_with_role('sophia.brown@student.edu', 'password123', 'student');
SELECT public.dev_upsert_user_with_role('oliver.garcia@student.edu', 'password123', 'student');
SELECT public.dev_upsert_user_with_role('ava.martinez@student.edu', 'password123', 'student');
SELECT public.dev_upsert_user_with_role('noah.rodriguez@student.edu', 'password123', 'student');
SELECT public.dev_upsert_user_with_role('admin@school.edu', 'password123', 'admin');

-- Update profiles with first and last names
UPDATE public.profiles SET first_name = 'Sarah', last_name = 'Johnson' WHERE email = 'sarah.johnson@school.edu';
UPDATE public.profiles SET first_name = 'Mike', last_name = 'Davis' WHERE email = 'mike.davis@school.edu';
UPDATE public.profiles SET first_name = 'Lisa', last_name = 'Chen' WHERE email = 'lisa.chen@school.edu';
UPDATE public.profiles SET first_name = 'Emma', last_name = 'Smith' WHERE email = 'emma.smith@student.edu';
UPDATE public.profiles SET first_name = 'James', last_name = 'Wilson' WHERE email = 'james.wilson@student.edu';
UPDATE public.profiles SET first_name = 'Sophia', last_name = 'Brown' WHERE email = 'sophia.brown@student.edu';
UPDATE public.profiles SET first_name = 'Oliver', last_name = 'Garcia' WHERE email = 'oliver.garcia@student.edu';
UPDATE public.profiles SET first_name = 'Ava', last_name = 'Martinez' WHERE email = 'ava.martinez@student.edu';
UPDATE public.profiles SET first_name = 'Noah', last_name = 'Rodriguez' WHERE email = 'noah.rodriguez@student.edu';
UPDATE public.profiles SET first_name = 'John', last_name = 'Principal' WHERE email = 'admin@school.edu';