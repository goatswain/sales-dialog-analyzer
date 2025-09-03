-- SECURITY FIX: Consolidate subscribers table RLS policies
-- The current 12 overlapping policies create complexity that could lead to security gaps
-- Replace with simple, bulletproof policies

-- Step 1: Drop all existing policies to start clean
DROP POLICY IF EXISTS "allow_only_authenticated_users" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_users_create_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_users_delete_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_users_update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "authenticated_users_view_own_subscription_secure" ON public.subscribers;
DROP POLICY IF EXISTS "deny_all_anonymous_access" ON public.subscribers;
DROP POLICY IF EXISTS "prevent_cross_user_subscriber_access" ON public.subscribers;
DROP POLICY IF EXISTS "restrictive_authenticated_only" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_minimal_select" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_secure_insert" ON public.subscribers;
DROP POLICY IF EXISTS "service_role_secure_update" ON public.subscribers;
DROP POLICY IF EXISTS "ultimate_user_isolation" ON public.subscribers;

-- Step 2: Create bulletproof anonymous denial policy
CREATE POLICY "deny_anonymous_access" ON public.subscribers
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Step 3: Create simple authenticated user policy for own data only
CREATE POLICY "users_own_data_only" ON public.subscribers
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 4: Allow service role for edge functions (bypass RLS)
CREATE POLICY "service_role_access" ON public.subscribers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 5: Add audit trigger to monitor any service role changes
CREATE TRIGGER audit_subscriber_changes
AFTER INSERT OR UPDATE OR DELETE ON public.subscribers
FOR EACH ROW EXECUTE FUNCTION public.audit_subscriber_access();