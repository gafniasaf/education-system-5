-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  course_id UUID NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Enable RLS on enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  points_possible INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Create submissions table
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL,
  student_id UUID NOT NULL,
  content TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  grade INTEGER,
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID,
  UNIQUE(assignment_id, student_id)
);

-- Enable RLS on submissions
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create audit_logs table for tracking actions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create parent_links table for parent-student relationships
CREATE TABLE public.parent_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL,
  student_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Enable RLS on parent_links
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Create RLS policies for courses
CREATE POLICY "courses_teacher_select_own" ON public.courses FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "courses_teacher_insert" ON public.courses FOR INSERT WITH CHECK (teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'teacher'));
CREATE POLICY "courses_teacher_update_own" ON public.courses FOR UPDATE USING (teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'teacher'));
CREATE POLICY "courses_teacher_delete_own" ON public.courses FOR DELETE USING (teacher_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'teacher'));
CREATE POLICY "courses_student_select_enrolled" ON public.courses FOR SELECT USING (EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = courses.id AND e.student_id = auth.uid()));

-- Create RLS policies for enrollments
CREATE POLICY "enrollments_student_select_own" ON public.enrollments FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "enrollments_student_insert_self" ON public.enrollments FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "enrollments_student_delete_self" ON public.enrollments FOR DELETE USING (student_id = auth.uid());
CREATE POLICY "enrollments_teacher_select_course" ON public.enrollments FOR SELECT USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = enrollments.course_id AND c.teacher_id = auth.uid()));

-- Create RLS policies for assignments
CREATE POLICY "assignments_teacher_full_access" ON public.assignments FOR ALL USING (EXISTS (SELECT 1 FROM courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid()));
CREATE POLICY "assignments_student_select_enrolled" ON public.assignments FOR SELECT USING (EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = assignments.course_id AND e.student_id = auth.uid()));

-- Create RLS policies for submissions
CREATE POLICY "submissions_student_own" ON public.submissions FOR ALL USING (student_id = auth.uid());
CREATE POLICY "submissions_teacher_course" ON public.submissions FOR ALL USING (EXISTS (SELECT 1 FROM assignments a JOIN courses c ON a.course_id = c.id WHERE a.id = submissions.assignment_id AND c.teacher_id = auth.uid()));

-- Create RLS policies for audit_logs
CREATE POLICY "audit_logs_insert_any_auth" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_logs_select_none" ON public.audit_logs FOR SELECT USING (false);

-- Create RLS policies for parent_links
CREATE POLICY "parent_links_parent_read" ON public.parent_links FOR SELECT USING (auth.uid() = parent_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'role', 'student'))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create development function for testing (upsert users with roles)
CREATE OR REPLACE FUNCTION public.dev_upsert_user_with_role(
  p_email TEXT,
  p_password TEXT,
  p_role TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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