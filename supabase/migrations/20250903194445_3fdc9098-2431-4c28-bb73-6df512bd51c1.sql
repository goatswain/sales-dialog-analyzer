-- Fix the create_group_safe function to avoid field reference issues
CREATE OR REPLACE FUNCTION public.create_group_safe(group_name text, creator_user_id uuid)
 RETURNS TABLE(id uuid, name text, creator_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_group_id UUID;
  new_group_record RECORD;
BEGIN
  -- Insert the group
  INSERT INTO public.groups (name, creator_id)
  VALUES (group_name, creator_user_id)
  RETURNING * INTO new_group_record;
  
  new_group_id := new_group_record.id;
  
  -- Add creator as member
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (new_group_id, creator_user_id, 'creator');
  
  -- Return the group data using explicit column selection
  RETURN QUERY
  SELECT new_group_record.id, new_group_record.name, new_group_record.creator_id, 
         new_group_record.created_at, new_group_record.updated_at;
END;
$function$;