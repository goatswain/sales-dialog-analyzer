-- Fix the sanitize_user_input function to handle different table fields correctly
CREATE OR REPLACE FUNCTION public.sanitize_user_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Sanitize group names
  IF TG_TABLE_NAME = 'groups' AND NEW.name IS NOT NULL THEN
    -- Remove potential XSS content and limit length
    NEW.name = trim(regexp_replace(NEW.name, '[<>&"'']', '', 'g'));
    IF length(NEW.name) > 100 THEN
      NEW.name = left(NEW.name, 100);
    END IF;
    IF length(NEW.name) = 0 THEN
      RAISE EXCEPTION 'Group name cannot be empty after sanitization';
    END IF;
  END IF;
  
  -- Sanitize profile display names
  IF TG_TABLE_NAME = 'profiles' AND NEW.display_name IS NOT NULL THEN
    NEW.display_name = trim(regexp_replace(NEW.display_name, '[<>&"'']', '', 'g'));
    IF length(NEW.display_name) > 100 THEN
      NEW.display_name = left(NEW.display_name, 100);
    END IF;
  END IF;
  
  -- Sanitize recording titles
  IF TG_TABLE_NAME = 'recordings' AND NEW.title IS NOT NULL THEN
    NEW.title = trim(regexp_replace(NEW.title, '[<>&"'']', '', 'g'));
    IF length(NEW.title) > 200 THEN
      NEW.title = left(NEW.title, 200);
    END IF;
  END IF;
  
  -- Sanitize group message content
  IF TG_TABLE_NAME = 'group_messages' AND NEW.content IS NOT NULL THEN
    NEW.content = trim(regexp_replace(NEW.content, '<script[^>]*>.*?</script>', '', 'gi'));
    NEW.content = trim(regexp_replace(NEW.content, 'javascript:', '', 'gi'));
    IF length(NEW.content) > 10000 THEN
      NEW.content = left(NEW.content, 10000);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add the sanitization trigger to the recordings table
DROP TRIGGER IF EXISTS sanitize_recordings_trigger ON public.recordings;
CREATE TRIGGER sanitize_recordings_trigger
  BEFORE INSERT OR UPDATE ON public.recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_user_input();