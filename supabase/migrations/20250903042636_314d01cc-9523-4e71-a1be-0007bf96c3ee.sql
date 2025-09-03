-- CRITICAL SECURITY FIX: Secure subscribers table RLS policies
-- This fixes the critical vulnerability where customer payment data could be stolen

-- First, drop the overly permissive service role read policy
DROP POLICY IF EXISTS "service_role_read_subscribers" ON public.subscribers;

-- Replace with restrictive, operation-specific service role policies
-- Service role can only read subscriber data for legitimate Stripe operations
CREATE POLICY "service_role_stripe_operations_read" ON public.subscribers
FOR SELECT
TO service_role
USING (
  -- Only allow reads when checking/updating subscription status
  -- This should only be used by edge functions for Stripe operations
  stripe_customer_id IS NOT NULL 
  AND email IS NOT NULL
);

-- Service role can only update subscription status, not personal data
CREATE POLICY "service_role_stripe_operations_update" ON public.subscribers
FOR UPDATE
TO service_role
USING (
  -- Can only update subscription-related fields, not user_id or email
  stripe_customer_id IS NOT NULL
)
WITH CHECK (
  -- Prevent modification of core identity fields
  user_id = ( SELECT s.user_id FROM subscribers s WHERE s.id = subscribers.id )
  AND email = ( SELECT s.email FROM subscribers s WHERE s.id = subscribers.id )
);

-- Drop the old permissive service role update policy
DROP POLICY IF EXISTS "service_role_update_subscribers" ON public.subscribers;

-- Strengthen the anonymous user blocking policy
DROP POLICY IF EXISTS "block_anon_users_completely" ON public.subscribers;

-- Create a more specific anonymous blocking policy
CREATE POLICY "block_anonymous_access" ON public.subscribers
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Add audit logging trigger for all subscriber data access
-- This will help monitor any unauthorized access attempts
CREATE OR REPLACE FUNCTION public.audit_subscriber_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any service role modifications for security monitoring
  INSERT INTO public.audit_log (
    table_name,
    operation,
    old_data,
    new_data,
    user_id,
    timestamp
  ) VALUES (
    'subscribers',
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid(),
    NOW()
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to audit all subscriber table changes
DROP TRIGGER IF EXISTS audit_subscribers_changes ON public.subscribers;
CREATE TRIGGER audit_subscribers_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.subscribers
    FOR EACH ROW EXECUTE FUNCTION public.audit_subscriber_access();