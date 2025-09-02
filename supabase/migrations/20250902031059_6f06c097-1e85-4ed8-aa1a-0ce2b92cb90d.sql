-- Re-enable RLS and create working policies
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start completely fresh
DROP POLICY IF EXISTS "groups_insert_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_select_policy" ON public.groups;  
DROP POLICY IF EXISTS "groups_update_policy" ON public.groups;
DROP POLICY IF EXISTS "groups_delete_policy" ON public.groups;

-- Create simple, working policies
-- Allow authenticated users to insert groups where they are the creator
CREATE POLICY "allow_insert_own_groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

-- Allow users to view groups they are members of
CREATE POLICY "allow_select_member_groups" 
ON public.groups 
FOR SELECT 
USING (is_group_member(id, auth.uid()));

-- Allow group creators to update their groups
CREATE POLICY "allow_update_own_groups" 
ON public.groups 
FOR UPDATE 
USING (auth.uid() = creator_id);

-- Allow group creators to delete their groups  
CREATE POLICY "allow_delete_own_groups" 
ON public.groups 
FOR DELETE 
USING (auth.uid() = creator_id);