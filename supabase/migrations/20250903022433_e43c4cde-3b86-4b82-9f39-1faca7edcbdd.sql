-- CRITICAL SECURITY FIX: Prevent public access to subscribers table
-- The issue is that RLS policies without role restrictions can allow anonymous access

-- 1. Drop the overly permissive service role policy
DROP POLICY IF EXISTS "service_role_full_access" ON public.subscribers;

-- 2. Recreate all policies with proper role restrictions to authenticated users only
DROP POLICY IF EXISTS "users_can_view_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "users_can_update_own_subscription" ON public.subscribers; 
DROP POLICY IF EXISTS "users_can_insert_own_subscription" ON public.subscribers;

-- 3. Create secure policies that ONLY allow authenticated users
CREATE POLICY "authenticated_users_view_own_subscription" ON public.subscribers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_users_update_own_subscription" ON public.subscribers
FOR UPDATE  
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_users_insert_own_subscription" ON public.subscribers
FOR INSERT
TO authenticated  
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 4. Explicitly deny all access to anonymous users (extra security layer)
CREATE POLICY "deny_anonymous_access" ON public.subscribers
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 5. Create a restricted service role policy for edge functions only
-- This policy only applies when using service_role, not to public API access
CREATE POLICY "service_role_subscription_management" ON public.subscribers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Verify RLS is enabled (should already be enabled, but making sure)
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;