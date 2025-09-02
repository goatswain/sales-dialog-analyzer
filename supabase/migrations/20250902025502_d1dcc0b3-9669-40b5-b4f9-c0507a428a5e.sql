-- Phase 3: Fix Remaining Database Function Security Issues

-- Fix search_path for all remaining functions that don't have it set
CREATE OR REPLACE FUNCTION public.debug_auth_uid()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.test_auth_context()
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT jsonb_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'current_user', current_user,
    'session_user', session_user
  );
$function$;