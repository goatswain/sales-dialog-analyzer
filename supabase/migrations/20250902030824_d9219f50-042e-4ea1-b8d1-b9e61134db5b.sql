-- Completely reset and rebuild groups table RLS policies

-- First, disable RLS temporarily to clear everything
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "authenticated_users_can_create_groups" ON public.groups;
DROP POLICY IF EXISTS "users_can_view_member_groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
DROP POLICY IF EXISTS "update_own_groups" ON public.groups;

-- Re-enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create fresh, simple policies
CREATE POLICY "groups_insert_policy" 
ON public.groups 
FOR INSERT 
TO authenticated
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "groups_select_policy" 
ON public.groups 
FOR SELECT 
TO authenticated
USING (is_group_member(id, auth.uid()));

CREATE POLICY "groups_update_policy" 
ON public.groups 
FOR UPDATE 
TO authenticated
USING (is_group_creator(id, auth.uid()));

CREATE POLICY "groups_delete_policy" 
ON public.groups 
FOR DELETE 
TO authenticated
USING (is_group_creator(id, auth.uid()));