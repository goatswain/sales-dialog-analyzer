-- Phase 1: Critical Database Security Fixes (Updated)

-- 1. Enable RLS on groups table (if not already enabled)
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;

-- 3. Create proper RLS policies for groups table
CREATE POLICY "Users can view groups they are members of" 
ON public.groups 
FOR SELECT 
USING (is_group_member(id, auth.uid()));

CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Group creators can update their groups" 
ON public.groups 
FOR UPDATE 
USING (auth.uid() = creator_id);

-- 4. Fix orphaned recordings by deleting them (they have no owner)
DELETE FROM public.recordings WHERE user_id IS NULL;

-- 5. Make user_id NOT NULL for recordings table to prevent future orphaned records
ALTER TABLE public.recordings ALTER COLUMN user_id SET NOT NULL;