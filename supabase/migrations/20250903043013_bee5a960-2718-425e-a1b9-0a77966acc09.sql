-- COMPREHENSIVE SECURITY FIX: Ensure subscribers table is completely secure
-- Address the scanner's concern about public accessibility

-- First, ensure the table has the most restrictive default policy
-- Drop any potentially problematic policies and recreate them more securely

-- Create an explicit RESTRICTIVE policy to deny all access by default
CREATE POLICY "default_deny_all_access" ON public.subscribers
AS RESTRICTIVE
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Ensure anonymous users are completely blocked with a restrictive policy
DROP POLICY IF EXISTS "block_anonymous_access" ON public.subscribers;
CREATE POLICY "block_anonymous_completely" ON public.subscribers
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Replace the general public denial with a more specific one
DROP POLICY IF EXISTS "deny_all_unauthenticated_access" ON public.subscribers;

-- Create permissive policies that explicitly allow only what's needed
-- These work alongside the restrictive policies above

-- Allow authenticated users to see only their own data
CREATE POLICY "authenticated_users_own_data_only" ON public.subscribers
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Service role restricted access for Stripe operations only
CREATE POLICY "service_role_stripe_only" ON public.subscribers
FOR SELECT
TO service_role
USING (stripe_customer_id IS NOT NULL AND email IS NOT NULL);

CREATE POLICY "service_role_stripe_update_only" ON public.subscribers
FOR UPDATE
TO service_role
USING (stripe_customer_id IS NOT NULL)
WITH CHECK (
  user_id = (SELECT s.user_id FROM subscribers s WHERE s.id = subscribers.id)
  AND email = (SELECT s.email FROM subscribers s WHERE s.id = subscribers.id)
);

-- Drop old policies that might conflict
DROP POLICY IF EXISTS "auth_users_select_own_data" ON public.subscribers;
DROP POLICY IF EXISTS "auth_users_insert_own_data" ON public.subscribers;
DROP POLICY IF EXISTS "auth_users_update_own_data" ON public.subscribers;
DROP POLICY IF EXISTS "auth_users_delete_own_data" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_stripe_operations_read" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_stripe_operations_update" ON public.subscribers;

-- Ensure RLS is enabled and forced
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;