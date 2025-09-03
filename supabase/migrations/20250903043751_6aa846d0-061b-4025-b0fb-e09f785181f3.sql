-- SECURITY FIX: Fix subscribers table RLS policies to allow proper authenticated user access
-- The issue is that restrictive policies are preventing legitimate user access

-- Drop the overly restrictive default_deny_all_access policy that blocks legitimate users
DROP POLICY IF EXISTS "default_deny_all_access" ON public.subscribers;

-- Ensure the authenticated users policy is properly configured
DROP POLICY IF EXISTS "authenticated_users_own_data_only" ON public.subscribers;

-- Create a clear policy for authenticated users to access their own data
CREATE POLICY "authenticated_users_view_own_subscription" ON public.subscribers
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "authenticated_users_update_own_subscription" ON public.subscribers  
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  -- Prevent users from modifying core identity fields
  AND user_id = (SELECT s.user_id FROM subscribers s WHERE s.id = subscribers.id)
  AND email = (SELECT s.email FROM subscribers s WHERE s.id = subscribers.id)
);

-- Allow users to insert their own subscription records (for initial setup)
CREATE POLICY "authenticated_users_create_own_subscription" ON public.subscribers
FOR INSERT
TO authenticated  
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  -- Validate email format
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND length(email) > 0
  AND length(email) < 255
  -- Ensure email matches the authenticated user's email
  AND email = auth.email()
);

-- Keep the anonymous blocking policy but make it less restrictive for legitimate access
-- Only block anonymous users, not all public access
DROP POLICY IF EXISTS "block_anonymous_completely" ON public.subscribers;

CREATE POLICY "block_anonymous_access_only" ON public.subscribers
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);