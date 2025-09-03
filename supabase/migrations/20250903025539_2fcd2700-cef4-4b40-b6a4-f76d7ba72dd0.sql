-- SECURITY FIX: Secure subscribers table with proper RLS policies
-- The current policies may have conflicts or allow unintended access to sensitive customer data

-- 1. Drop all existing policies to recreate with proper security
DROP POLICY IF EXISTS "authenticated_users_view_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_users_update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_users_insert_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "deny_anonymous_access" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_subscription_management" ON public.subscribers;

-- 2. Create explicit policy to DENY ALL access to anonymous users
CREATE POLICY "deny_all_anonymous_access" ON public.subscribers
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 3. Create secure SELECT policy: Only authenticated users can view their own subscription
CREATE POLICY "authenticated_select_own_subscription" ON public.subscribers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 4. Create secure INSERT policy: Only authenticated users can create their own subscription record
CREATE POLICY "authenticated_insert_own_subscription" ON public.subscribers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 5. Create secure UPDATE policy: Only authenticated users can update their own subscription
CREATE POLICY "authenticated_update_own_subscription" ON public.subscribers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 6. Create secure DELETE policy: Only authenticated users can delete their own subscription
CREATE POLICY "authenticated_delete_own_subscription" ON public.subscribers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 7. Allow service role full access for backend operations (Stripe webhooks, etc.)
CREATE POLICY "service_role_full_access" ON public.subscribers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 8. Ensure RLS is enabled
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- 9. Revoke any public permissions that might exist
REVOKE ALL ON public.subscribers FROM PUBLIC;
REVOKE ALL ON public.subscribers FROM anon;