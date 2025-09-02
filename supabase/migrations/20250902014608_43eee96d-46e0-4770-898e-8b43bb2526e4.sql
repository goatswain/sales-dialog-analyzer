-- Let's check the current policies on groups table first
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'groups';

-- Drop and recreate the groups INSERT policy to ensure it's correct
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;

-- Create a simpler, more explicit policy for inserting groups
CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = creator_id
);

-- Let's also add some debugging to help us understand what's happening
-- Create a test function to help debug auth issues
CREATE OR REPLACE FUNCTION public.debug_auth_uid()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;