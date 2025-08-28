-- Phase 4.1: Communication and Collaboration Database Schema
-- Create enhanced communication and collaboration system

-- Update discussion forums with better structure
ALTER TABLE public.discussion_forums ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE public.discussion_forums ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE public.discussion_forums ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.discussion_forums ADD COLUMN IF NOT EXISTS forum_type TEXT DEFAULT 'general' CHECK (forum_type IN ('general', 'announcement', 'q_and_a', 'assignment_specific'));

-- Update discussion posts with enhanced features
ALTER TABLE public.discussion_posts ADD COLUMN IF NOT EXISTS is_solution BOOLEAN DEFAULT false;
ALTER TABLE public.discussion_posts ADD COLUMN IF NOT EXISTS votes INTEGER DEFAULT 0;
ALTER TABLE public.discussion_posts ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.discussion_posts ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create post votes table
CREATE TABLE IF NOT EXISTS public.post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create message threads table for better organization
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_archived BOOLEAN DEFAULT false,
  participants UUID[] DEFAULT ARRAY[]::UUID[]
);

-- Update messages table to link to threads
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_thread_id UUID REFERENCES public.message_threads(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'announcement'));
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

-- Create real-time notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('assignment', 'grade', 'discussion', 'message', 'announcement', 'reminder')),
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT
);

-- Create real-time presence table for online status
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  current_page TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create collaboration sessions table for group work
CREATE TABLE IF NOT EXISTS public.collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'study_group' CHECK (session_type IN ('study_group', 'project_work', 'discussion', 'tutoring')),
  max_participants INTEGER DEFAULT 10,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  meeting_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create collaboration participants table
CREATE TABLE IF NOT EXISTS public.collaboration_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'participant', 'observer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(session_id, user_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_votes
CREATE POLICY "Users can manage their own votes" ON public.post_votes
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view all votes" ON public.post_votes
FOR SELECT USING (true);

-- RLS Policies for message_threads
CREATE POLICY "Users can view threads they participate in" ON public.message_threads
FOR SELECT USING (
  auth.uid() = created_by OR 
  auth.uid() = ANY(participants) OR
  (course_id IS NOT NULL AND is_course_student(course_id, auth.uid())) OR
  (course_id IS NOT NULL AND is_course_teacher(course_id, auth.uid()))
);

CREATE POLICY "Users can create message threads" ON public.message_threads
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Thread creators can update threads" ON public.message_threads
FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

-- RLS Policies for user_presence
CREATE POLICY "Users can view all presence data" ON public.user_presence
FOR SELECT USING (true);

CREATE POLICY "Users can manage their own presence" ON public.user_presence
FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for collaboration_sessions
CREATE POLICY "Users can view sessions in their courses" ON public.collaboration_sessions
FOR SELECT USING (
  is_course_student(course_id, auth.uid()) OR 
  is_course_teacher(course_id, auth.uid())
);

CREATE POLICY "Users can create sessions in their courses" ON public.collaboration_sessions
FOR INSERT WITH CHECK (
  auth.uid() = created_by AND (
    is_course_student(course_id, auth.uid()) OR 
    is_course_teacher(course_id, auth.uid())
  )
);

CREATE POLICY "Session creators can update sessions" ON public.collaboration_sessions
FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for collaboration_participants
CREATE POLICY "Users can view participants in accessible sessions" ON public.collaboration_participants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.collaboration_sessions cs
    WHERE cs.id = collaboration_participants.session_id
    AND (is_course_student(cs.course_id, auth.uid()) OR is_course_teacher(cs.course_id, auth.uid()))
  )
);

CREATE POLICY "Users can join/leave sessions" ON public.collaboration_participants
FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON public.post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_user_id ON public.post_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_course_id ON public.message_threads(course_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_created_by ON public.message_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON public.user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_course_id ON public.collaboration_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_participants_session_id ON public.collaboration_participants(session_id);

-- Add updated_at triggers
CREATE TRIGGER update_message_threads_updated_at 
BEFORE UPDATE ON public.message_threads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_presence_updated_at 
BEFORE UPDATE ON public.user_presence
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaboration_sessions_updated_at 
BEFORE UPDATE ON public.collaboration_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create functions for real-time notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id UUID,
  notification_title TEXT,
  notification_message TEXT,
  notification_type TEXT,
  notification_data JSONB DEFAULT '{}',
  notification_action_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    data,
    action_url
  ) VALUES (
    target_user_id,
    notification_title,
    notification_message,
    notification_type,
    notification_data,
    notification_action_url
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Create function to update vote counts
CREATE OR REPLACE FUNCTION public.update_post_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Recalculate vote count for the post
  UPDATE public.discussion_posts 
  SET votes = (
    SELECT COALESCE(
      SUM(CASE WHEN vote_type = 'up' THEN 1 WHEN vote_type = 'down' THEN -1 ELSE 0 END), 
      0
    )
    FROM public.post_votes 
    WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
  )
  WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for vote count updates
CREATE TRIGGER update_post_votes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.post_votes
FOR EACH ROW EXECUTE FUNCTION public.update_post_votes();