-- Drop all policies on group_members and create simpler ones
DROP POLICY IF EXISTS "Users can view group memberships" ON public.group_members;
DROP POLICY IF EXISTS "Users can create group memberships" ON public.group_members;  
DROP POLICY IF EXISTS "Users can update group memberships" ON public.group_members;
DROP POLICY IF EXISTS "Users can delete group memberships" ON public.group_members;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own memberships"
ON public.group_members  
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert memberships"
ON public.group_members
FOR INSERT  
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their memberships"  
ON public.group_members
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their memberships"
ON public.group_members
FOR DELETE
USING (user_id = auth.uid());