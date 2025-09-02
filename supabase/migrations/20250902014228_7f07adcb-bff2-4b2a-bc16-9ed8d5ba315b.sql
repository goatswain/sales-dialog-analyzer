-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view group members for groups they belong to" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can manage members" ON public.group_members;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.is_group_member(group_id UUID, user_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = is_group_member.group_id
    AND group_members.user_id = is_group_member.user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_creator(group_id UUID, user_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = is_group_creator.group_id
    AND group_members.user_id = is_group_creator.user_id
    AND group_members.role = 'creator'
  );
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Users can view group members for groups they belong to" 
ON public.group_members 
FOR SELECT 
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Group creators can manage members" 
ON public.group_members 
FOR ALL 
USING (public.is_group_creator(group_id, auth.uid()));

-- Also fix similar issues in other policies
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Group members can create invitations" ON public.group_invitations;
DROP POLICY IF EXISTS "Users can view messages for groups they belong to" ON public.group_messages;
DROP POLICY IF EXISTS "Group members can create messages" ON public.group_messages;

-- Recreate group policies
CREATE POLICY "Users can view groups they are members of" 
ON public.groups 
FOR SELECT 
USING (public.is_group_member(id, auth.uid()));

CREATE POLICY "Group creators can update their groups" 
ON public.groups 
FOR UPDATE 
USING (public.is_group_creator(id, auth.uid()));

-- Recreate invitation policies
CREATE POLICY "Group members can create invitations" 
ON public.group_invitations 
FOR INSERT 
WITH CHECK (public.is_group_member(group_id, auth.uid()) AND invited_by = auth.uid());

-- Recreate message policies
CREATE POLICY "Users can view messages for groups they belong to" 
ON public.group_messages 
FOR SELECT 
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Group members can create messages" 
ON public.group_messages 
FOR INSERT 
WITH CHECK (public.is_group_member(group_id, auth.uid()) AND user_id = auth.uid());