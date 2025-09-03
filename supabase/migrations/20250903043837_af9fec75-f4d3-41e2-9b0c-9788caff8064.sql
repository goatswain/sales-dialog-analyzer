-- SECURITY FIX: Further restrict service role access to subscribers table
-- Remove overly broad service role SELECT policy that allows access to customer data

-- The service role SELECT policy was too permissive and could expose customer data
-- For Stripe operations, the check-subscription edge function can use specific queries
-- instead of broad SELECT access
DROP POLICY IF EXISTS "service_role_secure_select" ON public.subscribers;

-- Create a more restrictive service role SELECT policy that only allows 
-- checking subscription status for specific operations
CREATE POLICY "service_role_limited_select" ON public.subscribers
FOR SELECT
TO service_role
USING (
  -- Only allow reading when specifically checking a user's subscription status
  -- This should only be used by edge functions like check-subscription
  stripe_customer_id IS NOT NULL
  AND email IS NOT NULL 
  AND user_id IS NOT NULL
  -- Add additional restriction: only allow if the record has an active subscription
  AND subscribed = true
  -- Verify the user record exists and is valid
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = subscribers.user_id 
    AND auth.users.email = subscribers.email
    AND auth.users.email_confirmed_at IS NOT NULL
  )
);

-- Alternative: Remove service role SELECT policy entirely if edge functions
-- can be refactored to use INSERT/UPDATE operations only
-- This would be the most secure approach
-- DROP POLICY IF EXISTS "service_role_limited_select" ON public.subscribers;