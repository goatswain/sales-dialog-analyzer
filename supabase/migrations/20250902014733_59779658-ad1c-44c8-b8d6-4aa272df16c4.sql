-- Let's test what auth.uid() is actually returning
-- Create a simple test function
CREATE OR REPLACE FUNCTION public.test_auth_context()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'current_user', current_user,
    'session_user', session_user
  );
$$;

-- Temporarily disable RLS on groups to test insertion
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;