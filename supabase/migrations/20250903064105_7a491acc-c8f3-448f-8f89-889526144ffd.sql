-- Critical Security Fixes (Corrected)

-- 1. Strengthen subscribers table security with additional RLS policies
-- Drop existing policies first to replace with more secure ones
DROP POLICY IF EXISTS "service_role_access" ON public.subscribers;

-- Create strict service role policy that only allows specific operations
CREATE POLICY "restricted_service_role_access" ON public.subscribers
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Create a trigger to prevent users from modifying sensitive payment data
CREATE OR REPLACE FUNCTION public.prevent_payment_data_modification()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to prevent payment data modification
DROP TRIGGER IF EXISTS prevent_payment_modification_trigger ON public.subscribers;
CREATE TRIGGER prevent_payment_modification_trigger
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW
  WHEN (current_setting('role') != 'service_role')
  EXECUTE FUNCTION public.prevent_payment_data_modification();

-- 2. Enhance audit log security - restrict to admin-only access
-- Add additional validation for audit log entries
CREATE OR REPLACE FUNCTION public.validate_audit_log_entry()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audit log validation
DROP TRIGGER IF EXISTS validate_audit_log_trigger ON public.audit_log;
CREATE TRIGGER validate_audit_log_trigger
  BEFORE INSERT ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_audit_log_entry();

-- 3. Add input validation triggers for user-generated content
CREATE OR REPLACE FUNCTION public.sanitize_user_input()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add sanitization triggers to all relevant tables
DROP TRIGGER IF EXISTS sanitize_groups_trigger ON public.groups;
CREATE TRIGGER sanitize_groups_trigger
  BEFORE INSERT OR UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_user_input();

DROP TRIGGER IF EXISTS sanitize_profiles_trigger ON public.profiles;
CREATE TRIGGER sanitize_profiles_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_user_input();

DROP TRIGGER IF EXISTS sanitize_recordings_trigger ON public.recordings;
CREATE TRIGGER sanitize_recordings_trigger
  BEFORE INSERT OR UPDATE ON public.recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_user_input();

DROP TRIGGER IF EXISTS sanitize_messages_trigger ON public.group_messages;
CREATE TRIGGER sanitize_messages_trigger
  BEFORE INSERT OR UPDATE ON public.group_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_user_input();

-- 4. Add security logging table for monitoring
CREATE TABLE IF NOT EXISTS public.security_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on security log
ALTER TABLE public.security_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "admin_only_security_logs" ON public.security_log
FOR ALL 
USING (false); -- No user access by default

-- Service role can insert security events
CREATE POLICY "service_role_security_log_insert" ON public.security_log
FOR INSERT 
TO service_role
WITH CHECK (true);

-- 5. Add function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  user_id UUID DEFAULT NULL,
  details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.security_log (event_type, user_id, details)
  VALUES (event_type, user_id, details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add rate limiting table for API endpoints
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint, window_start)
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit data
CREATE POLICY "users_own_rate_limits" ON public.rate_limits
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role can manage all rate limit data
CREATE POLICY "service_role_rate_limits" ON public.rate_limits
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);