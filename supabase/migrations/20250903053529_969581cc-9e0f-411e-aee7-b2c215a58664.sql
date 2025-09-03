-- Create audit log function for profile changes
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only log if display_name or avatar_url changed
  IF OLD.display_name IS DISTINCT FROM NEW.display_name OR 
     OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    
    INSERT INTO public.audit_log (
      table_name,
      operation,
      old_data,
      new_data,
      user_id,
      timestamp
    ) VALUES (
      'profiles',
      TG_OP,
      jsonb_build_object(
        'display_name', OLD.display_name,
        'avatar_url', OLD.avatar_url
      ),
      jsonb_build_object(
        'display_name', NEW.display_name,
        'avatar_url', NEW.avatar_url
      ),
      auth.uid(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for profile changes audit
DROP TRIGGER IF EXISTS audit_profile_changes_trigger ON public.profiles;
CREATE TRIGGER audit_profile_changes_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_changes();

-- Create audit log function for group membership changes
CREATE OR REPLACE FUNCTION public.audit_group_membership_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_log (
    table_name,
    operation,
    old_data,
    new_data,
    user_id,
    timestamp
  ) VALUES (
    'group_members',
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(NEW) END,
    COALESCE(NEW.user_id, OLD.user_id),
    NOW()
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

-- Create triggers for group membership changes audit
DROP TRIGGER IF EXISTS audit_group_membership_insert_trigger ON public.group_members;
DROP TRIGGER IF EXISTS audit_group_membership_delete_trigger ON public.group_members;

CREATE TRIGGER audit_group_membership_insert_trigger
  AFTER INSERT ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_group_membership_changes();

CREATE TRIGGER audit_group_membership_delete_trigger
  AFTER DELETE ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_group_membership_changes();