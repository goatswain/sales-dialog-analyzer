-- SECURITY FIX: Prevent email harvesting from group_invitations table
-- Replace vulnerable email-based access with secure authenticated user access

-- Drop the current vulnerable SELECT policy
DROP POLICY IF EXISTS "Users can view their own sent or received invitations" ON public.group_invitations;

-- Create more secure policies that prevent email harvesting

-- Policy 1: Users can view invitations they sent (secure - uses auth.uid())
CREATE POLICY "users_can_view_sent_invitations" ON public.group_invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND invited_by = auth.uid()
  AND expires_at > now()  -- Only show non-expired invitations
);

-- Policy 2: Users can view invitations sent to their verified email (with restrictions)
CREATE POLICY "users_can_view_received_invitations" ON public.group_invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND email = auth.email()
  AND expires_at > now()  -- Only show non-expired invitations
  AND accepted_at IS NULL  -- Only show unaccepted invitations
  -- Additional security: ensure the user's email is verified
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email_confirmed_at IS NOT NULL
  )
);

-- Also secure the UPDATE policy to prevent token manipulation
DROP POLICY IF EXISTS "Users can update their own invitations" ON public.group_invitations;

CREATE POLICY "users_can_accept_invitations" ON public.group_invitations
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND email = auth.email()
  AND expires_at > now()
  AND accepted_at IS NULL
  -- Ensure user's email is verified before allowing updates
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email_confirmed_at IS NOT NULL
  )
)
WITH CHECK (
  -- Only allow updating the accepted_at field
  email = (SELECT gi.email FROM group_invitations gi WHERE gi.id = group_invitations.id)
  AND token = (SELECT gi.token FROM group_invitations gi WHERE gi.id = group_invitations.id)
  AND group_id = (SELECT gi.group_id FROM group_invitations gi WHERE gi.id = group_invitations.id)
  AND invited_by = (SELECT gi.invited_by FROM group_invitations gi WHERE gi.id = group_invitations.id)
);

-- Secure the INSERT policy to use authenticated role instead of public
DROP POLICY IF EXISTS "Group members can create invitations" ON public.group_invitations;

CREATE POLICY "authenticated_group_members_can_invite" ON public.group_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND invited_by = auth.uid()
  AND is_group_member(group_id, auth.uid())
  -- Add email validation
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND length(email) > 0
  AND length(email) < 255
  -- Ensure expiration is reasonable (max 30 days)
  AND expires_at <= (now() + interval '30 days')
  AND expires_at > now()
);

-- Add a restrictive policy to block anonymous access completely
CREATE POLICY "block_anonymous_invitation_access" ON public.group_invitations
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);