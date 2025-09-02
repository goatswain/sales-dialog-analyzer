-- The user might be coming in as 'public' role instead of 'authenticated'
-- Let's create policies for both roles to test
DROP POLICY IF EXISTS "test_insert_groups" ON public.groups;

-- Create policies for all possible roles
CREATE POLICY "test_insert_groups_public" 
ON public.groups 
FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "test_insert_groups_authenticated" 
ON public.groups 
FOR INSERT 
TO authenticated
WITH CHECK (true);