-- ENHANCED SECURITY FIX: Address remaining subscribers table vulnerabilities
-- The scanner is still flagging issues, so we need stronger policies

-- Drop and recreate the service role creation policy with more restrictions
DROP POLICY IF EXISTS "service_role_create_subscribers" ON public.subscribers;

-- Create a more restrictive service role insert policy
-- This should only be used by Stripe webhook/edge function operations
CREATE POLICY "service_role_stripe_subscriber_creation" ON public.subscribers
FOR INSERT
TO service_role
WITH CHECK (
  -- Only allow creation with valid email format and non-null user_id
  email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND user_id IS NOT NULL
  AND length(email) > 0
  AND length(email) < 255
);

-- Add additional policy to prevent any potential bypass
-- Ensure no one can access subscriber data without proper authentication
CREATE POLICY "deny_all_unauthenticated_access" ON public.subscribers
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Create a stricter delete policy for service role
-- Service role should not be able to delete subscriber records
DROP POLICY IF EXISTS "service_role_delete_subscribers" ON public.subscribers;

-- Ensure RLS is enabled (should already be enabled but let's confirm)
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner
ALTER TABLE public.subscribers FORCE ROW LEVEL SECURITY;