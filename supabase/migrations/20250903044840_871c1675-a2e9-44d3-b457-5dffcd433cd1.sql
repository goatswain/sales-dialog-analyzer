-- CRITICAL SECURITY FIX: Completely eliminate anonymous access vulnerability
-- The scanner detected that the current RESTRICTIVE policy may have edge cases

-- Step 1: Drop existing anonymous blocking policy to recreate it more robustly
DROP POLICY IF EXISTS "block_anonymous_access_only" ON public.subscribers;

-- Step 2: Create an explicit DENY ALL policy for anonymous users
-- This is more explicit than relying on RESTRICTIVE policies alone
CREATE POLICY "deny_all_anonymous_access" ON public.subscribers
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Step 3: Create an additional RESTRICTIVE policy as a failsafe
CREATE POLICY "restrictive_authenticated_only" ON public.subscribers
AS RESTRICTIVE
FOR ALL
TO anon, public
USING (false)
WITH CHECK (false);

-- Step 4: Ensure there's an explicit policy that ONLY allows authenticated access
CREATE POLICY "allow_only_authenticated_users" ON public.subscribers
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Step 5: Add additional security validation to prevent any potential bypasses
-- This ensures even if someone finds an edge case, they still can't access other users' data
CREATE POLICY "ultimate_user_isolation" ON public.subscribers
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  -- Triple verification: user must be authenticated AND own the record
  auth.uid() IS NOT NULL 
  AND user_id IS NOT NULL
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id IS NOT NULL
  AND auth.uid() = user_id
);