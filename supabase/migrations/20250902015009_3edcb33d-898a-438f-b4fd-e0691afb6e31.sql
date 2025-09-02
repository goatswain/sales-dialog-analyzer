-- Drop ALL existing policies on group_members
DROP POLICY IF EXISTS "Users can view group members for groups they belong to" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Users can insert themselves as creators" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can manage other members" ON public.group_members;

-- Create new policies with different names
CREATE POLICY "view_group_members" 
ON public.group_members 
FOR SELECT 
USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "insert_creator_membership" 
ON public.group_members 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND 
  role = 'creator' AND 
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id AND creator_id = auth.uid()
  )
);

CREATE POLICY "manage_other_members" 
ON public.group_members 
FOR ALL 
USING (is_group_creator(group_id, auth.uid()) AND user_id != auth.uid());

-- Re-enable RLS on groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Drop existing groups policies
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;

-- Create new groups policies
CREATE POLICY "view_member_groups" 
ON public.groups 
FOR SELECT 
USING (is_group_member(id, auth.uid()));

CREATE POLICY "update_own_groups" 
ON public.groups 
FOR UPDATE 
USING (is_group_creator(id, auth.uid()));

CREATE POLICY "create_groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);