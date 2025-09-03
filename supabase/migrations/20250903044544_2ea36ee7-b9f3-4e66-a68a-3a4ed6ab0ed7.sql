-- CRITICAL SECURITY FIX: Strengthen subscribers table RLS policies
-- Address remaining vulnerabilities in SELECT access for authenticated users

-- First, let's examine and improve the authenticated users SELECT policy
DROP POLICY IF EXISTS "authenticated_users_view_own_subscription" ON public.subscribers;

-- Create a more robust SELECT policy with additional security checks
CREATE POLICY "authenticated_users_view_own_subscription_secure" ON public.subscribers
FOR SELECT
TO authenticated
USING (
  -- Ensure user is authenticated
  auth.uid() IS NOT NULL
  -- User can only see their own subscription data
  AND auth.uid() = user_id
  -- Additional security: verify the user's email matches
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = subscribers.email
    AND auth.users.email_confirmed_at IS NOT NULL
  )
);

-- Also add a RESTRICTIVE policy to ensure no cross-user data access
CREATE POLICY "prevent_cross_user_subscriber_access" ON public.subscribers
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  -- This restrictive policy ensures users can NEVER see other users' data
  user_id = auth.uid()
);

-- Add DELETE policy with proper restrictions (was missing)
CREATE POLICY "authenticated_users_delete_own_subscription" ON public.subscribers
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  -- Verify user owns this subscription
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = subscribers.email
  )
);

-- Enhance the service role SELECT policy to be even more restrictive
DROP POLICY IF EXISTS "service_role_limited_select" ON public.subscribers;

CREATE POLICY "service_role_minimal_select" ON public.subscribers
FOR SELECT
TO service_role
USING (
  -- Only allow service role to read for active Stripe operations
  stripe_customer_id IS NOT NULL
  AND email IS NOT NULL 
  AND user_id IS NOT NULL
  -- Only if user is verified and subscription is active
  AND subscribed = true
  AND subscription_end > now()
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = subscribers.user_id 
    AND auth.users.email = subscribers.email
    AND auth.users.email_confirmed_at IS NOT NULL
  )
);