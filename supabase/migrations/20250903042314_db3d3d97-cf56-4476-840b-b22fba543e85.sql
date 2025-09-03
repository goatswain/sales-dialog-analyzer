-- FIX: Secure the audit log table access
-- Only allow admins to view audit logs, not regular users

-- Add RLS policy to prevent regular users from accessing audit logs
CREATE POLICY "only_admins_view_audit_logs" ON public.audit_log
FOR SELECT
TO authenticated
USING (false); -- Block all authenticated users from reading audit logs

-- Create a function for admin access (if needed in the future)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- This can be extended later to check admin status
  -- For now, only service role can access audit logs
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;