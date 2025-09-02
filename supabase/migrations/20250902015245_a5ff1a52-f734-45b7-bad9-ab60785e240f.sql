-- Temporarily replace the groups INSERT policy with a more permissive one for testing
DROP POLICY IF EXISTS "create_groups" ON public.groups;

-- Allow any authenticated user to create groups for now
CREATE POLICY "create_groups_temp" 
ON public.groups 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);