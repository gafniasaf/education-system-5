-- Create messages table for direct messaging
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  thread_id UUID,
  course_id UUID
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discussion forums table
CREATE TABLE public.discussion_forums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID,
  assignment_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discussion posts table
CREATE TABLE public.discussion_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  forum_id UUID NOT NULL,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_post_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
CREATE POLICY "messages_sender_recipient_access" 
ON public.messages 
FOR ALL 
USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- RLS policies for announcements
CREATE POLICY "announcements_teacher_full_access" 
ON public.announcements 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM courses c 
  WHERE c.id = announcements.course_id AND c.teacher_id = auth.uid()
));

CREATE POLICY "announcements_student_select_enrolled" 
ON public.announcements 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM enrollments e 
  WHERE e.course_id = announcements.course_id AND e.student_id = auth.uid()
));

-- RLS policies for discussion forums
CREATE POLICY "forums_teacher_full_access" 
ON public.discussion_forums 
FOR ALL 
USING (
  (course_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM courses c 
    WHERE c.id = discussion_forums.course_id AND c.teacher_id = auth.uid()
  )) OR
  (assignment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM assignments a 
    JOIN courses c ON a.course_id = c.id 
    WHERE a.id = discussion_forums.assignment_id AND c.teacher_id = auth.uid()
  ))
);

CREATE POLICY "forums_student_select_enrolled" 
ON public.discussion_forums 
FOR SELECT 
USING (
  (course_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM enrollments e 
    WHERE e.course_id = discussion_forums.course_id AND e.student_id = auth.uid()
  )) OR
  (assignment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM assignments a 
    JOIN courses c ON a.course_id = c.id 
    JOIN enrollments e ON c.id = e.course_id 
    WHERE a.id = discussion_forums.assignment_id AND e.student_id = auth.uid()
  ))
);

CREATE POLICY "forums_student_insert_enrolled" 
ON public.discussion_forums 
FOR INSERT 
WITH CHECK (
  (course_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM enrollments e 
    WHERE e.course_id = discussion_forums.course_id AND e.student_id = auth.uid()
  )) OR
  (assignment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM assignments a 
    JOIN courses c ON a.course_id = c.id 
    JOIN enrollments e ON c.id = e.course_id 
    WHERE a.id = discussion_forums.assignment_id AND e.student_id = auth.uid()
  ))
);

-- RLS policies for discussion posts
CREATE POLICY "posts_enrolled_users_access" 
ON public.discussion_posts 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM discussion_forums df 
  WHERE df.id = discussion_posts.forum_id AND (
    (df.course_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM enrollments e 
      WHERE e.course_id = df.course_id AND e.student_id = auth.uid()
    )) OR
    (df.course_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM courses c 
      WHERE c.id = df.course_id AND c.teacher_id = auth.uid()
    )) OR
    (df.assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM assignments a 
      JOIN courses c ON a.course_id = c.id 
      WHERE a.id = df.assignment_id AND (
        c.teacher_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = auth.uid())
      )
    ))
  )
));

-- Create triggers for updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discussion_forums_updated_at
  BEFORE UPDATE ON public.discussion_forums
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discussion_posts_updated_at
  BEFORE UPDATE ON public.discussion_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraints
ALTER TABLE public.messages 
ADD CONSTRAINT messages_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;

ALTER TABLE public.announcements 
ADD CONSTRAINT announcements_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.discussion_forums 
ADD CONSTRAINT discussion_forums_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.discussion_forums 
ADD CONSTRAINT discussion_forums_assignment_id_fkey 
FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;

ALTER TABLE public.discussion_posts 
ADD CONSTRAINT discussion_posts_forum_id_fkey 
FOREIGN KEY (forum_id) REFERENCES public.discussion_forums(id) ON DELETE CASCADE;

ALTER TABLE public.discussion_posts 
ADD CONSTRAINT discussion_posts_parent_post_id_fkey 
FOREIGN KEY (parent_post_id) REFERENCES public.discussion_posts(id) ON DELETE CASCADE;

-- Enable realtime for new tables
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.discussion_forums REPLICA IDENTITY FULL;
ALTER TABLE public.discussion_posts REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_forums;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_posts;