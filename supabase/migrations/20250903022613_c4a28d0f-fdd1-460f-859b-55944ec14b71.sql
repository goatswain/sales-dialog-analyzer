-- SECURITY FIX: Secure profiles table and add group member access
-- The current policies might allow anonymous access and lack proper role restrictions

-- 1. Drop existing policies to recreate with proper security
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- 2. Create secure SELECT policy: Users can view their own profile + group members can see each other
CREATE POLICY "authenticated_users_view_profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- User can always view their own profile
  (auth.uid() = user_id AND auth.uid() IS NOT NULL)
  OR
  -- OR user can view profiles of other group members
  (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() 
      AND gm2.user_id = profiles.user_id
    )
  )
);

-- 3. Create secure INSERT policy: Only authenticated users can create their own profile
CREATE POLICY "authenticated_users_create_own_profile" ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 4. Create secure UPDATE policy: Only users can update their own profile
CREATE POLICY "authenticated_users_update_own_profile" ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 5. Create secure DELETE policy: Only users can delete their own profile
CREATE POLICY "authenticated_users_delete_own_profile" ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 6. Explicitly deny all access to anonymous users
CREATE POLICY "deny_anonymous_profile_access" ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 7. Allow service role full access for administrative functions
CREATE POLICY "service_role_profile_management" ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 8. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;