-- Remove duplicate sanitization triggers
DROP TRIGGER IF EXISTS sanitize_groups_trigger ON public.groups;
DROP TRIGGER IF EXISTS sanitize_profiles_trigger ON public.profiles;
DROP TRIGGER IF EXISTS sanitize_recordings_trigger ON public.recordings;
DROP TRIGGER IF EXISTS sanitize_messages_trigger ON public.group_messages;

-- Keep only the _input versions
-- The duplicates were causing conflicts in trigger execution

-- Verify the sanitize function handles all cases properly
CREATE OR REPLACE FUNCTION public.sanitize_user_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Sanitize group names (only for groups table)
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
  
  -- Sanitize profile display names (only for profiles table)
  IF TG_TABLE_NAME = 'profiles' AND NEW.display_name IS NOT NULL THEN
    NEW.display_name = trim(regexp_replace(NEW.display_name, '[<>&"'']', '', 'g'));
    IF length(NEW.display_name) > 100 THEN
      NEW.display_name = left(NEW.display_name, 100);
    END IF;
  END IF;
  
  -- Sanitize recording titles (only for recordings table)
  IF TG_TABLE_NAME = 'recordings' AND NEW.title IS NOT NULL THEN
    NEW.title = trim(regexp_replace(NEW.title, '[<>&"'']', '', 'g'));
    IF length(NEW.title) > 200 THEN
      NEW.title = left(NEW.title, 200);
    END IF;
  END IF;
  
  -- Sanitize group message content (only for group_messages table)
  IF TG_TABLE_NAME = 'group_messages' AND NEW.content IS NOT NULL THEN
    NEW.content = trim(regexp_replace(NEW.content, '<script[^>]*>.*?</script>', '', 'gi'));
    NEW.content = trim(regexp_replace(NEW.content, 'javascript:', '', 'gi'));
    IF length(NEW.content) > 10000 THEN
      NEW.content = left(NEW.content, 10000);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;