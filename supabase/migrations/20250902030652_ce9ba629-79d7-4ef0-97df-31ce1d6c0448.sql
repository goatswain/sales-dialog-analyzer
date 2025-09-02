-- Clean up duplicate/conflicting RLS policies on groups table

-- Drop ALL existing INSERT policies on groups table
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "create_groups_temp" ON public.groups;

-- Create one clear, working INSERT policy
CREATE POLICY "authenticated_users_can_create_groups" 
ON public.groups 
FOR INSERT 
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- Also verify the SELECT policies are correct and not conflicting
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "view_member_groups" ON public.groups;

-- Create one clear SELECT policy
CREATE POLICY "users_can_view_member_groups" 
ON public.groups 
FOR SELECT 
TO authenticated
USING (is_group_member(id, auth.uid()));