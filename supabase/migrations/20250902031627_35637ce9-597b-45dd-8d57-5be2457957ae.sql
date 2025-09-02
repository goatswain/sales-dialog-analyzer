-- Create a SECURITY DEFINER function to bypass RLS issues
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
BEGIN
  -- Insert the group (SECURITY DEFINER bypasses RLS)
  RETURN QUERY
  INSERT INTO public.groups (name, creator_id)
  VALUES (group_name, creator_user_id)
  RETURNING groups.id, groups.name, groups.creator_id, groups.created_at, groups.updated_at;
END;
$$;