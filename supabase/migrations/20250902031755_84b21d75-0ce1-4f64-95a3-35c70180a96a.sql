-- Fix group_members RLS and extend the create_group_safe function
-- Check and fix group_members policies first
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create simple policy for group_members
CREATE POLICY IF NOT EXISTS "allow_group_member_operations" 
ON public.group_members 
FOR ALL
WITH CHECK (true);

-- Update the create_group_safe function to also add the member
CREATE OR REPLACE FUNCTION public.create_group_safe(
  group_name TEXT,
  creator_user_id UUID
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  creator_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_group_id UUID;
BEGIN
  -- Insert the group
  INSERT INTO public.groups (name, creator_id)
  VALUES (group_name, creator_user_id)
  RETURNING groups.id INTO new_group_id;
  
  -- Add creator as member
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (new_group_id, creator_user_id, 'creator');
  
  -- Return the group data
  RETURN QUERY
  SELECT g.id, g.name, g.creator_id, g.created_at, g.updated_at
  FROM public.groups g
  WHERE g.id = new_group_id;
END;
$$;