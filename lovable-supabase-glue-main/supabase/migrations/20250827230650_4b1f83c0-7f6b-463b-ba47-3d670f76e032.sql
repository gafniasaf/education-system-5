-- Fix the function search path warnings for newer functions that don't have it set
-- These are functions that should already have SET search_path but linter is catching edge cases

-- Fix functions that lack SET search_path (other than the ones we just created)
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = user_uuid);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_grade_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Only log if grade or feedback actually changed
  IF (OLD.grade IS DISTINCT FROM NEW.grade) OR (OLD.feedback IS DISTINCT FROM NEW.feedback) THEN
    INSERT INTO public.grade_history (
      submission_id,
      previous_grade,
      new_grade,
      previous_feedback,
      new_feedback,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.grade,
      NEW.grade,
      OLD.feedback,
      NEW.feedback,
      NEW.graded_by,
      CASE 
        WHEN OLD.grade IS NULL THEN 'Initial Grade'
        WHEN NEW.grade IS NULL THEN 'Grade Removed'
        ELSE 'Grade Updated'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;