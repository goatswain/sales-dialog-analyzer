-- SECURITY FIX: Secure subscribers table - Step 2
-- Fix the RLS policies to properly secure customer data

-- 1. Drop existing policies (using correct names from schema)
DROP POLICY IF EXISTS "authenticated_users_view_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_users_update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_users_insert_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "deny_anonymous_access" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_subscription_management" ON public.subscribers;

-- Also drop any policies that might already exist with new names
DROP POLICY IF EXISTS "deny_all_anonymous_access" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_insert_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_delete_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_full_access" ON public.subscribers;

-- 2. Create secure policies with explicit role restrictions

-- Explicitly deny ALL access to anonymous users
CREATE POLICY "block_anon_users_completely" ON public.subscribers
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Only authenticated users can SELECT their own subscription data
CREATE POLICY "auth_users_select_own_data" ON public.subscribers
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Only authenticated users can INSERT their own subscription record
CREATE POLICY "auth_users_insert_own_data" ON public.subscribers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Only authenticated users can UPDATE their own subscription
CREATE POLICY "auth_users_update_own_data" ON public.subscribers
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Only authenticated users can DELETE their own subscription
CREATE POLICY "auth_users_delete_own_data" ON public.subscribers
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Service role gets full access for backend operations (Stripe, etc.)
CREATE POLICY "service_role_backend_access" ON public.subscribers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Security hardening
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Revoke any potentially existing public permissions
REVOKE ALL PRIVILEGES ON public.subscribers FROM PUBLIC;
REVOKE ALL PRIVILEGES ON public.subscribers FROM anon;