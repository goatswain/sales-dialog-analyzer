-- Fix RLS policy on group_members to allow creators to add themselves
-- Drop the existing policies
DROP POLICY IF EXISTS "Users can view group members for groups they belong to" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can manage members" ON public.group_members;

-- Create new policies that allow creators to add themselves initially
CREATE POLICY "Users can view group members for groups they belong to" 
ON public.group_members 
FOR SELECT 
USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "Users can insert themselves as creators" 
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

CREATE POLICY "Group creators can manage other members" 
ON public.group_members 
FOR ALL 
USING (is_group_creator(group_id, auth.uid()) AND user_id != auth.uid());

-- Re-enable RLS on groups with a proper policy
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);