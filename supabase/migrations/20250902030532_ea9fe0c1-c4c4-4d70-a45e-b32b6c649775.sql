-- Fix Groups Table RLS Policy Issue

-- The issue is that the INSERT policy expects auth.uid() = creator_id
-- but we need to allow setting creator_id to auth.uid() during insertion

-- Drop the current restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;

-- Create a proper INSERT policy that allows users to create groups with themselves as creator
CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND creator_id = auth.uid());