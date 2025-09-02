-- Add SELECT policy to groups table so users can see groups they belong to
CREATE POLICY "Users can view groups they belong to" 
ON public.groups 
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
  )
);