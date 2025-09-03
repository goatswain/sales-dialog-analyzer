-- SECURITY FIX: Restrict service role access to subscribers table
-- Replace overly permissive service role policy with specific, limited access

-- 1. Drop the overly permissive service role policy
DROP POLICY IF EXISTS "service_role_backend_access" ON public.subscribers;

-- 2. Create more restrictive service role policies for specific operations

-- Allow service role to SELECT subscriber data for subscription checks
CREATE POLICY "service_role_read_subscribers" ON public.subscribers
FOR SELECT
TO service_role
USING (true);

-- Allow service role to INSERT new subscriber records (from Stripe)
CREATE POLICY "service_role_create_subscribers" ON public.subscribers
FOR INSERT
TO service_role
WITH CHECK (
  -- Only allow if email and user_id are provided
  email IS NOT NULL AND user_id IS NOT NULL
);

-- Allow service role to UPDATE subscription status (from Stripe webhooks)
CREATE POLICY "service_role_update_subscribers" ON public.subscribers
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (
  -- Prevent updating user_id or email (only allow subscription status changes)
  user_id = (SELECT user_id FROM public.subscribers WHERE id = subscribers.id) AND
  email = (SELECT email FROM public.subscribers WHERE id = subscribers.id)
);

-- No DELETE policy for service role - only users can delete their own records

-- 3. Add additional security: Create audit trigger to log service role access
CREATE OR REPLACE FUNCTION public.audit_subscriber_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any service role modifications for security monitoring
  INSERT INTO public.audit_log (
    table_name,
    operation,
    old_data,
    new_data,
    user_id,
    timestamp
  ) VALUES (
    'subscribers',
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid(),
    NOW()
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow service role to write to audit log
CREATE POLICY "service_role_audit_log" ON public.audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create the audit trigger
DROP TRIGGER IF EXISTS audit_subscriber_changes ON public.subscribers;
CREATE TRIGGER audit_subscriber_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.audit_subscriber_access();