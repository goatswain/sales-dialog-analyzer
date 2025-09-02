-- Drop the problematic SELECT policy and recreate it properly
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;

-- Create a simpler, more reliable SELECT policy
CREATE POLICY "Users can view their groups"
ON public.groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.group_members gm
    WHERE gm.group_id = groups.id 
    AND gm.user_id = auth.uid()
  )
);