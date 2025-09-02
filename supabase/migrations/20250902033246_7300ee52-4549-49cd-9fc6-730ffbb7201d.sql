-- Fix security issue: Restrict group_invitations SELECT policy to prevent email harvesting
-- Remove overly permissive policy that allows all group members to see invitations
DROP POLICY IF EXISTS "Users can view invitations for groups they created or are invit" ON public.group_invitations;

-- Create restrictive policy that only allows:
-- 1. The person who sent the invitation (invited_by = auth.uid())  
-- 2. The person who was invited (email = auth.email())
-- This prevents other group members from harvesting email addresses
CREATE POLICY "Users can view their own sent or received invitations"
ON public.group_invitations
FOR SELECT
USING (
  (invited_by = auth.uid()) OR (email = auth.email())
);