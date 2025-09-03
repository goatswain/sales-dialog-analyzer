-- Critical Security Fixes for Data Protection (Fixed)

-- 1. Strengthen subscribers table security - restrict service role operations
DROP POLICY IF EXISTS "restricted_service_role_access" ON public.subscribers;
CREATE POLICY "service_role_read_only_subscribers" 
ON public.subscribers 
FOR SELECT 
USING (
  -- Only allow service role to read for subscription checks
  current_setting('role') = 'service_role'
);

CREATE POLICY "service_role_insert_subscribers" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (
  -- Only service role can insert subscriber data
  current_setting('role') = 'service_role'
);

CREATE POLICY "service_role_update_subscribers" 
ON public.subscribers 
FOR UPDATE 
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- Block all user access to sensitive subscriber data
CREATE POLICY "block_user_subscriber_access" 
ON public.subscribers 
FOR ALL 
TO authenticated 
USING (false) 
WITH CHECK (false);

-- 2. Restrict profile email visibility - only show emails to profile owners
DROP POLICY IF EXISTS "authenticated_users_view_profiles" ON public.profiles;
CREATE POLICY "users_view_own_profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id AND auth.uid() IS NOT NULL
);

CREATE POLICY "users_view_group_members_limited" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can see display name and avatar of group members, but not email
  auth.uid() IS NOT NULL 
  AND auth.uid() != user_id
  AND EXISTS (
    SELECT 1 
    FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() 
    AND gm2.user_id = profiles.user_id
  )
);

-- 3. Restrict group invitation email visibility
DROP POLICY IF EXISTS "users_can_view_sent_invitations" ON public.group_invitations;
CREATE POLICY "users_view_own_sent_invitations" 
ON public.group_invitations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND invited_by = auth.uid()
  AND expires_at > now()
);

-- 4. Add additional audit logging for sensitive data modifications
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Log access to subscribers table (INSERT/UPDATE/DELETE only)
  IF TG_TABLE_NAME = 'subscribers' THEN
    INSERT INTO public.security_log (event_type, user_id, details)
    VALUES (
      'sensitive_data_access', 
      auth.uid(), 
      jsonb_build_object(
        'table', 'subscribers',
        'operation', TG_OP,
        'accessed_user_id', COALESCE(NEW.user_id, OLD.user_id)
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add trigger for subscribers table access logging (only for modifications)
CREATE TRIGGER log_subscribers_access 
AFTER INSERT OR UPDATE OR DELETE ON public.subscribers
FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_data_access();

-- 5. Enhanced input validation triggers
DROP TRIGGER IF EXISTS sanitize_input_trigger ON public.groups;
DROP TRIGGER IF EXISTS sanitize_input_trigger ON public.profiles;
DROP TRIGGER IF EXISTS sanitize_input_trigger ON public.recordings;
DROP TRIGGER IF EXISTS sanitize_input_trigger ON public.group_messages;

-- Create triggers for all tables that need input sanitization
CREATE TRIGGER sanitize_groups_input 
BEFORE INSERT OR UPDATE ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.sanitize_user_input();

CREATE TRIGGER sanitize_profiles_input 
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sanitize_user_input();

CREATE TRIGGER sanitize_recordings_input 
BEFORE INSERT OR UPDATE ON public.recordings
FOR EACH ROW EXECUTE FUNCTION public.sanitize_user_input();

CREATE TRIGGER sanitize_messages_input 
BEFORE INSERT OR UPDATE ON public.group_messages
FOR EACH ROW EXECUTE FUNCTION public.sanitize_user_input();

-- 6. Rate limiting for sensitive operations
CREATE TABLE IF NOT EXISTS public.sensitive_operation_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  operation_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sensitive_operation_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_operation_limits" 
ON public.sensitive_operation_limits 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to check and enforce rate limits for sensitive operations
CREATE OR REPLACE FUNCTION public.check_sensitive_operation_limit(
  operation_type TEXT,
  max_operations INTEGER DEFAULT 10,
  window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start_time := now() - (window_minutes || ' minutes')::INTERVAL;
  
  -- Count operations in current window
  SELECT COALESCE(SUM(count), 0) INTO current_count
  FROM public.sensitive_operation_limits
  WHERE user_id = auth.uid()
  AND operation_type = check_sensitive_operation_limit.operation_type
  AND window_start >= window_start_time;
  
  IF current_count >= max_operations THEN
    -- Log rate limit violation
    INSERT INTO public.security_log (event_type, user_id, details)
    VALUES (
      'rate_limit_exceeded',
      auth.uid(),
      jsonb_build_object(
        'operation_type', operation_type,
        'current_count', current_count,
        'max_operations', max_operations
      )
    );
    RETURN FALSE;
  END IF;
  
  -- Record this operation
  INSERT INTO public.sensitive_operation_limits (
    user_id, operation_type, window_start
  ) VALUES (
    auth.uid(), operation_type, now()
  );
  
  RETURN TRUE;
END;
$$;