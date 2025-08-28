-- Fix function search path security issues
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'role', 'student'))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.dev_upsert_user_with_role(
  p_email TEXT,
  p_password TEXT,
  p_role TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_pw TEXT := crypt(p_password, gen_salt('bf'));
BEGIN
  -- Find existing user by email (GoTrue stores it in auth.users.email)
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated','authenticated',
      p_email, v_pw,
      now(), now(),
      jsonb_build_object('provider','email','providers', ARRAY['email']),
      '{}'::jsonb,
      now(), now()
    );

    -- Ensure identity row exists for email provider
    INSERT INTO auth.identities (
      id, user_id, provider, provider_id, identity_data,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      'email', v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', p_email),
      now(), now(), now()
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;
  ELSE
    -- Update password if user already exists
    UPDATE auth.users
      SET encrypted_password = v_pw, updated_at = now()
      WHERE id = v_user_id;
  END IF;

  -- Profiles upsert without hitting the ON CONFLICT double-update hazard
  INSERT INTO public.profiles (id, email, role)
  VALUES (v_user_id, p_email, p_role)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.profiles
    SET email = p_email, role = p_role
    WHERE id = v_user_id;

  RETURN v_user_id;
END;
$$;

-- Update RLS policies to require authentication instead of allowing anonymous access
-- Drop existing policies and recreate with authenticated role requirement

-- Assignments policies
DROP POLICY IF EXISTS "assignments_teacher_full_access" ON public.assignments;
DROP POLICY IF EXISTS "assignments_student_select_enrolled" ON public.assignments;

CREATE POLICY "assignments_teacher_full_access" ON public.assignments 
FOR ALL 
TO authenticated
USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid()));

CREATE POLICY "assignments_student_select_enrolled" ON public.assignments 
FOR SELECT 
TO authenticated
USING (EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = assignments.course_id AND e.student_id = auth.uid()));

-- Submissions policies  
DROP POLICY IF EXISTS "submissions_student_own" ON public.submissions;
DROP POLICY IF EXISTS "submissions_teacher_course" ON public.submissions;

CREATE POLICY "submissions_student_own" ON public.submissions 
FOR ALL 
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "submissions_teacher_course" ON public.submissions 
FOR ALL 
TO authenticated  
USING (EXISTS (SELECT 1 FROM assignments a JOIN courses c ON a.course_id = c.id WHERE a.id = submissions.assignment_id AND c.teacher_id = auth.uid()));

-- Update other policies to require authentication
DROP POLICY IF EXISTS "courses_teacher_select_own" ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_update_own" ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_delete_own" ON public.courses;
DROP POLICY IF EXISTS "courses_student_select_enrolled" ON public.courses;

CREATE POLICY "courses_teacher_select_own" ON public.courses 
FOR SELECT 
TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "courses_teacher_update_own" ON public.courses 
FOR UPDATE 
TO authenticated
USING (teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'teacher'));

CREATE POLICY "courses_teacher_delete_own" ON public.courses 
FOR DELETE 
TO authenticated
USING (teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'teacher'));

CREATE POLICY "courses_student_select_enrolled" ON public.courses 
FOR SELECT 
TO authenticated
USING (EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = courses.id AND e.student_id = auth.uid()));

-- Update enrollment policies
DROP POLICY IF EXISTS "enrollments_student_select_own" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_student_delete_self" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_teacher_select_course" ON public.enrollments;

CREATE POLICY "enrollments_student_select_own" ON public.enrollments 
FOR SELECT 
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "enrollments_student_delete_self" ON public.enrollments 
FOR DELETE 
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "enrollments_teacher_select_course" ON public.enrollments 
FOR SELECT 
TO authenticated
USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = enrollments.course_id AND c.teacher_id = auth.uid()));

-- Update profile policies
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

CREATE POLICY "profiles_select_self" ON public.profiles 
FOR SELECT 
TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_update_self" ON public.profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

-- Update parent links policy
DROP POLICY IF EXISTS "parent_links_parent_read" ON public.parent_links;

CREATE POLICY "parent_links_parent_read" ON public.parent_links 
FOR SELECT 
TO authenticated
USING (auth.uid() = parent_id);

-- Update audit logs policy  
DROP POLICY IF EXISTS "audit_logs_select_none" ON public.audit_logs;

CREATE POLICY "audit_logs_select_none" ON public.audit_logs 
FOR SELECT 
TO authenticated
USING (false);