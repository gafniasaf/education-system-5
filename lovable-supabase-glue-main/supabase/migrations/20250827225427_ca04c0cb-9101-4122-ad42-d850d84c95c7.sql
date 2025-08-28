-- Phase 3: Course Content Enhancement - Database Schema

-- Create content modules table for organizing course materials
CREATE TABLE IF NOT EXISTS public.content_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  module_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  publish_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_duration INTEGER, -- in minutes
  learning_objectives TEXT[],
  prerequisites TEXT[],
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_content_modules_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE
);

-- Create content items table for individual learning materials
CREATE TABLE IF NOT EXISTS public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'document', 'link', 'text', 'quiz', 'interactive')),
  content_data JSONB NOT NULL DEFAULT '{}',
  item_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE,
  estimated_duration INTEGER, -- in minutes
  content_url TEXT,
  file_attachments JSONB DEFAULT '[]',
  embed_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_content_items_module FOREIGN KEY (module_id) REFERENCES public.content_modules(id) ON DELETE CASCADE
);

-- Create student progress tracking table
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  content_item_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  time_spent INTEGER DEFAULT 0, -- in seconds
  first_accessed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  bookmarked BOOLEAN DEFAULT FALSE,
  UNIQUE(student_id, content_item_id),
  CONSTRAINT fk_student_progress_student FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_progress_content_item FOREIGN KEY (content_item_id) REFERENCES public.content_items(id) ON DELETE CASCADE
);

-- Create content interactions table for engagement tracking
CREATE TABLE IF NOT EXISTS public.content_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  content_item_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'download', 'bookmark', 'like', 'comment', 'share', 'quiz_attempt')),
  interaction_data JSONB DEFAULT '{}',
  interaction_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_content_interactions_student FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_interactions_content_item FOREIGN KEY (content_item_id) REFERENCES public.content_items(id) ON DELETE CASCADE
);

-- Enable RLS on all tables
ALTER TABLE public.content_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_modules
CREATE POLICY "content_modules_student_view_published" 
ON public.content_modules 
FOR SELECT 
TO authenticated
USING (
  is_published = TRUE AND
  (publish_date IS NULL OR publish_date <= now()) AND
  EXISTS (
    SELECT 1 FROM public.enrollments e 
    WHERE e.course_id = content_modules.course_id 
    AND e.student_id = auth.uid()
  )
);

CREATE POLICY "content_modules_teacher_full_access" 
ON public.content_modules 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c 
    WHERE c.id = content_modules.course_id 
    AND c.teacher_id = auth.uid()
  )
);

-- RLS Policies for content_items
CREATE POLICY "content_items_student_view_published" 
ON public.content_items 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.content_modules cm
    JOIN public.enrollments e ON cm.course_id = e.course_id
    WHERE cm.id = content_items.module_id 
    AND cm.is_published = TRUE
    AND (cm.publish_date IS NULL OR cm.publish_date <= now())
    AND e.student_id = auth.uid()
  )
);

CREATE POLICY "content_items_teacher_full_access" 
ON public.content_items 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.content_modules cm
    JOIN public.courses c ON cm.course_id = c.id
    WHERE cm.id = content_items.module_id 
    AND c.teacher_id = auth.uid()
  )
);

-- RLS Policies for student_progress
CREATE POLICY "student_progress_own_access" 
ON public.student_progress 
FOR ALL 
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "student_progress_teacher_view" 
ON public.student_progress 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.content_items ci
    JOIN public.content_modules cm ON ci.module_id = cm.id
    JOIN public.courses c ON cm.course_id = c.id
    WHERE ci.id = student_progress.content_item_id 
    AND c.teacher_id = auth.uid()
  )
);

-- RLS Policies for content_interactions
CREATE POLICY "content_interactions_own_access" 
ON public.content_interactions 
FOR ALL 
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "content_interactions_teacher_view" 
ON public.content_interactions 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.content_items ci
    JOIN public.content_modules cm ON ci.module_id = cm.id
    JOIN public.courses c ON cm.course_id = c.id
    WHERE ci.id = content_interactions.content_item_id 
    AND c.teacher_id = auth.uid()
  )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_modules_course_id ON public.content_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_content_modules_order ON public.content_modules(course_id, module_order);
CREATE INDEX IF NOT EXISTS idx_content_modules_published ON public.content_modules(is_published, publish_date);

CREATE INDEX IF NOT EXISTS idx_content_items_module_id ON public.content_items(module_id);
CREATE INDEX IF NOT EXISTS idx_content_items_order ON public.content_items(module_id, item_order);
CREATE INDEX IF NOT EXISTS idx_content_items_type ON public.content_items(content_type);

CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON public.student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_content_item ON public.student_progress(content_item_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_status ON public.student_progress(status);

CREATE INDEX IF NOT EXISTS idx_content_interactions_student_id ON public.content_interactions(student_id);
CREATE INDEX IF NOT EXISTS idx_content_interactions_content_item ON public.content_interactions(content_item_id);
CREATE INDEX IF NOT EXISTS idx_content_interactions_type ON public.content_interactions(interaction_type);

-- Create triggers for updated_at columns
CREATE TRIGGER update_content_modules_updated_at
  BEFORE UPDATE ON public.content_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate module completion percentage
CREATE OR REPLACE FUNCTION public.calculate_module_completion(module_uuid UUID, student_uuid UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_items INTEGER;
  completed_items INTEGER;
  completion_percentage DECIMAL(5,2);
BEGIN
  -- Get total content items in module
  SELECT COUNT(*) INTO total_items
  FROM public.content_items ci
  WHERE ci.module_id = module_uuid;
  
  IF total_items = 0 THEN
    RETURN 0;
  END IF;
  
  -- Get completed items for student
  SELECT COUNT(*) INTO completed_items
  FROM public.content_items ci
  LEFT JOIN public.student_progress sp ON ci.id = sp.content_item_id AND sp.student_id = student_uuid
  WHERE ci.module_id = module_uuid 
  AND sp.status = 'completed';
  
  completion_percentage := (completed_items::DECIMAL / total_items::DECIMAL) * 100;
  
  RETURN completion_percentage;
END;
$$;

-- Create function to get student learning analytics
CREATE OR REPLACE FUNCTION public.get_student_learning_analytics(student_uuid UUID, course_uuid UUID DEFAULT NULL)
RETURNS TABLE(
  total_modules INTEGER,
  completed_modules INTEGER,
  total_content_items INTEGER,
  completed_content_items INTEGER,
  total_time_spent INTEGER,
  average_completion_rate DECIMAL(5,2),
  most_active_content_type TEXT,
  learning_streak INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH module_stats AS (
    SELECT 
      cm.id as module_id,
      COUNT(ci.id) as total_items,
      COUNT(CASE WHEN sp.status = 'completed' THEN 1 END) as completed_items
    FROM public.content_modules cm
    JOIN public.content_items ci ON cm.id = ci.module_id
    LEFT JOIN public.student_progress sp ON ci.id = sp.content_item_id AND sp.student_id = student_uuid
    WHERE (course_uuid IS NULL OR cm.course_id = course_uuid)
    AND cm.is_published = TRUE
    GROUP BY cm.id
  ),
  content_type_stats AS (
    SELECT 
      ci.content_type,
      COUNT(sp.id) as interaction_count
    FROM public.content_items ci
    JOIN public.content_modules cm ON ci.module_id = cm.id
    LEFT JOIN public.student_progress sp ON ci.id = sp.content_item_id AND sp.student_id = student_uuid
    WHERE (course_uuid IS NULL OR cm.course_id = course_uuid)
    AND cm.is_published = TRUE
    GROUP BY ci.content_type
    ORDER BY interaction_count DESC
    LIMIT 1
  )
  SELECT 
    (SELECT COUNT(*) FROM module_stats)::INTEGER as total_modules,
    (SELECT COUNT(*) FROM module_stats WHERE completed_items = total_items)::INTEGER as completed_modules,
    (SELECT SUM(total_items) FROM module_stats)::INTEGER as total_content_items,
    (SELECT SUM(completed_items) FROM module_stats)::INTEGER as completed_content_items,
    (SELECT COALESCE(SUM(sp.time_spent), 0) FROM public.student_progress sp 
     JOIN public.content_items ci ON sp.content_item_id = ci.id
     JOIN public.content_modules cm ON ci.module_id = cm.id
     WHERE sp.student_id = student_uuid 
     AND (course_uuid IS NULL OR cm.course_id = course_uuid))::INTEGER as total_time_spent,
    (SELECT 
      CASE 
        WHEN SUM(total_items) = 0 THEN 0 
        ELSE (SUM(completed_items)::DECIMAL / SUM(total_items)::DECIMAL) * 100 
      END 
     FROM module_stats)::DECIMAL(5,2) as average_completion_rate,
    (SELECT content_type FROM content_type_stats)::TEXT as most_active_content_type,
    (SELECT 
      COUNT(DISTINCT DATE(completed_at))
     FROM public.student_progress sp
     JOIN public.content_items ci ON sp.content_item_id = ci.id
     JOIN public.content_modules cm ON ci.module_id = cm.id
     WHERE sp.student_id = student_uuid
     AND sp.status = 'completed'
     AND (course_uuid IS NULL OR cm.course_id = course_uuid)
     AND completed_at >= CURRENT_DATE - INTERVAL '30 days')::INTEGER as learning_streak;
END;
$$;