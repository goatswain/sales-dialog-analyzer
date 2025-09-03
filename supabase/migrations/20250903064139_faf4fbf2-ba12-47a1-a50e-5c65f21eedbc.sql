-- Fix function search path security warnings
-- Update all functions to have secure search_path settings

-- Fix prevent_payment_data_modification function
CREATE OR REPLACE FUNCTION public.prevent_payment_data_modification()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Check if user is trying to modify sensitive payment fields
  IF OLD.stripe_customer_id IS DISTINCT FROM NEW.stripe_customer_id THEN
    RAISE EXCEPTION 'Users cannot modify Stripe customer ID';
  END IF;
  
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    RAISE EXCEPTION 'Users cannot modify email through subscribers table';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix validate_audit_log_entry function
CREATE OR REPLACE FUNCTION public.validate_audit_log_entry()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Only allow service role to insert audit entries
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized audit log access';
  END IF;
  
  -- Validate required fields
  IF NEW.table_name IS NULL OR NEW.operation IS NULL THEN
    RAISE EXCEPTION 'Missing required audit log fields';
  END IF;
  
  -- Sanitize and validate table name
  IF NEW.table_name !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
    RAISE EXCEPTION 'Invalid table name in audit log';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix sanitize_user_input function
CREATE OR REPLACE FUNCTION public.sanitize_user_input()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;

-- Fix log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  user_id UUID DEFAULT NULL,
  details JSONB DEFAULT NULL
)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_log (event_type, user_id, details)
  VALUES (event_type, user_id, details);
END;
$$;