-- Complete RLS reset and rebuild
-- Disable RLS and remove all policies
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "test_insert_groups_public" ON public.groups;
DROP POLICY IF EXISTS "test_insert_groups_authenticated" ON public.groups;
DROP POLICY IF EXISTS "allow_select_member_groups" ON public.groups;
DROP POLICY IF EXISTS "allow_update_own_groups" ON public.groups;
DROP POLICY IF EXISTS "allow_delete_own_groups" ON public.groups;

-- Re-enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create one extremely simple policy
CREATE POLICY "simple_insert" 
ON public.groups 
FOR INSERT 
WITH CHECK (true);