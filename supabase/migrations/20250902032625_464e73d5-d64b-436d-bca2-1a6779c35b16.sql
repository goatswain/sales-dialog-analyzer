-- Drop the overly broad policy and create specific ones
DROP POLICY IF EXISTS "allow_all_group_member_operations" ON public.group_members;

-- Create proper SELECT policy for group members
CREATE POLICY "Users can view group memberships"
ON public.group_members
FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.group_members gm2 
  WHERE gm2.group_id = group_members.group_id 
  AND gm2.user_id = auth.uid()
));

-- Create INSERT policy for group members
CREATE POLICY "Users can create group memberships"
ON public.group_members
FOR INSERT
WITH CHECK (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.group_members gm2 
  WHERE gm2.group_id = group_members.group_id 
  AND gm2.user_id = auth.uid() 
  AND gm2.role = 'creator'
));

-- Create UPDATE policy for group members
CREATE POLICY "Users can update group memberships"
ON public.group_members
FOR UPDATE
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.group_members gm2 
  WHERE gm2.group_id = group_members.group_id 
  AND gm2.user_id = auth.uid() 
  AND gm2.role = 'creator'
));

-- Create DELETE policy for group members  
CREATE POLICY "Users can delete group memberships"
ON public.group_members
FOR DELETE
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.group_members gm2 
  WHERE gm2.group_id = group_members.group_id 
  AND gm2.user_id = auth.uid() 
  AND gm2.role = 'creator'
));