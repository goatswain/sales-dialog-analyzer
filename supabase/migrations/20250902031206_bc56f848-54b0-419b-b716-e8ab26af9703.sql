-- Fix the role targeting issue in RLS policies
DROP POLICY IF EXISTS "allow_insert_own_groups" ON public.groups;
DROP POLICY IF EXISTS "allow_select_member_groups" ON public.groups;
DROP POLICY IF EXISTS "allow_update_own_groups" ON public.groups;
DROP POLICY IF EXISTS "allow_delete_own_groups" ON public.groups;

-- Create policies that explicitly target the authenticated role
CREATE POLICY "allow_insert_own_groups" 
ON public.groups 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "allow_select_member_groups" 
ON public.groups 
FOR SELECT 
TO authenticated
USING (is_group_member(id, auth.uid()));

CREATE POLICY "allow_update_own_groups" 
ON public.groups 
FOR UPDATE 
TO authenticated
USING (auth.uid() = creator_id);

CREATE POLICY "allow_delete_own_groups" 
ON public.groups 
FOR DELETE 
TO authenticated
USING (auth.uid() = creator_id);