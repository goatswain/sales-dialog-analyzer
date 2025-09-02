-- Phase 2: Fix Database Function Security Issues

-- 1. Fix function search path issues for remaining functions
CREATE OR REPLACE FUNCTION public.is_group_member(group_id uuid, user_id uuid)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = is_group_member.group_id
    AND group_members.user_id = is_group_member.user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_group_creator(group_id uuid, user_id uuid)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = is_group_creator.group_id
    AND group_members.user_id = is_group_creator.user_id
    AND group_members.role = 'creator'
  );
$function$;