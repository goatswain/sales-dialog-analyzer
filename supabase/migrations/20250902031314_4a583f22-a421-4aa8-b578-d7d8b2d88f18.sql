-- Test if auth.uid() is working in RLS context
-- Create a temporary permissive policy to test
DROP POLICY IF EXISTS "allow_insert_own_groups" ON public.groups;

-- Create a very permissive test policy to see if the issue is with auth.uid()
CREATE POLICY "test_insert_groups" 
ON public.groups 
FOR INSERT 
TO authenticated
WITH CHECK (true); -- Allow all authenticated users temporarily for testing